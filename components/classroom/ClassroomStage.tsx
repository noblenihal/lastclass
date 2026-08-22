"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CHARACTERS, type Doubt } from "@/lib/characters";
import { politeProps } from "@/lib/a11y";
import { Seat, type SeatState } from "@/components/Seat";

/**
 * The room itself: a backdrop generated for the subject, five students at
 * their desks, and one line saying what the room is currently doing. Every
 * piece of state it needs is derived by the page and passed in, so the stage
 * stays a view.
 */
export function ClassroomStage({
  room,
  doubts,
  status,
  seatState,
  severityOf,
  onOpenDoubt,
}: {
  /** Generated backdrop, or null while it is still being drawn. */
  room: string | null;
  doubts: Doubt[];
  status: string;
  seatState: (characterId: string) => SeatState;
  severityOf: (characterId: string) => 1 | 2 | 3;
  onOpenDoubt: (doubt: Doubt) => void;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/50 px-3 py-5"
      aria-label="The classroom"
    >
      {/* the room, dressed for this subject */}
      <AnimatePresence>
        {room && (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${room})` }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* keeps the students and text legible over any backdrop */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, var(--scrim-top), var(--scrim-bottom))",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap justify-center gap-1 sm:gap-3">
        {CHARACTERS.map((character) => {
          const raised = doubts.find(
            (d) => d.characterId === character.id && d.status === "raised",
          );
          return (
            <Seat
              key={character.id}
              character={character}
              state={seatState(character.id)}
              severity={severityOf(character.id)}
              onClick={raised ? () => onOpenDoubt(raised) : undefined}
            />
          );
        })}
      </div>

      <p
        {...politeProps()}
        className="relative mt-4 text-center text-[var(--text-sm)] text-[var(--color-ink-2)]"
      >
        {status}
      </p>
    </section>
  );
}
