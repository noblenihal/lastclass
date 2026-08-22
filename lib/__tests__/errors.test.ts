import { describe, expect, it } from "vitest";
import { GeminiError, describeBlock, errorResponse } from "../errors";
import { RouteRefusal } from "../route";

describe("GeminiError", () => {
  it("marks transient failures as retryable", () => {
    for (const kind of ["timeout", "unavailable", "rate_limited"] as const) {
      expect(new GeminiError(kind, "x").retryable).toBe(true);
    }
  });

  it("never marks a policy refusal retryable", () => {
    // Telling someone to retry a blocked topic sends them back to something
    // that can never succeed.
    expect(new GeminiError("blocked", "x").retryable).toBe(false);
    expect(new GeminiError("recitation", "x").retryable).toBe(false);
    expect(new GeminiError("config", "x").retryable).toBe(false);
  });

  it("keeps the learner-facing message separate from the debug detail", () => {
    const e = new GeminiError("blocked", "Try another topic.", "raw api dump");
    expect(e.userMessage).toBe("Try another topic.");
    expect(e.message).toBe("raw api dump");
  });
});

describe("describeBlock", () => {
  it("names the safety category that actually tripped", () => {
    const msg = describeBlock("SAFETY", [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", probability: "HIGH" },
    ]);
    expect(msg).toContain("dangerous content");
  });

  it("lists several categories when more than one tripped", () => {
    const msg = describeBlock("SAFETY", [
      { category: "HARM_CATEGORY_HARASSMENT", blocked: true },
      { category: "HARM_CATEGORY_HATE_SPEECH", probability: "MEDIUM" },
    ]);
    expect(msg).toContain("harassment");
    expect(msg).toContain("hate speech");
  });

  it("ignores categories that were merely considered and not tripped", () => {
    const msg = describeBlock("SAFETY", [
      { category: "HARM_CATEGORY_HARASSMENT", probability: "NEGLIGIBLE" },
    ]);
    expect(msg).not.toContain("harassment");
  });

  it("says rewording will not help when the block is categorical", () => {
    expect(describeBlock("PROHIBITED_CONTENT", [])).toMatch(/won't help/i);
  });

  it("still returns something useful when the API says nothing specific", () => {
    expect(describeBlock(undefined, undefined).length).toBeGreaterThan(20);
  });
});

describe("errorResponse", () => {
  it("returns 422 for a refusal, so it is not read as a server fault", () => {
    expect(errorResponse(new GeminiError("blocked", "no"), "fb").status).toBe(422);
    expect(errorResponse(new GeminiError("recitation", "no"), "fb").status).toBe(422);
  });

  it("returns 502 for an upstream problem", () => {
    expect(errorResponse(new GeminiError("unavailable", "no"), "fb").status).toBe(502);
    expect(errorResponse(new GeminiError("timeout", "no"), "fb").status).toBe(502);
  });

  it("passes a deliberate route refusal through with its own status", () => {
    const out = errorResponse(
      new RouteRefusal({ message: "Not a topic.", kind: "unintelligible", retryable: true }),
      "fb",
    );
    expect(out.status).toBe(422);
    expect(out.body).toEqual({
      error: "Not a topic.",
      kind: "unintelligible",
      retryable: true,
    });
  });

  it("falls back safely for an error it has never seen", () => {
    const out = errorResponse(new Error("boom"), "Something went wrong.");
    expect(out.status).toBe(502);
    expect(out.body.error).toBe("Something went wrong.");
    expect(out.body.retryable).toBe(true);
  });

  it("never leaks the raw error text to the learner", () => {
    const out = errorResponse(new Error("KEY=AQ.secret"), "Try again.");
    expect(JSON.stringify(out.body)).not.toContain("AQ.secret");
  });
});
