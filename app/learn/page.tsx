"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Lock } from "lucide-react";
import { useAuth, useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { RUNG_BLURB, RUNG_LABEL, type Level } from "@/lib/types";
import { MasteryGraph } from "@/components/MasteryGraph";
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
  const current =
    session.levels.find((l) => !l.passed && l.unlocked) ?? session.levels[4];
  const shown = session.levels.find((l) => l.n === selected) ?? current;

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
          <Reveal>
            <section aria-label="Concept map">
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h2 className="text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  Your concept map
                </h2>
                <span className="text-[var(--text-xs)] text-[var(--color-ink-3)]">
                  Updates as you learn
                </span>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/40 px-4 py-5">
                <MasteryGraph concepts={session.concepts} />
              </div>
            </section>
          </Reveal>

          {/* ---------- the active level ---------- */}
          <Reveal delay={0.1}>
            <section className="mt-6" aria-label="Current level">
              <div
                className={
                  "rounded-[var(--radius-lg)] border p-6 " +
                  (shown.unlocked
                    ? "border-[var(--color-accent)] shadow-[var(--glow)]"
                    : "border-[var(--color-paper-4)]")
                }
              >
                <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                  Level {shown.n} · {RUNG_LABEL[shown.rung]}
                  {!shown.unlocked && " · Locked"}
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
                  {!shown.unlocked ? (
                    <p className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
                      Finish level {shown.n - 1} to unlock this.
                    </p>
                  ) : shown.rung === "Teach" ? (
                    <Button onClick={() => router.push("/classroom")}>
                      Enter the classroom
                    </Button>
                  ) : (
                    <p className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
                      This level is being built. Level 5 is playable now —
                      {p?.name ? ` ${p.name}, ` : " "}
                      you can jump straight to teaching.
                    </p>
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

function RailItem({
  level,
  active,
  onSelect,
}: {
  level: Level;
  active: boolean;
  onSelect: () => void;
}) {
  const locked = !level.unlocked;

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
              ? "bg-[var(--color-accent)] text-[oklch(18%_0.02_55)]"
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
