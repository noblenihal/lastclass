"use client";

import { motion } from "framer-motion";
import type { Character } from "@/lib/characters";

export type SeatState = "idle" | "raised" | "deferred" | "speaking" | "satisfied";

/**
 * One student. The raised hand is the whole point: it's a detected gap
 * rendered as a physical object, and severity drives how insistently it waves.
 * A hand that stays up after "I'll tell you later" is visible unpaid debt.
 */
export function Seat({
  character,
  state,
  severity = 1,
  onClick,
}: {
  character: Character;
  state: SeatState;
  severity?: 1 | 2 | 3;
  onClick?: () => void;
}) {
  const up = state === "raised" || state === "deferred" || state === "speaking";
  const clickable = Boolean(onClick) && up;

  // higher severity = faster, wider wave
  const waveDur = severity === 3 ? 0.5 : severity === 2 ? 0.85 : 1.5;
  const waveDeg = severity === 3 ? 22 : severity === 2 ? 13 : 7;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      aria-label={`${character.name} — ${character.role}${up ? ", hand raised" : ""}`}
      className={
        "group relative flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-3 " +
        "transition-[background-color,box-shadow,opacity] duration-[var(--dur-mid)] ease-[var(--ease-out)] " +
        (clickable
          ? "cursor-pointer hover:bg-[var(--color-paper-3)] "
          : "cursor-default ") +
        (state === "speaking"
          ? "bg-[var(--color-paper-3)] shadow-[var(--glow)] "
          : "") +
        (state === "idle" ? "opacity-55 " : "opacity-100 ")
      }
    >
      {/* the hand */}
      <div className="relative h-7 w-full grid place-items-center">
        {up && (
          <motion.span
            initial={{ y: 14, opacity: 0, rotate: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: state === "deferred" ? [0, 4, -4, 0] : [0, waveDeg, -waveDeg, 0],
            }}
            transition={{
              y: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.24 },
              rotate: {
                duration: state === "deferred" ? 3.6 : waveDur,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            className="text-[1.15rem] leading-none origin-bottom"
            style={{
              filter:
                severity === 3 && state !== "deferred"
                  ? "drop-shadow(0 0 7px var(--color-urgent))"
                  : undefined,
            }}
          >
            ✋
          </motion.span>
        )}
      </div>

      {/* the student */}
      <motion.span
        animate={
          state === "speaking"
            ? { scale: [1, 1.09, 1] }
            : state === "satisfied"
              ? { scale: [1, 1.16, 1] }
              : { scale: 1 }
        }
        transition={{
          duration: state === "speaking" ? 1.1 : 0.44,
          repeat: state === "speaking" ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="text-[2rem] leading-none select-none"
      >
        {character.emoji}
      </motion.span>

      {/* desk */}
      <span
        className={
          "mt-0.5 h-[3px] w-11 rounded-full transition-colors duration-[var(--dur-mid)] " +
          (state === "deferred"
            ? "bg-[var(--color-urgent)]"
            : up
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-paper-4)]")
        }
      />

      <span className="text-[var(--text-xs)] font-medium text-[var(--color-ink-2)] leading-none">
        {character.name}
      </span>
      <span className="text-[0.625rem] text-[var(--color-ink-4)] leading-tight text-center max-w-[7.5rem]">
        {character.role}
      </span>
    </button>
  );
}
