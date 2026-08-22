import { describe, expect, it } from "vitest";
import {
  clampInt,
  reconcileCheck,
  reconcileIds,
  reconcilePrereqs,
  resolveId,
  toMastery,
} from "../reconcile";

const valid = new Set(["a", "b", "c"]);

describe("resolveId", () => {
  it("keeps an id that names something real", () => {
    expect(resolveId("b", valid, "a")).toBe("b");
  });

  it("replaces an invented id with the fallback", () => {
    expect(resolveId("hallucinated", valid, "a")).toBe("a");
  });

  it("survives a missing or wrongly-typed id", () => {
    expect(resolveId(undefined, valid, "a")).toBe("a");
    expect(resolveId(42, valid, "a")).toBe("a");
    expect(resolveId(null, valid, "a")).toBe("a");
  });
});

describe("clampInt", () => {
  it("keeps a value already in range", () => {
    expect(clampInt(2, 0, 3)).toBe(2);
  });

  it("pulls out-of-range values back to the bounds", () => {
    expect(clampInt(99, 0, 3)).toBe(3);
    expect(clampInt(-4, 0, 3)).toBe(0);
  });

  it("rounds rather than truncating", () => {
    expect(clampInt(1.6, 0, 3)).toBe(2);
  });

  it("falls back to the minimum on junk", () => {
    expect(clampInt("nonsense", 1, 3)).toBe(1);
    expect(clampInt(undefined, 1, 3)).toBe(1);
    expect(clampInt(NaN, 1, 3)).toBe(1);
  });
});

describe("reconcileCheck", () => {
  const ok = {
    question: "Which?",
    options: ["w", "x", "y", "z"],
    correct_index: 2,
    why: "because",
    concept_id: "b",
  };

  it("passes a well-formed check through unchanged", () => {
    expect(reconcileCheck(ok, valid, "a")).toEqual(ok);
  });

  it("clamps an answer index that points past the options", () => {
    // Left alone, this makes the question unanswerable.
    const out = reconcileCheck({ ...ok, correct_index: 9 }, valid, "a");
    expect(out!.correct_index).toBe(3);
  });

  it("never allows a negative answer index", () => {
    const out = reconcileCheck({ ...ok, correct_index: -1 }, valid, "a");
    expect(out!.correct_index).toBe(0);
  });

  it("caps at four options and re-clamps the index against the survivors", () => {
    const out = reconcileCheck(
      { ...ok, options: ["a", "b", "c", "d", "e", "f"], correct_index: 5 },
      valid,
      "a",
    );
    expect(out!.options).toHaveLength(4);
    expect(out!.correct_index).toBe(3);
  });

  it("repoints an invented concept id at a real one", () => {
    const out = reconcileCheck({ ...ok, concept_id: "ghost" }, valid, "a");
    expect(out!.concept_id).toBe("a");
  });

  it("rejects a check that cannot be answered", () => {
    expect(reconcileCheck(undefined, valid, "a")).toBeNull();
    expect(reconcileCheck({ ...ok, options: [] }, valid, "a")).toBeNull();
    expect(reconcileCheck({ ...ok, options: ["only one"] }, valid, "a")).toBeNull();
  });

  it("discards non-string options rather than rendering blanks", () => {
    const out = reconcileCheck(
      { ...ok, options: ["real", null, "also real", 7] as unknown[] },
      valid,
      "a",
    );
    expect(out!.options).toEqual(["real", "also real"]);
  });
});

describe("reconcileIds", () => {
  it("rewrites every invented id in a list", () => {
    const out = reconcileIds(
      [{ concept_id: "a" }, { concept_id: "nope" }, { concept_id: undefined }],
      valid,
      "c",
    );
    expect(out.map((x) => x.concept_id)).toEqual(["a", "c", "c"]);
  });

  it("keeps the rest of each item intact", () => {
    const out = reconcileIds([{ concept_id: "x", label: "keep me" }], valid, "a");
    expect(out[0]).toEqual({ concept_id: "a", label: "keep me" });
  });

  it("returns an empty list when the model sent no array", () => {
    expect(reconcileIds(undefined, valid, "a")).toEqual([]);
  });
});

describe("reconcilePrereqs", () => {
  it("drops a self-reference, which would make the graph cyclic", () => {
    expect(reconcilePrereqs(["a", "b"], "a", valid)).toEqual(["b"]);
  });

  it("drops prerequisites naming concepts that do not exist", () => {
    expect(reconcilePrereqs(["b", "ghost"], "a", valid)).toEqual(["b"]);
  });

  it("survives a missing or wrongly-typed list", () => {
    expect(reconcilePrereqs(undefined, "a", valid)).toEqual([]);
    expect(reconcilePrereqs("b", "a", valid)).toEqual([]);
  });
});

describe("toMastery", () => {
  it("converts the model's 0-100 into a 0..1 mastery", () => {
    expect(toMastery(0)).toBe(0);
    expect(toMastery(50)).toBe(0.5);
    expect(toMastery(100)).toBe(1);
  });

  it("clamps values outside the range", () => {
    expect(toMastery(150)).toBe(1);
    expect(toMastery(-20)).toBe(0);
  });

  it("treats junk as no evidence rather than inventing mastery", () => {
    expect(toMastery(undefined)).toBe(0);
    expect(toMastery("high")).toBe(0);
  });
});
