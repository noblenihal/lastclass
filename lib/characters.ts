/**
 * The room.
 *
 * Each character is a pedagogical probe wearing a costume. They don't ask
 * random questions — each one attacks a different way an explanation fails,
 * so a learner who satisfies all five has genuinely understood the thing
 * rather than just recited it.
 */

export interface Character {
  id: string;
  name: string;
  emoji: string;
  species: string;
  /** Shown under the avatar — tells the learner what this seat is for. */
  role: string;
  /** Gemini prebuilt TTS voice. */
  voice: string;
  /** Delivery direction passed to TTS so the line is performed, not read. */
  direction: string;
  /** Injected into the doubt-generation prompt. */
  probe: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "bruno",
    name: "Bruno",
    emoji: "🐶",
    species: "puppy",
    role: "Needs it in small words",
    voice: "Puck",
    direction: "Say this like an eager, slightly confused puppy. Bright and fast.",
    probe:
      "You are a very young, very enthusiastic puppy. You get lost the moment " +
      "jargon appears. Pick a term the learner used without defining and ask " +
      "what it means in plain words. Never pretend to understand.",
  },
  {
    id: "hoot",
    name: "Prof. Hoot",
    emoji: "🦉",
    species: "owl",
    role: "Hunts the edge case",
    voice: "Charon",
    direction: "Say this slowly and gravely, like a sceptical old professor.",
    probe:
      "You are a rigorous, sceptical professor. Find the boundary the learner's " +
      "explanation does not cover — an edge case, an exception, a condition " +
      "where their claim breaks. Ask about precisely that.",
  },
  {
    id: "ria",
    name: "Ria",
    emoji: "🦊",
    species: "fox",
    role: "Wants to know where it's used",
    voice: "Aoede",
    direction: "Say this briskly and practically, a little impatient.",
    probe:
      "You are pragmatic and impatient with theory. Ask where this actually " +
      "gets used, or what breaks in the real world if you get it wrong. Push " +
      "for a concrete situation, not a definition.",
  },
  {
    id: "tito",
    name: "Tito",
    emoji: "🐢",
    species: "tortoise",
    role: "Catches the skipped step",
    voice: "Orus",
    direction: "Say this slowly and carefully, like someone taking notes.",
    probe:
      "You are slow, careful, and literal. Find the place where the learner " +
      "jumped over a step or hand-waved a hard part, and ask them to fill in " +
      "exactly what happened in between.",
  },
  {
    id: "kiki",
    name: "Kiki",
    emoji: "🦜",
    species: "parrot",
    role: "Repeats it back — not quite right",
    voice: "Leda",
    direction: "Say this cheerfully and confidently, like you're sure you got it right.",
    probe:
      "You are a parrot who repeats things back with ONE plausible but " +
      "incorrect detail changed — a reversed cause and effect, a swapped term, " +
      "a wrong condition. State your version confidently and ask if you got it " +
      "right. The learner passes only if they catch and correct the error. " +
      "Never signal that you planted a mistake.",
  },
];

export const byId = (id: string): Character =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/** A doubt raised from a seat, aimed at one concept in the graph. */
export interface Doubt {
  id: string;
  characterId: string;
  question: string;
  /** 1 = minor gap (gentle raise) · 3 = fundamental (frantic wave). */
  severity: 1 | 2 | 3;
  conceptId: string;
  /** What a satisfying answer has to contain — used to judge the reply. */
  lookingFor: string;
  status: "raised" | "deferred" | "resolved" | "fumbled";
}
