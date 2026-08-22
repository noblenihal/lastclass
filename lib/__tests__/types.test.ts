import { describe, expect, it } from "vitest";
import {
  conceptDepths,
  masteryToken,
  statusOf,
  type Concept,
} from "../types";

const c = (id: string, prereqs: string[] = [], mastery = 0): Concept => ({
  id,
  name: id,
  gist: "",
  prereqs,
  mastery,
  status: "active",
});

describe("conceptDepths", () => {
  it("puts concepts with no prerequisites at depth 0", () => {
    const d = conceptDepths([c("a"), c("b")]);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(0);
  });

  it("increments depth along a prerequisite chain", () => {
    const d = conceptDepths([c("a"), c("b", ["a"]), c("c", ["b"])]);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(1);
    expect(d.get("c")).toBe(2);
  });

  it("takes the longest path when a concept has several prerequisites", () => {
    // d depends on a (depth 0) and c (depth 2) — it must sit after both.
    const d = conceptDepths([c("a"), c("b", ["a"]), c("c", ["b"]), c("d", ["a", "c"])]);
    expect(d.get("d")).toBe(3);
  });

  it("survives a cycle instead of recursing forever", () => {
    // Model output is not trusted to be acyclic; this must terminate.
    const d = conceptDepths([c("a", ["b"]), c("b", ["a"])]);
    expect(d.size).toBe(2);
    expect(Number.isFinite(d.get("a"))).toBe(true);
  });

  it("ignores prerequisites that name a concept which does not exist", () => {
    const d = conceptDepths([c("a", ["ghost"])]);
    expect(d.get("a")).toBe(0);
  });

  it("orders every concept after all of its prerequisites", () => {
    // This is the property the roadmap's ordering actually relies on.
    const graph = [
      c("intro"),
      c("basics", ["intro"]),
      c("mid", ["basics"]),
      c("advanced", ["mid", "intro"]),
    ];
    const d = conceptDepths(graph);
    for (const concept of graph) {
      for (const p of concept.prereqs) {
        expect(d.get(concept.id)!).toBeGreaterThan(d.get(p)!);
      }
    }
  });
});

describe("statusOf", () => {
  it("reports locked regardless of mastery when not unlocked", () => {
    expect(statusOf(1, false)).toBe("locked");
  });

  it("treats 0.8 and above as mastered", () => {
    expect(statusOf(0.8, true)).toBe("mastered");
    expect(statusOf(0.79, true)).not.toBe("mastered");
  });

  it("only calls something weak once there is evidence for it", () => {
    // Untouched (0) is 'active', not 'weak' — we have not seen them fail.
    expect(statusOf(0, true)).toBe("active");
    expect(statusOf(0.1, true)).toBe("weak");
    expect(statusOf(0.39, true)).toBe("weak");
    expect(statusOf(0.4, true)).toBe("active");
  });
});

describe("masteryToken", () => {
  it("maps the range onto the five ramp steps", () => {
    expect(masteryToken(0)).toBe("var(--mastery-0)");
    expect(masteryToken(1)).toBe("var(--mastery-4)");
    expect(masteryToken(0.5)).toBe("var(--mastery-2)");
  });

  it("clamps values outside 0..1 rather than producing a missing token", () => {
    expect(masteryToken(-5)).toBe("var(--mastery-0)");
    expect(masteryToken(99)).toBe("var(--mastery-4)");
  });
});
