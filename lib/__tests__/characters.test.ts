import { describe, expect, it } from "vitest";
import { CHARACTERS, MENTOR, byId } from "../characters";

describe("the cast", () => {
  it("gives every character a distinct voice, so the room is not one voice", () => {
    const voices = CHARACTERS.map((c) => c.voice);
    expect(new Set(voices).size).toBe(CHARACTERS.length);
  });

  it("gives every character a distinct id", () => {
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(CHARACTERS.length);
  });

  it("gives every character a probe, a role and a delivery direction", () => {
    for (const c of CHARACTERS) {
      expect(c.probe.length).toBeGreaterThan(20);
      expect(c.role.length).toBeGreaterThan(0);
      expect(c.direction.length).toBeGreaterThan(0);
    }
  });

  it("keeps Kiki's planted-error instruction, which the trap depends on", () => {
    const kiki = CHARACTERS.find((c) => c.id === "kiki");
    expect(kiki?.probe).toMatch(/incorrect|error|mistake/i);
    expect(kiki?.probe).toMatch(/never signal/i);
  });

  it("keeps the Master out of the student roster", () => {
    expect(CHARACTERS.some((c) => c.id === MENTOR.id)).toBe(false);
  });
});

describe("byId", () => {
  it("finds a character by id", () => {
    expect(byId("hoot").name).toBe("Prof. Hoot");
  });

  it("falls back rather than returning undefined for an unknown id", () => {
    // The classroom renders whatever this returns; undefined would crash it.
    expect(byId("nobody")).toBe(CHARACTERS[0]);
    expect(byId("")).toBe(CHARACTERS[0]);
  });
});
