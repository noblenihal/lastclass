import { describe, expect, it } from "vitest";
import { DEPTH_RULE, STAY_IN_DOMAIN, learnerContext } from "../context";

const concepts = [
  { id: "a", name: "Solid thing", gist: "", mastery: 0.9 },
  { id: "b", name: "Shaky thing", gist: "", mastery: 0.2 },
  { id: "c", name: "Untouched thing", gist: "", mastery: 0 },
];

const base = {
  topic: "recursion",
  level: "MEDIUM" as const,
  interest: "cricket",
  concepts,
};

describe("learnerContext", () => {
  it("always carries the domain guard, so depth cannot escalate the subject", () => {
    expect(learnerContext(base)).toContain(STAY_IN_DOMAIN);
  });

  it("states the depth rule for the level in play", () => {
    expect(learnerContext({ ...base, level: "BASIC" })).toContain(
      DEPTH_RULE.BASIC,
    );
  });

  it("prefers the detected level over what the learner claimed", () => {
    const out = learnerContext({
      ...base,
      level: "BASIC",
      detectedLevel: "ADVANCED",
      levelEvidence: "used the term 'tail call' correctly",
    });
    expect(out).toContain(DEPTH_RULE.ADVANCED);
    expect(out).toContain("Trust the writing");
    expect(out).toContain("tail call");
  });

  it("says nothing about a mismatch when the two levels agree", () => {
    const out = learnerContext({ ...base, detectedLevel: "MEDIUM" });
    expect(out).not.toContain("Trust the writing");
  });

  it("sorts concepts into solid, shaky and no-evidence", () => {
    const out = learnerContext(base);
    expect(out).toContain("Solid on: Solid thing");
    expect(out).toContain("Shaky on: Shaky thing");
    expect(out).toContain("No evidence yet on: Untouched thing");
  });

  it("does not claim anything is solid when nothing has been proved", () => {
    const out = learnerContext({
      ...base,
      concepts: [{ id: "a", name: "x", gist: "", mastery: 0 }],
    });
    expect(out).toContain("Nothing is solid yet");
  });

  it("uses the interest domain when there is one", () => {
    expect(learnerContext(base)).toContain('"cricket"');
  });

  it("forbids inventing an analogy when no interest was given", () => {
    const out = learnerContext({ ...base, interest: undefined });
    expect(out).toContain("have not named an interest domain");
    expect(out).not.toContain("cricket");
  });
});
