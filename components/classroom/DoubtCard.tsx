"use client";

import { motion } from "framer-motion";
import { Sparkles, Volume2 } from "lucide-react";
import { MENTOR, byId, type Doubt, type MentorNote } from "@/lib/characters";
import { useDictation } from "@/lib/speech";
import { politeProps } from "@/lib/a11y";
import { Button, ErrorNote } from "@/components/ui";
import { VoicePad } from "@/components/classroom/VoicePad";

/**
 * One student's question, and everything the learner can do about it.
 *
 * Four choices, and each has a real consequence recorded elsewhere: answer it,
 * consult the Master (which halves what the answer earns), skip it (the hand
 * stays up as debt), or end the class.
 */
export function DoubtCard({
  doubt,
  answer,
  reply,
  note,
  speaking,
  busy,
  asking,
  typed,
  error,
  hasMoreRaised,
  pendingFrom,
  setTyped,
  onExplain,
  onAskMaster,
  onDefer,
  onEndClass,
  onNext,
}: {
  doubt: Doubt;
  answer: ReturnType<typeof useDictation>;
  /** The character's spoken reaction, once they have judged the answer. */
  reply: string | null;
  /** The Master's note, if the learner asked for it. */
  note: MentorNote | null;
  speaking: boolean;
  busy: boolean;
  asking: boolean;
  typed: boolean;
  error: string;
  hasMoreRaised: boolean;
  /** Set when this same character is about to press again. */
  pendingFrom: string | null;
  setTyped: (v: boolean) => void;
  onExplain: () => void;
  onAskMaster: () => void;
  onDefer: () => void;
  onEndClass: () => void;
  onNext: () => void;
}) {
  const character = byId(doubt.characterId);
  const pressing = (doubt.depth ?? 0) > 0;

  return (
    <motion.section
      key={doubt.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8"
    >
      <div
        {...politeProps()}
        className={
          "rounded-[var(--radius-lg)] border p-6 " +
          (doubt.severity === 3
            ? "border-[var(--color-urgent)] shadow-[var(--glow-urgent)]"
            : "border-[var(--color-accent)] shadow-[var(--glow)]")
        }
      >
        <div className="flex items-start gap-4">
          <span className="shrink-0 text-[2rem] leading-none">
            {character.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
              {character.name}
              {speaking && (
                <Volume2
                  size={13}
                  aria-label="speaking"
                  className="text-[var(--color-accent)]"
                />
              )}
            </span>
            {pressing && (
              <span className="mt-1 inline-block rounded-[var(--radius-pill)] bg-[var(--color-urgent-ghost)] px-2.5 py-0.5 text-[var(--text-xs)] text-[var(--color-urgent)]">
                Pressing again · attempt {(doubt.depth ?? 0) + 1}
              </span>
            )}
            <p className="mt-1.5 text-[var(--text-xl)] leading-snug text-[var(--color-ink)]">
              {doubt.question}
            </p>
          </div>
        </div>

        {reply ? (
          <div className="mt-6">
            <p className="text-[var(--text-lg)] italic text-[var(--color-ink-2)]">
              &ldquo;{reply}&rdquo;
            </p>
            <Button className="mt-5 w-full" onClick={onNext}>
              {pendingFrom
                ? `${pendingFrom} isn't satisfied — hear them out`
                : hasMoreRaised
                  ? "Next question"
                  : "Back to class"}
            </Button>
          </div>
        ) : (
          <>
            {note && <MasterNote note={note} askedBy={character.name} />}

            <VoicePad
              dictation={answer}
              typed={typed}
              setTyped={setTyped}
              placeholder="Type or speak your answer…"
            />
            <ErrorNote>{error}</ErrorNote>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button onClick={onExplain} loading={busy}>
                Explain
              </Button>
              <Button
                variant="ghost"
                onClick={onAskMaster}
                loading={asking}
                disabled={busy || Boolean(note)}
              >
                <Sparkles size={14} aria-hidden="true" />
                {note ? "Asked" : "Ask the Master"}
              </Button>
              <Button variant="ghost" onClick={onDefer} disabled={busy}>
                Skip for now
              </Button>
              <Button variant="quiet" onClick={onEndClass} disabled={busy}>
                End class
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}

/** What the Master hands the learner — read, never spoken to the student. */
function MasterNote({ note, askedBy }: { note: MentorNote; askedBy: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
      className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-3)]/50 p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[1.25rem] leading-none">{MENTOR.emoji}</span>
        <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
          {MENTOR.name} — for your eyes only
        </span>
      </div>

      <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--color-ink)]">
        {note.answer}
      </p>

      {note.keyPoints.length > 0 && (
        <div className="mt-4">
          <span className="mb-1.5 block text-[var(--text-xs)] text-[var(--color-ink-3)]">
            Your answer needs to hit
          </span>
          <ul className="space-y-1">
            {note.keyPoints.map((point, i) => (
              <li
                key={i}
                className="flex gap-2 text-[var(--text-sm)] text-[var(--color-ink-2)]"
              >
                <span className="text-[var(--color-accent)]">·</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[var(--text-sm)] text-[var(--color-ink-2)]">
        <span className="text-[var(--color-urgent)]">Watch out:</span>{" "}
        {note.watchOut}
      </p>

      <p className="mt-4 border-t border-[var(--color-paper-4)] pt-4 text-[var(--text-sm)] text-[var(--color-ink-3)]">
        Now tell {askedBy} yourself — in your own words, not the Master&apos;s.
        This one counts for half.
      </p>
    </motion.div>
  );
}
