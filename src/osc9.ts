import { sanitize } from "./sanitize.js"

export function osc9(title: string, body: string): string {
  return `\u001b]9;${sanitize(`${title}: ${body}`)}\u0007`
}
