import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execTmux = promisify(execFile)

export interface PaneLocation {
  session: string
  window: string
  pane: string
  windowName: string
}

export type Command = (command: string, args: string[]) => Promise<string>

export function defaultCommand(command: string, args: string[]): Promise<string> {
  return execTmux(command, args, { encoding: "utf8" }).then(({ stdout }) => stdout)
}

export function createTmuxHelpers(command: Command = defaultCommand) {
  return {
    async resolvePane(pane: string): Promise<PaneLocation | undefined> {
      try {
        const output = await command("tmux", [
          "display-message",
          "-p",
          "-t",
          pane,
          "#{session_name}\t#{window_index}\t#{pane_index}\t#{window_name}",
        ])
        const [session, window, paneIndex, windowName] = output.trimEnd().split("\n")[0]?.split("\t") ?? []
        if (!session || !window || !paneIndex) return undefined
        return { session, window, pane: paneIndex, windowName: windowName ?? "" }
      } catch {
        return undefined
      }
    },

    async rememberPane(pane: string): Promise<void> {
      try {
        await command("tmux", ["set-option", "-gq", "@opencode_notify_last_pane", pane])
      } catch {
        // tmux may disappear while OpenCode is running.
      }
    },

    async clientTtys(session: string, allClients: boolean): Promise<string[]> {
      try {
        const args = ["list-clients"]
        if (!allClients) args.push("-t", session)
        args.push("-F", "#{client_tty}")
        return (await command("tmux", args))
          .split("\n")
          .map((tty) => tty.trim())
          .filter(Boolean)
      } catch {
        return []
      }
    },
  }
}
