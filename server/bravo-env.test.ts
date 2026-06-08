import { describe, it, expect } from "vitest";

describe("Bravo Escalas — Environment Variables", () => {
  it("should have BRAVO_EMAIL configured", () => {
    const email = process.env.BRAVO_EMAIL;
    expect(email).toBeTruthy();
    expect(email).toContain("@");
  });

  it("should have BRAVO_PASSWORD configured", () => {
    const password = process.env.BRAVO_PASSWORD;
    expect(password).toBeTruthy();
    expect(password!.length).toBeGreaterThan(4);
  });

  it("should have BRAVO_HOMOLOGADOR_ID configured", () => {
    const homologadorId = process.env.BRAVO_HOMOLOGADOR_ID;
    expect(homologadorId).toBeTruthy();
    // Deve ser um número (matrícula)
    expect(/^\d+$/.test(homologadorId!)).toBe(true);
  });
});
