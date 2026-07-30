import { expect, test } from "bun:test"
import { osc777 } from "../src/osc777.js"
import { sanitize } from "../src/sanitize.js"

test("sanitize removes terminal controls and OSC delimiters", () => {
  const value = sanitize("hello;\u001b]777;notify\u0007\nworld")

  expect(value).toBe("hello 777 notify world")
  expect(value).not.toMatch(/[\u0000-\u001f\u007f-\u009f;]/)
})

test("osc777 produces a terminated notification sequence", () => {
  expect(osc777("OpenCode", "done;\nnow")).toBe(
    "\u001b]777;notify;OpenCode;done now\u0007",
  )
})
