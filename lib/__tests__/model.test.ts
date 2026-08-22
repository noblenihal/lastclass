import { describe, expect, it } from "vitest";
import {
  answerDelta,
  nudge,
  overallMastery,
  pass,
  weakest,
} from "../model";
import type { Concept, Level, Session } from "../types";

const c = (id: string, mastery: number): Concept => ({
  id,
  name: id,
  gist: "",
  prereqs: [],
  mastery,
  status: "active",
});

const lvl = (n: number, passed = false, unlocked = false): Level => ({
  n,
  rung: "Remember",
  title: "",
  conceptIds: [],
  unlocked,
  passed,
});

describe("nudge", () => {
  const concepts = [c("a", 0.5), c("b", 0.5)];

  it("moves only the concept named", () => {
    const out = nudge(concepts, "a", 0.2);
    expect(out[0].mastery).toBeCloseTo(0.7);
    expect(out[1].mastery).toBe(0.5);
  });

  it("cannot push mastery above 1 or below 0", () => {
    expect(nudge(concepts, "a", 99)[0].mastery).toBe(1);
    expect(nudge(concepts, "a", -99)[0].mastery).toBe(0);
  });

  it("recomputes status so the roadmap reflects the new value", () => {
    expect(nudge(concepts, "a", 0.4)[0].status).toBe("mastered");
    expect(nudge(concepts, "a", -0.3)[0].status).toBe("weak");
  });

  it("leaves the model untouched for an unknown concept", () => {
    expect(nudge(concepts, "ghost", 0.5)).toEqual(concepts);
  });

  it("refuses a non-finite delta rather than writing NaN into the model", () => {
    expect(nudge(concepts, "a", NaN)).toEqual(concepts);
    expect(nudge(concepts, "a", Infinity)).toEqual(concepts);
  });

  it("does not mutate the array it was given", () => {
    const before = JSON.parse(JSON.stringify(concepts));
    nudge(concepts, "a", 0.3);
    expect(concepts).toEqual(before);
  });
});

describe("pass", () => {
  const levels = [lvl(1, false, true), lvl(2), lvl(3)];

  it("marks the level passed and unlocks the next", () => {
    const out = pass(levels, 1);
    expect(out[0].passed).toBe(true);
    expect(out[1].unlocked).toBe(true);
  });

  it("does not touch levels further down the ladder", () => {
    expect(pass(levels, 1)[2].unlocked).toBe(false);
  });

  it("handles passing the final level without inventing another", () => {
    const out = pass(levels, 3);
    expect(out[2].passed).toBe(true);
    expect(out).toHaveLength(3);
  });
});

describe("weakest", () => {
  const session = {
    concepts: [c("solid", 0.9), c("shaky", 0.1), c("mid", 0.5), c("none", 0)],
  } as Session;

  it("returns the least-mastered concepts first", () => {
    expect(weakest(session).map((x) => x.id)).toEqual(["none", "shaky", "mid"]);
  });

  it("respects the requested count", () => {
    expect(weakest(session, 1).map((x) => x.id)).toEqual(["none"]);
  });

  it("does not reorder the session's own array", () => {
    weakest(session);
    expect(session.concepts[0].id).toBe("solid");
  });
});

describe("overallMastery", () => {
  it("averages across every concept", () => {
    expect(overallMastery([c("a", 1), c("b", 0)])).toBe(0.5);
  });

  it("returns zero rather than NaN when there are no concepts", () => {
    expect(overallMastery([])).toBe(0);
  });
});

describe("answerDelta", () => {
  it("costs mastery when the answer does not land", () => {
    expect(answerDelta({ resolved: false, quality: 0.9 })).toBeLessThan(0);
  });

  it("rewards more for a better answer", () => {
    const weak = answerDelta({ resolved: true, quality: 0 });
    const strong = answerDelta({ resolved: true, quality: 1 });
    expect(strong).toBeGreaterThan(weak);
  });

  it("halves the reward when the Master was consulted", () => {
    const alone = answerDelta({ resolved: true, quality: 1 });
    const helped = answerDelta({ resolved: true, quality: 1, assisted: true });
    expect(helped).toBeCloseTo(alone / 2);
  });

  it("still costs the full amount for a wrong answer even if assisted", () => {
    // Taking a hint and still getting it wrong is not cheaper.
    expect(answerDelta({ resolved: false, quality: 0, assisted: true })).toBe(
      answerDelta({ resolved: false, quality: 0 }),
    );
  });

  it("treats junk quality as the floor rather than producing NaN", () => {
    const d = answerDelta({
      resolved: true,
      quality: "high" as unknown as number,
    });
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeCloseTo(0.22);
  });
});
