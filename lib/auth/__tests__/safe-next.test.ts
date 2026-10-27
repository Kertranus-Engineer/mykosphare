import { describe, expect, it } from "vitest"
import { safeNext } from "../safe-next"

describe("login return path", () => {
  it("keeps a valid HOME destination and other internal routes", () => {
    expect(safeNext("/home/conectar?view=real")).toBe("/home/conectar?view=real")
    expect(safeNext("/dashboard")).toBe("/dashboard")
  })

  it("rejects external, script and malformed destinations", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, "/home\nLocation: evil"]) {
      expect(safeNext(value)).toBe("/dashboard")
    }
  })
})
