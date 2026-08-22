"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check as CheckIcon, X } from "lucide-react";
import { Button } from "@/components/ui";

export interface CheckData {
  question: string;
  options: string[];
  correct_index: number;
  why: string;
  concept_id: string;
}

/**
 * The gate at the end of every rung. Answering is what moves the learner
 * model — a wrong answer costs mastery, so guessing is not free.
 */
export function Check({
  check,
  onDone,
}: {
  check: CheckData;
  onDone: (correct: boolean, conceptId: string) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === check.correct_index;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 p-6">
      <h3 className="text-[var(--text-lg)] font-medium leading-snug text-[var(--color-ink)]">
        {check.question}
      </h3>

      <div className="mt-4 grid gap-2">
        {check.options.map((opt, i) => {
          const chosen = picked === i;
          const isAnswer = i === check.correct_index;
          const settled = picked !== null;
          return (
            <button
              key={i}
              disabled={settled}
              onClick={() => setPicked(i)}
              className={
                "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-[var(--text-base)] transition-[border-color,background-color] duration-[var(--dur-fast)] " +
                (!settled
                  ? "border-[var(--color-paper-4)] bg-[var(--color-paper-2)] hover:border-[var(--color-accent)]"
                  : isAnswer
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-ghost)]"
                    : chosen
                      ? "border-[var(--color-urgent)] bg-[var(--color-urgent-ghost)]"
                      : "border-[var(--color-paper-3)] opacity-55")
              }
            >
              <span className="mt-0.5 shrink-0 font-[family-name:var(--font-mono)] text-[var(--text-xs)] text-[var(--color-ink-3)]">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1 text-[var(--color-ink)]">
                {opt}
              </span>
              {settled && isAnswer && (
                <CheckIcon size={15} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
              )}
              {settled && chosen && !isAnswer && (
                <X size={15} className="mt-0.5 shrink-0 text-[var(--color-urgent)]" />
              )}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-5"
        >
          <p className="text-[var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
            <strong
              className={
                "font-medium " +
                (correct
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-urgent)]")
              }
            >
              {correct ? "That's it. " : "Not quite. "}
            </strong>
            {check.why}
          </p>
          <Button
            className="mt-4"
            onClick={() => onDone(correct, check.concept_id)}
          >
            {correct ? "Finish this level" : "Continue anyway"}
          </Button>
        </motion.div>
      )}
    </section>
  );
}
