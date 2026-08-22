import type { CheckData } from "./Check";
import type { Beat } from "./Whiteboard";

/** Shapes the lesson route returns, one variant per rung. */
export interface Row {
  concept_id: string;
  concept_side: string;
  analogy_side: string;
  note: string;
}

export interface Scene {
  concept_id: string;
  narration: string;
  cue: string;
  prompt: string;
  answer: string;
}

export interface Lesson {
  headline?: string;
  premise?: string;
  breaks_down?: string;
  beats?: Beat[];
  mapping?: Row[];
  scenes?: Scene[];
  mode?: "CAMERA" | "DIAGNOSE";
  brief?: string;
  artifact?: string;
  rubric?: string[];
  concept_id?: string;
  check?: CheckData;
}
