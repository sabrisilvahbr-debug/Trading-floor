import { describe, expect, it } from "vitest";
import { accessGranted } from "../lib/access";

describe("accessGranted", () => {
  it("libera com o código certo", () => expect(accessGranted("abc", "abc")).toBe(true));
  it("bloqueia código errado", () => expect(accessGranted("abd", "abc")).toBe(false));
  it("bloqueia sem código configurado", () => expect(accessGranted("abc", undefined)).toBe(false));
  it("bloqueia sem código enviado", () => expect(accessGranted(null, "abc")).toBe(false));
});
