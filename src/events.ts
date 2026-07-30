import type { NotificationEvent } from "./config.js"

export interface EventLike {
  type?: unknown
  [key: string]: unknown
}

const sessionKeys = new Set([
  "sessionID",
  "sessionId",
  "session_id",
])

const parentSessionKeys = new Set([
  "parentID",
  "parentId",
  "parent_id",
  "parentSessionID",
  "parentSessionId",
  "parent_session_id",
])

function valuesForKeys(value: unknown, keys: Set<string>): unknown[] {
  if (!value || typeof value !== "object") return []
  return Object.entries(value).flatMap(([key, nested]) =>
    keys.has(key) ? [nested] : valuesForKeys(nested, keys),
  )
}

export function eventSessionIds(event: EventLike): string[] {
  return valuesForKeys(event, sessionKeys)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

export function isTopLevelSession(event: EventLike): boolean {
  return !valuesForKeys(event, parentSessionKeys).some(
    (value) => typeof value === "string" && value.length > 0,
  )
}

export function shouldNotify(
  event: EventLike,
  events: Set<NotificationEvent>,
  notifyChildSessions: boolean,
): event is EventLike & { type: NotificationEvent } {
  if (typeof event.type !== "string" || !events.has(event.type as NotificationEvent)) return false
  return notifyChildSessions || isTopLevelSession(event)
}

export function idleKey(event: EventLike): string {
  const ids = eventSessionIds(event)
  return `${String(event.type)}:${ids.join(",")}`
}
