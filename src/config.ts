import { homedir } from "node:os"
import { join } from "node:path"
import { readFileSync } from "node:fs"

export const NOTIFICATION_EVENTS = [
  "permission.asked",
  "question.asked",
  "session.error",
  "session.idle",
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]
export type Protocol = "auto" | "osc777" | "osc99" | "osc9"

export interface NotifyConfig {
  events: Set<NotificationEvent>
  notifyChildSessions: boolean
  notifyAllClients: boolean
  rememberLastTarget: boolean
  protocol: Protocol
}

export const defaultConfig: NotifyConfig = {
  events: new Set(NOTIFICATION_EVENTS),
  notifyChildSessions: false,
  notifyAllClients: true,
  rememberLastTarget: true,
  protocol: "auto",
}

type ConfigInput = {
  events?: unknown
  notifyChildSessions?: unknown
  notifyAllClients?: unknown
  rememberLastTarget?: unknown
  protocol?: unknown
}

export function normalizeConfig(input: unknown): NotifyConfig {
  const value = input && typeof input === "object" ? input as ConfigInput : {}
  const events = new Set<NotificationEvent>(NOTIFICATION_EVENTS)
  if (Array.isArray(value.events)) {
    events.clear()
    for (const event of value.events) {
      if (typeof event === "string" && NOTIFICATION_EVENTS.includes(event as NotificationEvent)) {
        events.add(event as NotificationEvent)
      }
    }
  } else if (value.events && typeof value.events === "object") {
    for (const event of NOTIFICATION_EVENTS) {
      const enabled = (value.events as Record<string, unknown>)[event]
      if (enabled === true) events.add(event)
      if (enabled === false) events.delete(event)
    }
  }
  const protocol: Protocol = value.protocol === "osc99" || value.protocol === "osc9" ||
    value.protocol === "osc777" || value.protocol === "auto"
    ? value.protocol
    : "auto"

  return {
    events,
    notifyChildSessions: value.notifyChildSessions === true,
    notifyAllClients: value.notifyAllClients !== false,
    rememberLastTarget: value.rememberLastTarget !== false,
    protocol,
  }
}

export function loadConfig(
  readFile: (path: string) => string = (path) => readFileSync(path, "utf8"),
  home = homedir(),
): NotifyConfig {
  const path = join(home, ".config", "opencode", "opencode-tmux-notify.json")
  try {
    return normalizeConfig(JSON.parse(readFile(path)))
  } catch {
    return normalizeConfig(undefined)
  }
}
