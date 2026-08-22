"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, Lock } from "lucide-react";
import { useAuth, useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { RUNG_BLURB, RUNG_LABEL, type Level } from "@/lib/types";
import { Roadmap } from "@/components/Roadmap";
import { ThemePicker } from "@/components/ThemePicker";
import { Button, Reveal } from "@/components/ui";

const TYPE_COPY: Record<string, string> = {
  THEORY: "Theory topic",
  PRACTICAL: "Practical skill",
  HYBRID: "Theory + practice",
};

export default function LearnPage() {
  const profile = useRequireProfile();
  const { session, ready } = useSession();
  const { profile: p } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  /** The roadmap is tall; collapsing it keeps the active level in reach. */
  const [mapOpen, setMapOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lastclass:mapOpen");
      if (saved !== null) setMapOpen(saved === "1");
    } catch {
      /* storage unavailable — default to open */
    }
  }, []);

  function toggleMap() {
    setMapOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("lastclass:mapOpen", next ? "1" : "0");
      } catch {
        /* storage unavailable — the choice lasts for this view */
      }
      return next;
    });
  }

  const overall = useMemo(() => {
    if (!session?.concepts.length) return 0;
    return (
      session.concepts.reduce((s, c) => s + c.mastery, 0) /
      session.concepts.length
    );
  }, [session]);

  if (!profile) return null;

  if (ready && !session) {
    return (
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[var(--color-ink-2)]">No topic loaded yet.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Choose a topic
          </Button>
        </div>
      </main>
    );
  }
  if (!session) return null;

  const done = session.levels.filter((l) => l.passed).length;
  const mastered = session.concepts.filter((c) => c.mastery >= 0.8).length;
  const current =
    session.levels.find((l) => !l.passed && l.unlocked) ?? session.levels[4];
  const shown = session.levels.find((l) => l.n === selected) ?? current;
  // Sessions saved before Teach was ungated would otherwise strand the learner.
  // Nothing is gated — sessions saved under the old rules open anyway.
  const enterable = true;

  return (
    <main className="flex-1 flex flex-col">
      {/* ---------- workspace header ---------- */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-paper-3)] px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="quiet"
            onClick={() => router.push("/")}
            aria-label="Change topic"
            className="!px-2"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-0">
            <span className="block text-[var(--text-lg)] font-medium leading-tight truncate">
              {session.topic}
            </span>
            <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)]">
              {TYPE_COPY[session.topicType]} · {session.concepts.length} concepts
            </span>
          </span>
        </div>

        {/* overall mastery — the one number that summarises the learner model */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemePicker />
          <div className="hidden sm:block text-right">
            <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)] leading-tight">
              Mastery
            </span>
            <span className="block text-[var(--text-sm)] text-[var(--color-accent)] font-medium leading-tight">
              {Math.round(overall * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-24 rounded-full bg-[var(--color-paper-3)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--color-accent)]"
              animate={{ width: `${Math.round(overall * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[15rem_1fr] items-start">
        {/* ---------- level rail ---------- */}
        <nav
          className="border-b lg:border-b-0 lg:border-r border-[var(--color-paper-3)] px-3 py-4 lg:h-full"
          aria-label="Levels"
        >
          <p className="px-2 mb-3 text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
            {done} of 5 done
          </p>
          <ol className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible">
            {session.levels.map((l) => (
              <RailItem
                key={l.n}
                level={l}
                active={shown.n === l.n}
                onSelect={() => setSelected(l.n)}
              />
            ))}
          </ol>
        </nav>

        {/* ---------- the map, always on screen ---------- */}
        <div className="px-5 py-6 sm:px-8">
          {session.depthNote && (
            <Reveal>
              <p className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 px-4 py-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
                {session.depthNote}
              </p>
            </Reveal>
          )}
          <Reveal>
            <section aria-label="Roadmap">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/40">
                <button
                  onClick={toggleMap}
                  aria-expanded={mapOpen}
                  aria-controls="roadmap-body"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)]/50 sm:px-5"
                >
                  <motion.span
                    animate={{ rotate: mapOpen ? 0 : -90 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="shrink-0 text-[var(--color-ink-3)]"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[var(--text-base)] font-medium text-[var(--color-ink)]">
                      Your roadmap
                    </span>
                    {!mapOpen && (
                      <span className="block text-[var(--text-sm)] text-[var(--color-ink-3)]">
                        {mastered} of {session.concepts.length} stops mastered
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[var(--text-sm)] text-[var(--color-ink-3)]">
                    {mapOpen ? "Hide" : "Show"}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {mapOpen && (
                    <motion.div
                      id="roadmap-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-4 pb-5 sm:px-5">
                        <Roadmap
                          concepts={session.concepts}
                          topic={session.topic}
                          level={session.detectedLevel ?? session.statedLevel}
                          interest={session.interest || undefined}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </Reveal>

          {/* ---------- the active level ---------- */}
          <Reveal delay={0.1}>
            <section className="mt-6" aria-label="Current level">
              <div
                className={
                  "rounded-[var(--radius-lg)] border p-6 " +
                  (enterable
                    ? "border-[var(--color-accent)] shadow-[var(--glow)]"
                    : "border-[var(--color-paper-4)]")
                }
              >
                <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                  Level {shown.n} · {RUNG_LABEL[shown.rung]}
                  {!enterable && " · Locked"}
                </span>
                <h3
                  className="mt-1.5 font-semibold tracking-[-0.02em] leading-snug text-balance"
                  style={{ fontSize: "var(--text-2xl)" }}
                >
                  {shown.title}
                </h3>
                <p className="mt-2 text-[var(--color-ink-2)] leading-relaxed">
                  {RUNG_BLURB[shown.rung]}
                </p>

                <div className="mt-5">
                  {!enterable ? (
                    <p className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
                      Finish level {shown.n - 1} to unlock this.
                    </p>
                  ) : shown.rung === "Teach" ? (
                    <Button onClick={() => router.push("/classroom")}>
                      Enter the classroom
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {shown.rung === "Understand" && <InterestCapture />}
                      <Button onClick={() => router.push(`/level/${shown.n}`)}>
                        {shown.passed ? "Do it again" : "Start level"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* which concepts this level touches */}
                {shown.conceptIds.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-[var(--color-paper-3)]">
                    <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)] mb-2">
                      Concepts in this level
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {shown.conceptIds.map((id) => {
                        const c = session.concepts.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <span
                            key={id}
                            className="rounded-[var(--radius-pill)] border border-[var(--color-paper-4)] px-3 py-1 text-[var(--text-xs)] text-[var(--color-ink-2)]"
                          >
                            {c.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </main>
  );
}

/**
 * Asked here rather than at intake, because this is the level where it's
 * actually used — the payoff is one line away instead of three screens back.
 * Saved to the profile too, so returning learners are only asked once.
 */
function InterestCapture() {
  const { session, setSession } = useSession();
  const { profile, update } = useAuth();
  const [value, setValue] = useState(profile?.interest ?? "");
  const saved = session?.interest ?? "";

  function save() {
    const v = value.trim();
    if (v.length < 2 || !session) return;
    update({ interest: v });
    setSession({ ...session, interest: v });
  }

  if (saved) {
    return (
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
          We&apos;ll build this level&apos;s comparisons out of{" "}
          <strong className="font-medium text-[var(--color-accent)]">
            {saved}
          </strong>
          .
        </p>
        <button
          onClick={() => session && setSession({ ...session, interest: "" })}
          className="mt-1.5 text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors duration-[var(--dur-fast)]"
        >
          Use something else
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="interest"
        className="block text-[var(--text-base)] font-medium text-[var(--color-ink)]"
      >
        What do you already know well?
      </label>
      <p className="mt-1 mb-3 text-[var(--text-sm)] text-[var(--color-ink-3)] leading-relaxed">
        This level explains the hard parts by comparing them to something
        familiar. Name a hobby, a job, a sport — anything you understand deeply.
      </p>
      <div className="flex gap-2 flex-wrap">
        <input
          id="interest"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Cricket, cooking, Formula 1…"
          className="flex-1 min-w-[12rem] rounded-[var(--radius-md)] bg-[var(--color-paper-2)] border border-[var(--color-paper-4)] px-4 py-2.5 text-[var(--text-base)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)] outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-[var(--color-accent)] focus:shadow-[var(--glow)]"
        />
        <Button onClick={save} disabled={value.trim().length < 2}>
          Save
        </Button>
      </div>
    </div>
  );
}

function RailItem({
  level,
  active,
  onSelect,
}: {
  level: Level;
  active: boolean;
  onSelect: () => void;
}) {
  const locked = false;

  return (
    <li className="shrink-0 lg:shrink">
      <button
        onClick={onSelect}
        aria-current={active ? "step" : undefined}
        className={
          "w-full flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left " +
          "transition-[background-color,color] duration-[var(--dur-fast)] " +
          (active
            ? "bg-[var(--color-paper-3)] "
            : "hover:bg-[var(--color-paper-2)] ") +
          (locked ? "opacity-50 " : "")
        }
      >
        <span
          className={
            "grid place-items-center size-6 shrink-0 rounded-full font-[family-name:var(--font-mono)] text-[0.6875rem] " +
            (level.passed
              ? "bg-[var(--color-accent)] text-[var(--on-accent)]"
              : active
                ? "bg-[var(--color-paper-4)] text-[var(--color-accent)]"
                : "bg-[var(--color-paper-3)] text-[var(--color-ink-3)]")
          }
        >
          {level.passed ? (
            <Check size={12} />
          ) : locked ? (
            <Lock size={10} />
          ) : (
            level.n
          )}
        </span>
        <span
          className={
            "text-[var(--text-sm)] leading-tight truncate " +
            (active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]")
          }
        >
          {RUNG_LABEL[level.rung]}
        </span>
      </button>
    </li>
  );
}
