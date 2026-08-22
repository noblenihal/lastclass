"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { useMotionSafe } from "@/lib/a11y";
import { LevelRail } from "@/components/LevelRail";
import { Roadmap } from "@/components/Roadmap";
import { ThemePicker } from "@/components/ThemePicker";
import { Button, Reveal } from "@/components/ui";

const TYPE_COPY: Record<string, string> = {
  THEORY: "Theory topic",
  PRACTICAL: "Practical skill",
  HYBRID: "Theory + practice",
};

/** The concept map. Levels live on their own pages, reached from the rail. */
export default function LearnPage() {
  const profile = useRequireProfile();
  const { session, ready } = useSession();
  const router = useRouter();
  const motion$ = useMotionSafe();

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
      <main id="main" className="flex-1 grid place-items-center px-6">
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

  const mastered = session.concepts.filter((c) => c.mastery >= 0.8).length;

  return (
    <main id="main" className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-paper-3)] px-5 py-3.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="quiet"
            onClick={() => router.push("/")}
            aria-label="Change topic"
            className="!px-2"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <span className="min-w-0">
            <span className="block truncate text-[var(--text-lg)] font-medium leading-tight">
              {session.topic}
            </span>
            <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)]">
              {TYPE_COPY[session.topicType]} · {session.concepts.length} concepts
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemePicker />
          <div className="hidden text-right sm:block">
            <span className="block text-[var(--text-xs)] leading-tight text-[var(--color-ink-3)]">
              Mastery
            </span>
            <span className="block text-[var(--text-sm)] font-medium leading-tight text-[var(--color-accent)]">
              {Math.round(overall * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-paper-3)]">
            <motion.div
              className="h-full rounded-full bg-[var(--color-accent)]"
              animate={{ width: `${Math.round(overall * 100)}%` }}
              transition={{ duration: motion$.dur(0.8), ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </header>

      <div className="grid flex-1 items-start lg:grid-cols-[15rem_1fr]">
        <LevelRail
          levels={session.levels}
          active="map"
          mastered={mastered}
          total={session.concepts.length}
        />

        <div className="px-5 py-6 sm:px-8">
          {session.depthNote && (
            <Reveal>
              <p className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 px-4 py-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
                {session.depthNote}
              </p>
            </Reveal>
          )}

          <Reveal>
            <section aria-label="Concept map">
              <h1
                className="font-semibold tracking-[-0.02em]"
                style={{ fontSize: "var(--text-display-s)" }}
              >
                Concept map
              </h1>
              <p className="mt-1 text-[var(--color-ink-2)]">
                Everything {session.topic} is made of. Pick a level on the left
                to start learning.
              </p>

              <div className="mt-5">
                <Roadmap
                  concepts={session.concepts}
                  topic={session.topic}
                  level={session.detectedLevel ?? session.statedLevel}
                  interest={session.interest || undefined}
                />
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
