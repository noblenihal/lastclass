import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/gemini";
import {
  RUNGS,
  type LearnerLevel,
  type Level,
  type Session,
  statusOf,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().trim().min(2).max(160),
  interest: z.string().trim().min(2).max(80),
  level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]),
  /** Optional writing sample — we read the learner's real level out of it. */
  sample: z.string().trim().max(8000).optional(),
});

const schema = {
  type: "object",
  properties: {
    topic_type: { type: "string", enum: ["THEORY", "PRACTICAL", "HYBRID"] },
    type_reason: { type: "string" },
    detected_level: { type: "string", enum: ["BASIC", "MEDIUM", "ADVANCED"] },
    level_evidence: { type: "string" },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          gist: { type: "string" },
          prereqs: { type: "array", items: { type: "string" } },
          /** 0-100. Non-zero only when the sample shows real evidence. */
          starting_mastery: { type: "integer" },
          mastery_reason: { type: "string" },
        },
        required: [
          "id",
          "name",
          "gist",
          "prereqs",
          "starting_mastery",
          "mastery_reason",
        ],
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
  required: [
    "topic_type",
    "type_reason",
    "detected_level",
    "level_evidence",
    "concepts",
    "levels",
  ],
};

interface Raw {
  topic_type: Session["topicType"];
  type_reason: string;
  detected_level: LearnerLevel;
  level_evidence: string;
  concepts: {
    id: string;
    name: string;
    gist: string;
    prereqs: string[];
    starting_mastery: number;
    mastery_reason: string;
  }[];
  levels: { rung: string; title: string; concept_ids: string[] }[];
}

/**
 * Depth register. This changes WHICH concepts belong in the graph, not just
 * the wording — "gravity" for a ten-year-old is mass, falling and weight;
 * for an undergraduate it is fields, the equivalence principle and spacetime
 * curvature. Same topic, genuinely different curriculum.
 */
const LEVEL_BRIEF: Record<LearnerLevel, string> = {
  BASIC:
    "Pitch this for a curious 10-year-old. Everyday words only, no formulas, " +
    "no symbols, no jargon. Concepts must be things they can picture or have " +
    "felt themselves. If a concept cannot be explained without algebra, it " +
    "does not belong in this graph at all.",
  MEDIUM:
    "Pitch this at high-school level. Correct terminology, simple equations " +
    "and mechanisms are fine. Cover the standard model of the topic and the " +
    "places students usually go wrong — but leave out graduate-level " +
    "formalism.",
  ADVANCED:
    "Pitch this at university level. Full rigour, formal definitions, edge " +
    "cases, competing models and the subtleties that separate working " +
    "knowledge from real mastery. Do not waste a concept slot on basics " +
    "someone at this level already has.",
};

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, interest, level, sample } = parsed.data;
  const hasSample = Boolean(sample && sample.length > 40);

  try {
    const raw = await generateJSON<Raw>({
      system:
        "You are the curriculum architect for LastClass, an adaptive learning " +
        "system. You break a topic into a prerequisite graph and a five-rung " +
        "ladder of understanding, calibrated to how much the learner already " +
        "knows. You never pad — every concept must be load-bearing.",
      prompt: `Topic the learner wants to master: "${topic}"
Their interest domain (used later for analogies): "${interest}"
Depth the learner asked for: ${level}
${LEVEL_BRIEF[level]}

${
  hasSample
    ? `They also pasted something they wrote or read about this topic. Read it
and judge their ACTUAL level from it — how they use terminology, what they
get right, what they misunderstand, what they omit:
"""
${sample}
"""

Set detected_level from this writing, NOT from what they claimed. If the
writing contradicts their self-assessment, trust the writing. In
level_evidence, say in one or two sentences what in the text told you this —
quote or reference specifics.

Then set starting_mastery (0-100) per concept based on what the sample
actually demonstrates: high where they clearly understand it, low where they
are vague, 0 where the sample gives no evidence either way. Be strict —
confident-sounding prose is not evidence of understanding.`
    : `They gave no writing sample. Set detected_level to exactly "${level}",
set level_evidence to "Self-assessed — no writing sample provided.", and set
every starting_mastery to 0 with mastery_reason "No evidence yet." Do not
invent mastery the learner has not demonstrated.`
}

Produce:

1. topic_type — is mastering this mostly THEORY (understanding ideas),
   mostly PRACTICAL (performing a skill), or HYBRID? Judge honestly:
   "photosynthesis" is THEORY, "tying a bowline" is PRACTICAL, "React hooks"
   is HYBRID.
2. type_reason — one short sentence justifying that call.
3. concepts — 5 to 7 load-bearing concepts, pitched at the level above. Each
   needs a slug id (lowercase, hyphenated), a short name (2-4 words), a
   one-sentence gist, prereqs listing ids that must come first, plus
   starting_mastery and mastery_reason per the rules above. The graph must be
   acyclic and at least two concepts must have no prereqs.
4. levels — exactly five, one per rung in this order: Remember, Understand,
   Internalize, Apply, Teach. Give each a title specific to THIS topic at THIS
   level (not a generic rung name). Assign concept_ids to each level.

Titles should sound like a real teacher wrote them. Be specific, never generic.`,
      schema,
    });

    const validIds = new Set(raw.concepts.map((c) => c.id));
    const concepts = raw.concepts.map((c, i) => {
      const mastery = Math.min(1, Math.max(0, (c.starting_mastery ?? 0) / 100));
      return {
        id: c.id,
        name: c.name,
        gist: c.gist,
        prereqs: c.prereqs.filter((p) => validIds.has(p) && p !== c.id),
        mastery,
        status: statusOf(mastery, i === 0 || mastery > 0),
      };
    });

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
      statedLevel: level,
      detectedLevel: raw.detected_level,
      levelEvidence: raw.level_evidence,
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
