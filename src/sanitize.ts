const OSC_DELIMITER = /[;\]\u0000-\u001f\u007f-\u009f]/g

export function sanitize(value: unknown): string {
  return String(value ?? "")
    .replace(OSC_DELIMITER, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function shortHostname(hostname: string): string {
  return sanitize(hostname.split(".")[0] || hostname)
}
