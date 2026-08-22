import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/gemini";
import { RUNGS, type Level, type Session, statusOf } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(2).max(160),
  interest: z.string().trim().min(2).max(80),
});

const schema = {
  type: "object",
  properties: {
    topic_type: { type: "string", enum: ["THEORY", "PRACTICAL", "HYBRID"] },
    type_reason: { type: "string" },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          gist: { type: "string" },
          prereqs: { type: "array", items: { type: "string" } },
        },
        required: ["id", "name", "gist", "prereqs"],
      },
    },
    levels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rung: {
            type: "string",
            enum: ["Remember", "Understand", "Internalize", "Apply", "Teach"],
          },
          title: { type: "string" },
          concept_ids: { type: "array", items: { type: "string" } },
        },
        required: ["rung", "title", "concept_ids"],
      },
    },
  },
  required: ["topic_type", "type_reason", "concepts", "levels"],
};

interface Raw {
  topic_type: Session["topicType"];
  type_reason: string;
  concepts: { id: string; name: string; gist: string; prereqs: string[] }[];
  levels: { rung: string; title: string; concept_ids: string[] }[];
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, interest } = parsed.data;

  try {
    const raw = await generateJSON<Raw>({
      system:
        "You are the curriculum architect for LastClass, an adaptive learning system. " +
        "You break a topic into a prerequisite graph and a five-rung ladder of understanding. " +
        "You are precise and you never pad. Every concept must be genuinely load-bearing.",
      prompt: `Topic the learner wants to master: "${topic}"
Their interest domain (used later for analogies): "${interest}"

Produce:

1. topic_type — is mastering this mostly THEORY (understanding ideas), mostly
   PRACTICAL (performing a skill), or HYBRID (both)? Judge honestly: "photosynthesis"
   is THEORY, "tying a bowline" is PRACTICAL, "React hooks" is HYBRID.
2. type_reason — one short sentence justifying that call.
3. concepts — 5 to 7 load-bearing concepts. Each needs a slug id (lowercase,
   hyphenated), a short name (2-4 words), a one-sentence gist, and prereqs
   listing the ids of concepts that must be understood first. The graph must be
   acyclic and at least two concepts must have no prereqs.
4. levels — exactly five, one per rung in this order: Remember, Understand,
   Internalize, Apply, Teach. Give each a title specific to THIS topic (not a
   generic rung name — e.g. for photosynthesis the Apply rung might be
   "Diagnose a dying plant"). Assign concept_ids to each level; early rungs
   cover foundational concepts, later rungs cover the whole graph.

Titles should sound like a real teacher wrote them. Be specific, never generic.`,
      schema,
    });

    // Trust nothing about the shape of model output — reconcile ids before use.
    const validIds = new Set(raw.concepts.map((c) => c.id));
    const concepts = raw.concepts.map((c, i) => ({
      id: c.id,
      name: c.name,
      gist: c.gist,
      prereqs: c.prereqs.filter((p) => validIds.has(p) && p !== c.id),
      mastery: 0,
      status: statusOf(0, i === 0),
    }));

    const levels: Level[] = RUNGS.map((rung, i) => {
      const match = raw.levels.find((l) => l.rung === rung);
      const ids = (match?.concept_ids ?? []).filter((id) => validIds.has(id));
      return {
        n: i + 1,
        rung,
        title: match?.title ?? rung,
        conceptIds: ids.length ? ids : concepts.map((c) => c.id),
        unlocked: i === 0,
        passed: false,
      };
    });

    const session: Session = {
      id: crypto.randomUUID(),
      topic,
      topicType: raw.topic_type,
      interest,
      concepts,
      levels,
      createdAt: Date.now(),
    };

    return NextResponse.json({ session, typeReason: raw.type_reason });
  } catch (err) {
    console.error("[curriculum]", err);
    return NextResponse.json(
      { error: "Could not build a curriculum for that topic. Try again." },
      { status: 502 },
    );
  }
}
