/**
 * Terminal Visual Notify Plugin for OpenCode
 *
 * Zero-dependency visual desktop notifications for terminal workflows.
 * Emits terminal notification escape sequences that can work over SSH and tmux.
 *
 * Supported terminal protocols:
 * - OSC 9: Ghostty/iTerm-style desktop notifications
 * - OSC 99: kitty-style desktop notifications
 *
 * No sound is requested. Local notification sound policy is left to the OS.
 */

import { writeFileSync } from "node:fs"

const events = new Set([
  "session.idle",
  "session.error",
  "permission.asked",
  "question.asked",
])

const messages = {
  "session.idle": "OpenCode: Done",
  "session.error": "OpenCode: Error",
  "permission.asked": "OpenCode: Permission needed",
  "question.asked": "OpenCode: Question asked",
}

function sanitize(text) {
  return String(text)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tmuxPassthrough(sequence) {
  return `\u001bPtmux;${sequence.replace(/\u001b/g, "\u001b\u001b")}\u001b\\`
}

function writeTerminal(sequence) {
  const output = process.env.TMUX ? tmuxPassthrough(sequence) : sequence

  try {
    writeFileSync("/dev/tty", output, { flag: "a" })
  } catch {
    try {
      process.stdout.write(output)
    } catch {}
  }
}

function osc9(message) {
  return `\u001b]9;${sanitize(message)}\u001b\\`
}

function osc99(message) {
  return `\u001b]99;u=1;${sanitize(message)}\u001b\\`
}

function protocols() {
  const term = (process.env.TERM || "").toLowerCase()
  if (term.includes("kitty")) return [osc99]
  if (term.includes("ghostty")) return [osc9]

  // SSH often sets TERM to xterm-256color, so fall back to both.
  return [osc9, osc99]
}

function notify(message) {
  for (const protocol of protocols()) {
    writeTerminal(protocol(message))
  }
}

export const TerminalVisualNotify = async () => ({
  event: async ({ event }) => {
    if (!events.has(event.type)) return
    notify(messages[event.type] || `OpenCode: ${event.type}`)
  },
})
