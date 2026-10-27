import { describe, expect, it } from "vitest"
import { describeTargets, interpretTargetRequest } from "../request"

describe("target requests in Spanish", () => {
  it("reads the example from the brief and states its assumption", () => {
    const r = interpretTargetRequest("Quiero una temperatura de 23 °C y humedad entre 75 y 85 %")
    expect(r).toMatchObject({ ok: true, proposal: { mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } } } })
    if (r?.ok) {
      expect(r.proposal.assumptions).toHaveLength(1)
      expect(r.proposal.assumptions[0]).toContain("23 °C como 22–24 °C")
      expect(describeTargets(r.proposal.targets)).toBe("temperatura 22–24 °C y humedad 75–85 %")
    }
  })

  it.each([
    ["Prueba una humedad entre 75 y 85 %", { humidity: { min: 75, max: 85 } }],
    ["pon la humedad de 85 a 75", { humidity: { min: 75, max: 85 } }],
    ["quiero temperatura entre 21,5 y 24", { temperature: { min: 21.5, max: 24 } }],
    ["mantén la humedad en 80", { humidity: { min: 75, max: 85 } }],
    ["objetivo: temperatura 22 y humedad 70 hasta 80", { temperature: { min: 21, max: 23 }, humidity: { min: 70, max: 80 } }],
  ])("%s", (text, targets) => {
    expect(interpretTargetRequest(text)).toMatchObject({ ok: true, proposal: { targets } })
  })

  it("does not mix the numbers of the two metrics", () => {
    const r = interpretTargetRequest("quiero temperatura entre 20 y 24 y humedad entre 80 y 90")
    expect(r).toMatchObject({ ok: true, proposal: { targets: { temperature: { min: 20, max: 24 }, humidity: { min: 80, max: 90 } } } })
  })

  it("refuses targets outside the safe envelope instead of clamping them", () => {
    for (const text of ["quiero humedad entre 10 y 50", "quiero temperatura de 40", "prueba humedad entre 90 y 99", "quiero temperatura entre 22 y 22.5"]) {
      expect(interpretTargetRequest(text)).toMatchObject({ ok: false })
    }
  })

  it("ignores sentences that are not requests or have no numbers", () => {
    for (const text of ["¿Cómo está la humedad?", "¿Por qué bajó la humedad 10 puntos?", "quiero cambiar la temperatura", "hola", "la temperatura es 23"]) {
      expect(interpretTargetRequest(text)).toBeNull()
    }
  })
})
