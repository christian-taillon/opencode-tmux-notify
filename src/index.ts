import { appendFileSync } from "node:fs"
import { basename } from "node:path"
import { hostname } from "node:os"
import type { Plugin } from "@opencode-ai/plugin"
import { loadConfig, type NotifyConfig, type Protocol } from "./config.js"
import { eventSessionIds, idleKey, isTopLevelSession, shouldNotify, type EventLike } from "./events.js"
import { osc777 } from "./osc777.js"
import { osc9 } from "./osc9.js"
import { osc99 } from "./osc99.js"
import { sanitize, shortHostname } from "./sanitize.js"
import { createTmuxHelpers, type Command, type PaneLocation } from "./tmux.js"

const notificationTitles: Record<string, string> = {
  "permission.asked": "OpenCode: Approval required",
  "question.asked": "OpenCode: Answer required",
  "session.idle": "OpenCode: Task complete",
  "session.error": "OpenCode: Session error",
}

const IDLE_DEDUPLICATION_WINDOW_MS = 1_000

function detectProtocol(environment: NodeJS.ProcessEnv, terminal = ""): Exclude<Protocol, "auto"> {
  const values = [terminal, environment.TERM_PROGRAM, environment.LC_TERMINAL, environment.TERM]
    .filter(Boolean)
    .map((value) => value!.toLowerCase())

  if (values.some((value) => value.includes("kitty"))) return "osc99"
  if (values.some((value) => value.includes("iterm"))) return "osc9"
  return "osc777"
}

function notificationOutput(
  protocol: Exclude<Protocol, "auto">,
  title: string,
  body: string,
  id: string,
): string {
  if (protocol === "osc99") return osc99(title, body, id)
  if (protocol === "osc9") return osc9(title, body)
  return osc777(title, body)
}

export interface NotifyOptions {
  config?: NotifyConfig
  command?: Command
  appendFile?: (path: string, data: string) => void
  tty?: string
  environment?: NodeJS.ProcessEnv
  host?: string
  now?: () => number
}

function notificationBody(
  directory: string,
  location: PaneLocation | undefined,
  host: string,
): string {
  const project = basename(directory) || directory
  const fields = [shortHostname(host), project]
  if (location) fields.push(location.session, location.window, location.pane, location.windowName)
  return sanitize(fields.join(" • "))
}

async function hasParentSession(event: EventLike, client: unknown): Promise<boolean> {
  const sessionId = eventSessionIds(event)[0]
  if (!sessionId || !client || typeof client !== "object") return false
  const sessionApi = (client as {
    session?: { get?: (options: { path: { id: string } }) => Promise<unknown> }
  }).session
  if (!sessionApi?.get) return false

  try {
    const response = await sessionApi.get({ path: { id: sessionId } })
    const session = response && typeof response === "object" && "data" in response
      ? (response as { data?: unknown }).data
      : response
    return Boolean(
      session && typeof session === "object" &&
      typeof (session as { parentID?: unknown }).parentID === "string",
    )
  } catch {
    return false
  }
}

export function createPlugin(options: NotifyOptions = {}): Plugin {
  const environment = options.environment ?? process.env
  const startupPane = environment.TMUX_PANE
  const append = options.appendFile ?? appendFileSync
  const tty = options.tty ?? "/dev/tty"
  const config = options.config ?? loadConfig()
  const tmux = createTmuxHelpers(options.command)
  const seenIdle = new Map<string, number>()
  const now = options.now ?? Date.now
  let notificationSequence = 0

  return async ({ directory, client }) => ({
    event: async ({ event }) => {
      const candidate = event as unknown as EventLike
      if (!shouldNotify(candidate, config.events, true)) return
      if (!config.notifyChildSessions &&
          (!isTopLevelSession(candidate) || await hasParentSession(candidate, client))) return
      const key = idleKey(candidate)
      if (candidate.type === "session.idle") {
        const timestamp = now()
        const previous = seenIdle.get(key)
        if (previous !== undefined && timestamp >= previous &&
            timestamp - previous < IDLE_DEDUPLICATION_WINDOW_MS) return

        for (const [idleKey, idleTimestamp] of seenIdle) {
          if (timestamp >= idleTimestamp &&
              timestamp - idleTimestamp >= IDLE_DEDUPLICATION_WINDOW_MS) {
            seenIdle.delete(idleKey)
          }
        }
        seenIdle.set(key, timestamp)
      }

      const location = startupPane ? await tmux.resolvePane(startupPane) : undefined
      if (startupPane && config.rememberLastTarget) await tmux.rememberPane(startupPane)
      const title = notificationTitles[String(candidate.type)]
      const body = notificationBody(directory, location, options.host ?? hostname())
      const id = `opencode-${now()}-${notificationSequence++}`

      if (!startupPane) {
        try {
          const protocol = config.protocol === "auto"
            ? detectProtocol(environment)
            : config.protocol
          const output = notificationOutput(protocol, title, body, id)
          append(tty, output)
        } catch {
          // /dev/tty is not always available in daemonized or test environments.
        }
        return
      }

      if (!location) return
      for (const client of await tmux.clientTargets(location.session, config.notifyAllClients)) {
        try {
          const protocol = config.protocol === "auto"
            ? detectProtocol(environment, client.termType || client.termName)
            : config.protocol
          const output = notificationOutput(protocol, title, body, id)
          append(client.tty, output)
        } catch {
          // A client can detach between list-clients and appendFile.
        }
      }
    },
  })
}

export const TmuxNotify: Plugin = createPlugin()
export default TmuxNotify
