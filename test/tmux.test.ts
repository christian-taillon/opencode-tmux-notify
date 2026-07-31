import { expect, test } from "bun:test"
import { createTmuxHelpers } from "../src/tmux.js"

test("tmux helpers use argument arrays and parse pane/client output", async () => {
  const calls: Array<[string, string[]]> = []
  const command = async (name: string, args: string[]) => {
    calls.push([name, args])
    if (args[0] === "display-message") return "work\t2\t1\tEditor\n"
    if (args[0] === "list-clients") return "/dev/pts/4\n/dev/pts/5\n"
    return ""
  }
  const tmux = createTmuxHelpers(command)

  await expect(tmux.resolvePane("%12")).resolves.toEqual({
    session: "work",
    window: "2",
    pane: "1",
    windowName: "Editor",
  })
  await tmux.rememberPane("%12")
  await expect(tmux.clientTtys("work", false)).resolves.toEqual(["/dev/pts/4", "/dev/pts/5"])
  await tmux.clientTtys("work", true)
  await expect(tmux.clientTargets("work", false)).resolves.toEqual([
    { tty: "/dev/pts/4", termName: "", termType: "" },
    { tty: "/dev/pts/5", termName: "", termType: "" },
  ])

  expect(calls).toEqual([
    ["tmux", ["display-message", "-p", "-t", "%12", "#{session_name}\t#{window_index}\t#{pane_index}\t#{window_name}"]],
    ["tmux", ["set-option", "-gq", "@opencode_notify_last_pane", "%12"]],
    ["tmux", ["list-clients", "-t", "work", "-F", "#{client_tty}"]],
    ["tmux", ["list-clients", "-F", "#{client_tty}"]],
    ["tmux", ["list-clients", "-t", "work", "-F", "#{client_tty}\t#{client_termname}\t#{client_termtype}"]],
  ])
})

test("tmux helper failures become safe empty results", async () => {
  const tmux = createTmuxHelpers(async () => {
    throw new Error("tmux unavailable")
  })

  await expect(tmux.resolvePane("%1")).resolves.toBeUndefined()
  await expect(tmux.rememberPane("%1")).resolves.toBeUndefined()
  await expect(tmux.clientTtys("work", false)).resolves.toEqual([])
})
