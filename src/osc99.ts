import { sanitize } from "./sanitize.js"

export function osc99(title: string, body: string, id: string): string {
  const safeId = sanitize(id).replace(/[^a-zA-Z0-9_+.-]/g, "-")
  const safeTitle = sanitize(title)
  const safeBody = sanitize(body)
  return [
    `\u001b]99;i=${safeId}:d=0:p=title;${safeTitle}\u001b\\`,
    `\u001b]99;i=${safeId}:d=1:p=body;${safeBody}\u001b\\`,
  ].join("")
}
