import { expect, test } from "bun:test"
import { idleKey, isTopLevelSession, shouldNotify } from "../src/events.js"
import { loadConfig, normalizeConfig } from "../src/config.js"

test("config defaults and file overrides are safe and minimal", () => {
  const defaults = loadConfig(() => {
    throw new Error("missing")
  }, "/home/tester")
  const overrides = loadConfig(
    (path) => {
      expect(path).toBe("/home/tester/.config/opencode/opencode-tmux-notify.json")
      return JSON.stringify({
        events: { "session.idle": false },
        notifyChildSessions: true,
        notifyAllClients: false,
        rememberLastTarget: false,
        protocol: "osc777",
      })
    },
    "/home/tester",
  )

  expect(defaults.notifyChildSessions).toBe(false)
  expect(defaults.notifyAllClients).toBe(true)
  expect(defaults.rememberLastTarget).toBe(true)
  expect(overrides.notifyChildSessions).toBe(true)
  expect(overrides.notifyAllClients).toBe(false)
  expect(overrides.rememberLastTarget).toBe(false)
  expect(overrides.protocol).toBe("osc777")
})

test("object event config honors false while retaining other defaults", () => {
  const config = normalizeConfig({ events: { "session.idle": false } })

  expect(config.events.has("permission.asked")).toBe(true)
  expect(config.events.has("question.asked")).toBe(true)
  expect(config.events.has("session.error")).toBe(true)
  expect(config.events.has("session.idle")).toBe(false)
})

test("array event config remains compatible", () => {
  const config = normalizeConfig({ events: ["session.idle"] })

  expect(config.events).toEqual(new Set(["session.idle"]))
})

test("child sessions are filtered unless explicitly enabled", () => {
  const config = normalizeConfig({ events: ["session.idle"] })
  const child = { type: "session.idle", properties: { sessionID: "child", parentID: "root" } }
  const topLevel = { type: "session.idle", properties: { sessionID: "root" } }

  expect(isTopLevelSession(child)).toBe(false)
  expect(shouldNotify(child, config.events, false)).toBe(false)
  expect(shouldNotify(child, config.events, true)).toBe(true)
  expect(shouldNotify(topLevel, config.events, false)).toBe(true)
})

test("idle keys allow repeated idle events to be deduplicated per session", () => {
  expect(idleKey({ type: "session.idle", properties: { sessionID: "one" } })).toBe(
    "session.idle:one",
  )
  expect(idleKey({ type: "session.idle", properties: { sessionID: "two" } })).not.toBe(
    idleKey({ type: "session.idle", properties: { sessionID: "one" } }),
  )
})
