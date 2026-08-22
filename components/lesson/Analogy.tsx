"use client";

import type { Lesson } from "./types";

export function Analogy({ lesson, interest }: { lesson: Lesson; interest: string }) {
  return (
    <section className="space-y-4">
      <p className="text-[var(--text-lg)] leading-relaxed text-[var(--color-ink-2)]">
        {lesson.premise}
      </p>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-paper-4)]">
        <div className="grid grid-cols-2 border-b border-[var(--color-paper-4)] bg-[var(--color-paper-3)]/60 text-[var(--text-xs)] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
          <span className="px-4 py-2">The real thing</span>
          <span className="border-l border-[var(--color-paper-4)] px-4 py-2">
            {interest || "Something familiar"}
          </span>
        </div>
        {lesson.mapping?.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-2 border-b border-[var(--color-paper-3)] last:border-0"
          >
            <span className="px-4 py-3 text-[var(--text-base)] text-[var(--color-ink)]">
              {r.concept_side}
            </span>
            <span className="border-l border-[var(--color-paper-3)] px-4 py-3">
              <span className="block text-[var(--text-base)] text-[var(--color-accent)]">
                {r.analogy_side}
              </span>
              <span className="block text-[var(--text-sm)] text-[var(--color-ink-3)]">
                {r.note}
              </span>
            </span>
          </div>
        ))}
      </div>

      {lesson.breaks_down && (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)] px-4 py-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
          <strong className="font-medium text-[var(--color-urgent)]">
            Where it stops being true:{" "}
          </strong>
          {lesson.breaks_down}
        </p>
      )}
    </section>
  );
}

/* ---------------- Rung 3 · you build the picture ---------------- */
