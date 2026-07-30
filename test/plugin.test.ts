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
      if (args[0] === "list-clients") return "/dev/pts/3\n/dev/pts/4\n"
      return ""
    },
    appendFile: (path, data) => writes.push([path, data]),
  })
  const hooks = await plugin(input)

  await hooks.event?.({ event: { type: "session.error", properties: { sessionID: "main" } } as never })

  expect(writes).toHaveLength(2)
  expect(writes[0]?.[0]).toBe("/dev/pts/3")
  expect(writes[0]?.[1]).toBe("\u001b]777;notify;OpenCode: Session error;dev • demo • main • 0 • 2 • Code\u0007")
  expect(calls.at(-1)).toEqual(["list-clients", "-F", "#{client_tty}"])
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
