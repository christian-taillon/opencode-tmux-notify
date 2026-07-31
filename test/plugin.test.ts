import { expect, test } from "bun:test"
import { createPlugin } from "../src/index.js"
import { normalizeConfig } from "../src/config.js"

const input = { directory: "/home/christian/projects/demo" } as never

test("notifies every attached client", async () => {
  const writes: Array<[string, string]> = []
  const calls: string[][] = []
  const plugin = createPlugin({
    environment: { TMUX_PANE: "%7" },
    config: normalizeConfig({}),
    host: "dev.example.test",
    command: async (_command, args) => {
      calls.push(args)
      if (args[0] === "display-message") return "main\t0\t2\tCode\n"
      if (args[0] === "list-clients") return "/dev/pts/3\t\t\n/dev/pts/4\t\t\n"
      return ""
    },
    appendFile: (path, data) => writes.push([path, data]),
  })
  const hooks = await plugin(input)

  await hooks.event?.({ event: { type: "session.error", properties: { sessionID: "main" } } as never })

  expect(writes).toHaveLength(2)
  expect(writes[0]?.[0]).toBe("/dev/pts/3")
  expect(writes[0]?.[1]).toBe("\u001b]777;notify;OpenCode: Session error;dev • demo • main • 0 • 2 • Code\u0007")
  expect(calls.at(-1)).toEqual(["list-clients", "-F", "#{client_tty}\t#{client_termname}\t#{client_termtype}"])
})

test("maps every supported event to its notification title", async () => {
  const writes: string[] = []
  const plugin = createPlugin({
    environment: {},
    host: "dev.example.test",
    config: normalizeConfig({ events: {
      "permission.asked": true,
      "question.asked": true,
      "session.idle": true,
      "session.error": true,
    } }),
    appendFile: (_path, data) => writes.push(data),
  })
  const hooks = await plugin(input)

  for (const [type, sessionID] of [
    ["permission.asked", "one"],
    ["question.asked", "two"],
    ["session.idle", "three"],
    ["session.error", "four"],
  ] as const) {
    await hooks.event?.({ event: { type, properties: { sessionID } } as never })
  }

  expect(writes.map((value) => value.split(";")[2])).toEqual([
    "OpenCode: Approval required",
    "OpenCode: Answer required",
    "OpenCode: Task complete",
    "OpenCode: Session error",
  ])
  expect(writes[0]).toContain("dev • demo")
})

test("uses /dev/tty directly without a startup tmux pane and deduplicates idle", async () => {
  const writes: Array<[string, string]> = []
  let timestamp = 0
  const plugin = createPlugin({
    environment: {},
    tty: "/tmp/tty",
    config: normalizeConfig({}),
    now: () => timestamp,
    appendFile: (path, data) => writes.push([path, data]),
  })
  const hooks = await plugin(input)
  const event = { type: "session.idle", properties: { sessionID: "main" } } as never

  await hooks.event?.({ event })
  await hooks.event?.({ event })
  timestamp = 1_001
  await hooks.event?.({ event })

  expect(writes).toHaveLength(2)
  expect(writes[0]?.[0]).toBe("/tmp/tty")
})

test("uses Kitty OSC 99 when the terminal is Kitty", async () => {
  const writes: string[] = []
  const plugin = createPlugin({
    environment: { TERM_PROGRAM: "kitty" },
    config: normalizeConfig({}),
    now: () => 42,
    appendFile: (_path, data) => writes.push(data),
  })
  const hooks = await plugin(input)

  await hooks.event?.({ event: { type: "session.error", properties: { sessionID: "main" } } as never })

  expect(writes[0]).toMatch(/^\u001b\]99;i=opencode-42-0:d=0:p=title;/)
  expect(writes[0]).toContain("\u001b]99;i=opencode-42-0:d=1:p=body;")
})

test("uses iTerm2 OSC 9 when the terminal is iTerm2", async () => {
  const writes: string[] = []
  const plugin = createPlugin({
    environment: { TERM_PROGRAM: "iTerm.app" },
    config: normalizeConfig({}),
    host: "dev.example.test",
    appendFile: (_path, data) => writes.push(data),
  })
  const hooks = await plugin(input)

  await hooks.event?.({ event: { type: "session.error", properties: { sessionID: "main" } } as never })

  expect(writes[0]).toBe("\u001b]9;OpenCode: Session error: dev • demo\u0007")
})

test("uses each tmux client's terminal protocol in auto mode", async () => {
  const writes: Array<[string, string]> = []
  const plugin = createPlugin({
    environment: { TMUX_PANE: "%7" },
    config: normalizeConfig({}),
    command: async (_command, args) => {
      if (args[0] === "display-message") return "main\t0\t2\tCode\n"
      if (args[0] === "list-clients") {
        return "/dev/pts/3\txterm-kitty\tkitty 0.40\n/dev/pts/4\txterm-256color\tghostty 1.3.1\n"
      }
      return ""
    },
    appendFile: (path, data) => writes.push([path, data]),
  })
  const hooks = await plugin(input)

  await hooks.event?.({ event: { type: "session.error", properties: { sessionID: "main" } } as never })

  expect(writes[0]?.[0]).toBe("/dev/pts/3")
  expect(writes[0]?.[1]).toContain("\u001b]99;")
  expect(writes[1]?.[0]).toBe("/dev/pts/4")
  expect(writes[1]?.[1]).toContain("\u001b]777;")
})

test("does not notify child sessions by default", async () => {
  const writes: string[] = []
  const plugin = createPlugin({
    environment: {},
    appendFile: (path) => writes.push(path),
  })
  const hooks = await plugin(input)

  await hooks.event?.({
    event: { type: "permission.asked", properties: { sessionID: "child", parentID: "root" } } as never,
  })

  expect(writes).toEqual([])
})

test("uses session metadata when the event only carries a session id", async () => {
  const writes: string[] = []
  const plugin = createPlugin({
    environment: {},
    appendFile: (path) => writes.push(path),
  })
  const hooks = await plugin({
    ...input,
    client: {
      session: {
        get: async () => ({ data: { parentID: "root" } }),
      },
    },
  } as never)

  await hooks.event?.({
    event: { type: "session.idle", properties: { sessionID: "child" } } as never,
  })

  expect(writes).toEqual([])
})
