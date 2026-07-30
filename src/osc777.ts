import { sanitize } from "./sanitize.js"

export function osc777(title: string, body: string): string {
  return `\u001b]777;notify;${sanitize(title)};${sanitize(body)}\u0007`
}
