"use client";

import { motion } from "framer-motion";
import { politeProps } from "@/lib/a11y";

export function Loading({ rung, topic }: { rung: string; topic: string }) {
  const copy: Record<string, string> = {
    Remember: `Drawing the board for ${topic}`,
    Understand: `Finding a comparison for ${topic}`,
    Internalize: `Setting the scene for ${topic}`,
    Apply: `Setting your task on ${topic}`,
  };

  // Chalk strokes sketching themselves — the wait shows what is being made.
  return (
    <div
      {...politeProps()}
      className="rounded-[var(--radius-lg)] border-[6px] p-6"
      style={{
        borderColor: "var(--board-frame)",
        background: "var(--board)",
      }}
    >
      <p
        className="mb-5 text-center text-[var(--text-base)]"
        style={{ color: "var(--chalk-2)" }}
      >
        {copy[rung]}
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          …
        </motion.span>
      </p>
      <svg viewBox="0 0 640 210" className="h-auto w-full" aria-hidden="true">
        {[
          "M 60 60 L 250 60 L 250 130 L 60 130 Z",
          "M 300 95 L 380 95",
          "M 400 60 L 590 60 L 590 130 L 400 130 Z",
          "M 120 165 L 520 165",
        ].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="var(--chalk-line)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.15 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0.15, 0.75, 0.75, 0.15] }}
            transition={{
              duration: 3.4,
              times: [0, 0.35, 0.75, 1],
              repeat: Infinity,
              delay: i * 0.32,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ---------------- Rung 2 · the analogy ---------------- */
