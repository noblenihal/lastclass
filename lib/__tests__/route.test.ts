import { describe, expect, it } from "vitest";
import { RouteRefusal } from "../route";

/**
 * The refusal path is what tells a learner *why* something cannot be built,
 * so its status and retryable flag have to be right — a policy refusal marked
 * retryable would send them back to something that can never work.
 */
describe("RouteRefusal", () => {
  it("defaults to 422 and not-retryable, which is what a refusal is", () => {
    const r = new RouteRefusal({ message: "no", kind: "declined" });
    expect(r.status).toBe(422);
    expect(r.retryable).toBe(false);
  });

  it("carries the reason verbatim so it can be shown to the learner", () => {
    const r = new RouteRefusal({ message: "Not a topic.", kind: "unintelligible" });
    expect(r.message).toBe("Not a topic.");
    expect(r.kind).toBe("unintelligible");
  });

  it("allows a refusal the learner can act on to be marked retryable", () => {
    const r = new RouteRefusal({
      message: "Add a photo first.",
      kind: "missing_input",
      status: 400,
      retryable: true,
    });
    expect(r.status).toBe(400);
    expect(r.retryable).toBe(true);
  });

  it("is identifiable by name, which is how errorResponse routes it", () => {
    expect(new RouteRefusal({ message: "x", kind: "y" }).name).toBe(
      "RouteRefusal",
    );
  });
});
