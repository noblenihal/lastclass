"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { RUNG_BLURB, RUNG_LABEL, type Level } from "@/lib/types";
import { MasteryGraph } from "@/components/MasteryGraph";
import { Button, Eyebrow, Reveal } from "@/components/ui";

const TYPE_COPY: Record<string, string> = {
  THEORY: "Ideas topic — we'll lean on explanation and teaching.",
  PRACTICAL: "Skill topic — you'll have to actually do it and show your work.",
  HYBRID: "Both halves — understand it, then perform it.",
};

export default function LearnPage() {
  const profile = useRequireProfile();
  const { session, ready } = useSession();
  const router = useRouter();

  if (!profile) return null;

  if (ready && !session) {
    return (
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[var(--color-ink-2)]">No session yet.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Pick a topic
          </Button>
        </div>
      </main>
    );
  }

  if (!session) return null;

  const done = session.levels.filter((l) => l.passed).length;

  return (
    <main className="flex-1 px-6 py-6 sm:px-10">
      <header className="flex items-center justify-between mb-10">
        <Button variant="quiet" onClick={() => router.push("/")}>
          <ArrowLeft size={15} /> Topics
        </Button>
        <Eyebrow>
          {done} / 5 rungs
        </Eyebrow>
      </header>

      <div className="mx-auto max-w-[64rem]">
        <Reveal>
          <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
            {TYPE_COPY[session.topicType]}
          </span>
          <h1
            className="mt-2 font-semibold tracking-[-0.035em] leading-[1.05] text-balance"
            style={{ fontSize: "var(--text-display-s)" }}
          >
            {session.topic}
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/50 p-6">
            <h2 className="text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--color-ink-3)] mb-5">
              What it&apos;s made of
            </h2>
            <MasteryGraph concepts={session.concepts} />
          </section>
        </Reveal>

        <Reveal delay={0.2}>
          <section className="mt-10">
            <h2 className="text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--color-ink-3)] mb-2">
              Your 5 levels
            </h2>
            <p className="mb-5 text-[var(--text-sm)] text-[var(--color-ink-3)]">
              Finish a level to unlock the next one.
            </p>
            <ol className="space-y-3">
              {session.levels.map((l) => (
                <LevelRow
                  key={l.n}
                  level={l}
                  onOpen={
                    l.rung === "Teach"
                      ? () => router.push("/classroom")
                      : undefined
                  }
                />
              ))}
            </ol>
          </section>
        </Reveal>
      </div>
    </main>
  );
}

function LevelRow({
  level,
  onOpen,
}: {
  level: Level;
  onOpen?: () => void;
}) {
  const locked = !level.unlocked;
  const ready = !locked && Boolean(onOpen);

  return (
    <li>
      <div
        className={
          "group flex items-center gap-5 rounded-[var(--radius-md)] border px-5 py-4 transition-[background-color,border-color,box-shadow] duration-[var(--dur-mid)] ease-[var(--ease-out)] " +
          (locked
            ? "border-[var(--color-paper-3)] bg-transparent opacity-55"
            : "border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 hover:border-[var(--color-accent)] hover:shadow-[var(--glow)]")
        }
      >
        <span
          className={
            "grid place-items-center size-9 shrink-0 rounded-full font-[family-name:var(--font-mono)] text-[var(--text-sm)] " +
            (level.passed
              ? "bg-[var(--color-accent)] text-[oklch(18%_0.02_55)]"
              : locked
                ? "bg-[var(--color-paper-3)] text-[var(--color-ink-4)]"
                : "bg-[var(--color-paper-4)] text-[var(--color-accent)]")
          }
        >
          {level.passed ? <Check size={16} /> : locked ? <Lock size={13} /> : level.n}
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-[var(--text-lg)] font-medium text-[var(--color-ink)] leading-snug">
            {RUNG_LABEL[level.rung]}: {level.title}
          </span>
          <span className="block mt-0.5 text-[var(--text-sm)] text-[var(--color-ink-3)]">
            {RUNG_BLURB[level.rung]}
          </span>
        </span>

        {ready ? (
          <Button onClick={onOpen} className="shrink-0 !px-4 !py-2">
            Start
          </Button>
        ) : locked ? (
          <span className="shrink-0 text-[var(--text-sm)] text-[var(--color-ink-4)]">
            Locked
          </span>
        ) : (
          <span className="shrink-0 text-[var(--text-sm)] text-[var(--color-ink-4)]">
            Coming soon
          </span>
        )}
      </div>
    </li>
  );
}
