"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, Eye, Play, Volume2 } from "lucide-react";
import { useAuth, useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { useDictation, useSpeaker } from "@/lib/speech";
import { RUNGS, RUNG_LABEL } from "@/lib/types";
import { ThemePicker } from "@/components/ThemePicker";
import { LevelRail } from "@/components/LevelRail";
import { Button, ErrorNote, Eyebrow, Reveal } from "@/components/ui";
import { Check } from "@/components/lesson/Check";
import { InterestCapture } from "@/components/lesson/InterestCapture";
import { Loading } from "@/components/lesson/Loading";
import { Analogy } from "@/components/lesson/Analogy";
import { Visualise } from "@/components/lesson/Visualise";
import { ApplyTask } from "@/components/lesson/ApplyTask";
import type { Lesson } from "@/components/lesson/types";
import { Whiteboard, type Beat } from "@/components/lesson/Whiteboard";
import { politeProps, useMotionSafe } from "@/lib/a11y";


export default function LevelPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = use(params);
  const num = Math.min(4, Math.max(1, Number(n) || 1));
  const rung = RUNGS[num - 1];

  const profile = useRequireProfile();
  const { session, nudgeMastery, passLevel } = useSession();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  /** Rung 1 holds its question back until the board has been watched. */
  const [watched, setWatched] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          rung,
          topicType: session.topicType,
          level: session.statedLevel,
          detectedLevel: session.detectedLevel,
          interest: session.interest || undefined,
          concepts: session.concepts.map((c) => ({
            id: c.id,
            name: c.name,
            gist: c.gist,
            mastery: c.mastery,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not build this level.");
      setLesson(data as Lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [session, rung]);

  useEffect(() => {
    if (session && !lesson && loading) void load();
  }, [session, lesson, loading, load]);

  if (!profile) return null;
  if (!session) {
    return (
      <main id="main" className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[var(--color-ink-2)]">No topic loaded.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Choose a topic
          </Button>
        </div>
      </main>
    );
  }

  const level = session.levels.find((l) => l.n === num);
  const mastered = session.concepts.filter((c) => c.mastery >= 0.8).length;

  function finish(correct: boolean, conceptId: string) {
    nudgeMastery(conceptId, correct ? 0.3 : -0.1);
    if (correct) passLevel(num);
    router.push("/learn");
  }

  return (
    <main id="main" className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-paper-3)] px-5 py-3.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="quiet"
            onClick={() => router.push("/learn")}
            aria-label="Back to concept map"
            className="!px-2"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Button>
          <span className="min-w-0">
            <span className="block truncate text-[var(--text-lg)] font-medium leading-tight">
              {session.topic}
            </span>
            <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)]">
              Level {num} · {RUNG_LABEL[rung]}
            </span>
          </span>
        </div>
        <ThemePicker />
      </header>

      <div className="grid flex-1 items-start lg:grid-cols-[15rem_1fr]">
        <LevelRail
          levels={session.levels}
          active={num}
          mastered={mastered}
          total={session.concepts.length}
        />

        <div className="px-5 py-6 pb-20 sm:px-8">
        {loading && <Loading rung={rung} topic={session.topic} />}

        {error && !loading && (
          <div className="space-y-4">
            <ErrorNote>{error}</ErrorNote>
            <Button onClick={load}>Try again</Button>
          </div>
        )}

        {lesson && !loading && (
          <>
            <Reveal>
              <h1
                className="font-semibold leading-snug tracking-[-0.02em] text-balance"
                style={{ fontSize: "var(--text-display)" }}
              >
                {lesson.headline ?? level?.title ?? RUNG_LABEL[rung]}
              </h1>
              {rung === "Understand" && !session.interest && (
                <div className="mt-4">
                  <InterestCapture />
                </div>
              )}
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-7 space-y-6">
                {rung === "Remember" && lesson.beats && (
                  <Whiteboard
                    beats={lesson.beats as Beat[]}
                    topic={session.topic}
                    onFinished={() => setWatched(true)}
                  />
                )}
                {rung === "Understand" && lesson.mapping && (
                  <Analogy lesson={lesson} interest={session.interest} />
                )}
                {rung === "Internalize" && lesson.scenes && (
                  <Visualise
                    scenes={lesson.scenes}
                    topic={session.topic}
                    level={session.detectedLevel ?? session.statedLevel}
                  />
                )}
                {rung === "Apply" && lesson.mode && (
                  <ApplyTask
                    lesson={lesson}
                    topic={session.topic}
                    level={session.detectedLevel ?? session.statedLevel}
                    onGraded={(passed) => {
                      nudgeMastery(
                        lesson.concept_id ?? session.concepts[0].id,
                        passed ? 0.3 : -0.1,
                      );
                      if (passed) passLevel(num);
                    }}
                  />
                )}

                {lesson.check && (rung !== "Remember" || watched) && (
                  <Check check={lesson.check} onDone={finish} />
                )}
              </div>
            </Reveal>
          </>
        )}
        </div>
      </div>
    </main>
  );
}

/**
 * Asked on the Compare level, where the answer is used one line later.
 * Saved to the profile too, so returning learners are only asked once.
 */
