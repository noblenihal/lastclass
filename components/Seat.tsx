"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Character } from "@/lib/characters";

export type SeatState = "idle" | "raised" | "deferred" | "speaking" | "satisfied";

/** Which drawn pose to show for each state. */
const POSE: Record<SeatState, string> = {
  idle: "idle",
  raised: "raised",
  deferred: "deferred",
  speaking: "raised",
  satisfied: "satisfied",
};

/**
 * One student at their desk.
 *
 * The raised arm is drawn into the character art rather than composited, so
 * the pose reads as one illustration. Severity drives how insistently the
 * whole child leans and rocks — a fundamental misunderstanding is visibly
 * more agitated than a small clarification.
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
  const up = state === "raised" || state === "speaking";
  const clickable = Boolean(onClick) && (up || state === "deferred");

  const rock = severity === 3 ? 3.2 : severity === 2 ? 2 : 1.2;
  const rockDur = severity === 3 ? 0.6 : severity === 2 ? 1 : 1.6;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      aria-label={`${character.name} — ${character.role}${
        up ? ", hand up" : state === "deferred" ? ", still waiting" : ""
      }`}
      className={
        "group relative flex w-[7.5rem] shrink-0 flex-col items-center sm:w-[8.5rem] " +
        (clickable ? "cursor-pointer" : "cursor-default")
      }
    >
      {/* the student */}
      <motion.div
        className="relative z-10 h-[7rem] w-[7rem] sm:h-[8rem] sm:w-[8rem]"
        animate={
          up
            ? { rotate: [-rock, rock, -rock], y: 0 }
            : state === "deferred"
              ? { rotate: [-0.6, 0.6, -0.6], y: 3 }
              : { rotate: 0, y: 0 }
        }
        transition={{
          rotate: {
            duration: state === "deferred" ? 4.5 : rockDur,
            repeat: up || state === "deferred" ? Infinity : 0,
            ease: "easeInOut",
          },
          y: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        }}
        style={{ transformOrigin: "50% 90%" }}
      >
        <Image
          src={`/cast/${character.id}-${POSE[state]}.png`}
          alt=""
          fill
          sizes="136px"
          className={
            "object-contain object-bottom transition-[filter,opacity] duration-[var(--dur-mid)] " +
            (state === "idle"
              ? "opacity-80"
              : state === "deferred"
                ? "opacity-95 drop-shadow-[0_0_14px_var(--color-urgent-ghost)]"
                : "opacity-100") +
            (state === "speaking"
              ? " drop-shadow-[0_0_20px_oklch(74%_0.17_58/0.55)]"
              : up && severity === 3
                ? " drop-shadow-[0_0_16px_oklch(66%_0.19_18/0.5)]"
                : "")
          }
          priority={false}
        />
      </motion.div>

      {/* the desk — drawn, so the students sit behind furniture */}
      <div className="relative -mt-5 w-full">
        <div
          className={
            "h-3 w-full rounded-t-[3px] transition-colors duration-[var(--dur-mid)] " +
            (state === "deferred"
              ? "bg-[oklch(58%_0.11_38)]"
              : "bg-[oklch(52%_0.075_58)]")
          }
        />
        <div className="h-8 w-full rounded-b-[4px] bg-[oklch(38%_0.055_55)]" />
        {/* legs */}
        <div className="mx-auto flex w-[78%] justify-between">
          <span className="h-5 w-[3px] rounded-b bg-[oklch(30%_0.04_55)]" />
          <span className="h-5 w-[3px] rounded-b bg-[oklch(30%_0.04_55)]" />
        </div>
      </div>

      {/* nameplate on the desk */}
      <span className="relative -mt-[2.6rem] z-20 max-w-full truncate rounded-[3px] bg-[oklch(96%_0.02_75)] px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-[oklch(28%_0.04_55)] shadow-sm">
        {character.name}
      </span>

      {/* role, only when this seat matters */}
      <span
        className={
          "mt-3 px-1 text-center text-[0.625rem] leading-tight transition-opacity duration-[var(--dur-mid)] " +
          (state === "idle"
            ? "text-[var(--color-ink-4)] opacity-0 group-hover:opacity-100"
            : "text-[var(--color-ink-3)] opacity-100")
        }
      >
        {character.role}
      </span>
    </button>
  );
}
