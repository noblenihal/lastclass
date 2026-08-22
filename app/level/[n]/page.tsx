"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, Eye, Play, Volume2 } from "lucide-react";
import { useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { useDictation, useSpeaker } from "@/lib/speech";
import { RUNGS, RUNG_LABEL } from "@/lib/types";
import { ThemePicker } from "@/components/ThemePicker";
import { Button, ErrorNote, Eyebrow, Reveal } from "@/components/ui";
import { Check, type CheckData } from "@/components/lesson/Check";
import { Whiteboard, type Beat } from "@/components/lesson/Whiteboard";

interface Row {
  concept_id: string;
  concept_side: string;
  analogy_side: string;
  note: string;
}
interface Scene {
  concept_id: string;
  narration: string;
  cue: string;
  prompt: string;
  answer: string;
}
interface Lesson {
  headline?: string;
  premise?: string;
  breaks_down?: string;
  beats?: Beat[];
  mapping?: Row[];
  scenes?: Scene[];
  mode?: "CAMERA" | "DIAGNOSE";
  brief?: string;
  artifact?: string;
  rubric?: string[];
  concept_id?: string;
  check?: CheckData;
}

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
      <main className="flex-1 grid place-items-center px-6">
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

  function finish(correct: boolean, conceptId: string) {
    nudgeMastery(conceptId, correct ? 0.3 : -0.1);
    if (correct) passLevel(num);
    router.push("/learn");
  }

  return (
    <main className="flex-1 px-5 py-5 sm:px-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Button variant="quiet" onClick={() => router.push("/learn")}>
          <ArrowLeft size={15} /> Back
        </Button>
        <div className="flex items-center gap-3">
          <Eyebrow>
            Level {num} · {RUNG_LABEL[rung]}
          </Eyebrow>
          <ThemePicker />
        </div>
      </header>

      <div className="mx-auto max-w-[46rem] pb-16">
        {loading && <Loading rung={rung} />}

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
    </main>
  );
}

function Loading({ rung }: { rung: string }) {
  const copy: Record<string, string> = {
    Remember: "Drawing the board…",
    Understand: "Finding the right comparison…",
    Internalize: "Setting the scene…",
    Apply: "Setting your task…",
  };
  return (
    <div className="space-y-4">
      <p className="text-[var(--color-ink-2)]">{copy[rung]}</p>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-14 rounded-[var(--radius-md)] bg-[var(--color-paper-2)]"
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

/* ---------------- Rung 2 · the analogy ---------------- */
function Analogy({ lesson, interest }: { lesson: Lesson; interest: string }) {
  return (
    <section className="space-y-4">
      <p className="text-[var(--text-lg)] leading-relaxed text-[var(--color-ink-2)]">
        {lesson.premise}
      </p>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-paper-4)]">
        <div className="grid grid-cols-2 border-b border-[var(--color-paper-4)] bg-[var(--color-paper-3)]/60 text-[var(--text-xs)] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
          <span className="px-4 py-2">The real thing</span>
          <span className="border-l border-[var(--color-paper-4)] px-4 py-2">
            {interest || "Something familiar"}
          </span>
        </div>
        {lesson.mapping?.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-2 border-b border-[var(--color-paper-3)] last:border-0"
          >
            <span className="px-4 py-3 text-[var(--text-base)] text-[var(--color-ink)]">
              {r.concept_side}
            </span>
            <span className="border-l border-[var(--color-paper-3)] px-4 py-3">
              <span className="block text-[var(--text-base)] text-[var(--color-accent)]">
                {r.analogy_side}
              </span>
              <span className="block text-[var(--text-sm)] text-[var(--color-ink-3)]">
                {r.note}
              </span>
            </span>
          </div>
        ))}
      </div>

      {lesson.breaks_down && (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)] px-4 py-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
          <strong className="font-medium text-[var(--color-urgent)]">
            Where it stops being true:{" "}
          </strong>
          {lesson.breaks_down}
        </p>
      )}
    </section>
  );
}

/* ---------------- Rung 3 · you build the picture ---------------- */
function Visualise({
  scenes,
  topic,
  level,
}: {
  scenes: Scene[];
  topic: string;
  level: string;
}) {
  const [i, setI] = useState(-1);
  const [phase, setPhase] = useState<"idle" | "listening" | "describing" | "reply">("idle");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const speaker = useSpeaker();
  const dictation = useDictation();
  const scene = i >= 0 ? scenes[i] : null;

  async function begin() {
    setI(0);
    setPhase("listening");
    await speaker.speak(scenes[0].narration, "Kore");
    await speaker.speak(scenes[0].prompt, "Kore");
    setPhase("describing");
  }

  async function describe() {
    if (!scene) return;
    const said = dictation.transcript.trim();
    if (said.length < 4) return;
    setBusy(true);
    dictation.stop();
    try {
      const res = await fetch("/api/lesson/steer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          scene: scene.narration,
          prompt: scene.prompt,
          described: said,
          level,
        }),
      });
      const data = await res.json();
      const text = res.ok ? data.reply : scene.answer;
      setReply(text);
      setPhase("reply");
      await speaker.speak(text, "Kore");
    } catch {
      setReply(scene.answer);
      setPhase("reply");
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    dictation.reset();
    setReply("");
    const j = i + 1;
    if (j >= scenes.length) {
      setI(scenes.length);
      setOrder([...scenes.map((s) => s.cue)].sort(() => 0.5 - Math.random()));
      return;
    }
    setI(j);
    setPhase("listening");
    await speaker.speak(scenes[j].narration, "Kore");
    await speaker.speak(scenes[j].prompt, "Kore");
    setPhase("describing");
  }

  // final: rebuild the walk from memory
  if (i >= scenes.length) {
    const correct = order.every((c, k) => c === scenes[k].cue);
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 p-6">
        <h3 className="text-[var(--text-lg)] font-medium">
          Open your eyes. Put the walk back in order.
        </h3>
        <p className="mt-1 text-[var(--text-sm)] text-[var(--color-ink-3)]">
          Tap two to swap them.
        </p>
        <ol className="mt-4 space-y-2">
          {order.map((cue, k) => (
            <li key={cue}>
              <button
                onClick={() => {
                  const next = [...order];
                  const up = k === 0 ? 0 : k - 1;
                  [next[k], next[up]] = [next[up], next[k]];
                  setOrder(next);
                }}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] px-4 py-3 text-left transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)]"
              >
                <span className="font-[family-name:var(--font-mono)] text-[var(--text-xs)] text-[var(--color-ink-3)]">
                  {k + 1}
                </span>
                <span className="text-[var(--color-ink)]">{cue}</span>
              </button>
            </li>
          ))}
        </ol>
        <p
          className={
            "mt-4 text-[var(--text-sm)] " +
            (correct
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-ink-3)]")
          }
        >
          {correct
            ? "That's the walk, in order. You can retrace it without the page."
            : "Not the order you walked it. Keep moving them."}
        </p>
      </section>
    );
  }

  if (i < 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 p-6 text-center">
        <Eye size={22} className="mx-auto text-[var(--color-accent)]" />
        <h3 className="mt-3 text-[var(--text-lg)] font-medium">
          Close your eyes and listen.
        </h3>
        <p className="mx-auto mt-2 max-w-[26rem] text-[var(--color-ink-2)] leading-relaxed">
          You&apos;ll be walked through {scenes.length} scenes. After each one
          you say what you can see — the picture is yours to build, and it gets
          steered as you go.
        </p>
        <Button className="mt-5" onClick={begin}>
          <Play size={15} /> Begin
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-paper-2)]/60 p-6 shadow-[var(--glow)]">
      <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
        Scene {i + 1} of {scenes.length}
      </span>

      <AnimatePresence mode="wait">
        <motion.p
          key={`${i}-${phase}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-3 text-[var(--text-lg)] leading-relaxed text-[var(--color-ink)]"
        >
          {phase === "reply" ? reply : scene?.narration}
        </motion.p>
      </AnimatePresence>

      {phase === "describing" && scene && (
        <>
          <p className="mt-4 text-[var(--text-base)] text-[var(--color-accent)]">
            {scene.prompt}
          </p>
          <textarea
            value={dictation.transcript}
            onChange={(e) => dictation.setManual(e.target.value)}
            rows={3}
            placeholder="Say what you can see…"
            className="mt-3 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dictation.supported && (
              <Button
                variant="ghost"
                onClick={dictation.listening ? dictation.stop : dictation.start}
              >
                {dictation.listening ? "Stop" : "Speak"}
              </Button>
            )}
            <Button onClick={describe} loading={busy}>
              That&apos;s what I see
            </Button>
          </div>
        </>
      )}

      {phase === "reply" && (
        <Button className="mt-5" onClick={next}>
          {i + 1 >= scenes.length ? "Open your eyes" : "Next scene"}
        </Button>
      )}
    </section>
  );
}

/* ---------------- Rung 4 · do it, be graded ---------------- */
function ApplyTask({
  lesson,
  topic,
  level,
  onGraded,
}: {
  lesson: Lesson;
  topic: string;
  level: string;
  onGraded: (passed: boolean) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    passed: boolean;
    failed_step: string;
    feedback: string;
    rubric_results: { line: string; met: boolean; note: string }[];
  } | null>(null);

  const camera = lesson.mode === "CAMERA";

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          mode: lesson.mode,
          brief: lesson.brief,
          artifact: lesson.artifact,
          rubric: lesson.rubric ?? [],
          level,
          answer: answer.trim() || undefined,
          image: image ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not grade that.");
      setResult(data);
      onGraded(Boolean(data.passed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <p className="text-[var(--text-lg)] leading-relaxed text-[var(--color-ink-2)]">
        {lesson.brief}
      </p>

      {!camera && lesson.artifact && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] p-5 font-[family-name:var(--font-mono)] text-[var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
          {lesson.artifact}
        </pre>
      )}

      {lesson.rubric && lesson.rubric.length > 0 && (
        <div>
          <span className="block text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
            You&apos;ll be graded on
          </span>
          <ul className="mt-2 space-y-1">
            {lesson.rubric.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 text-[var(--text-sm)] text-[var(--color-ink-2)]"
              >
                <span className="text-[var(--color-accent)]">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {camera ? (
        <div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-paper-4)] px-6 py-8 text-center transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)]">
            <Camera size={22} className="text-[var(--color-accent)]" />
            <span className="text-[var(--text-base)] text-[var(--color-ink)]">
              {image ? "Photo added — tap to replace" : "Photograph your attempt"}
            </span>
            <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
              {lesson.artifact}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 8_000_000)
                  return setError("That image is too large. Try under 8MB.");
                const r = new FileReader();
                r.onload = () => setImage(String(r.result));
                r.readAsDataURL(f);
              }}
            />
          </label>
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={image}
              alt="Your attempt"
              className="mt-3 max-h-72 w-full rounded-[var(--radius-md)] object-contain"
            />
          )}
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={5}
          placeholder="What's wrong with it, and why?"
          className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
        />
      )}

      <ErrorNote>{error}</ErrorNote>

      {!result && (
        <Button onClick={submit} loading={busy} className="w-full">
          {busy ? "Marking…" : "Submit for marking"}
        </Button>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={
            "rounded-[var(--radius-lg)] border p-5 " +
            (result.passed
              ? "border-[var(--color-accent)] bg-[var(--color-accent-ghost)]"
              : "border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)]")
          }
        >
          <span
            className={
              "text-[var(--text-xs)] uppercase tracking-[0.14em] " +
              (result.passed
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-urgent)]")
            }
          >
            {result.passed ? "Passed" : "Not yet"}
          </span>
          {result.failed_step && (
            <p className="mt-1.5 text-[var(--text-lg)] font-medium text-[var(--color-ink)]">
              {result.failed_step}
            </p>
          )}
          <p className="mt-2 leading-relaxed text-[var(--color-ink-2)]">
            {result.feedback}
          </p>
          <ul className="mt-4 space-y-1.5">
            {result.rubric_results?.map((r, i) => (
              <li key={i} className="flex gap-2 text-[var(--text-sm)]">
                <span
                  className={
                    r.met
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-urgent)]"
                  }
                >
                  {r.met ? "✓" : "✕"}
                </span>
                <span className="text-[var(--color-ink-2)]">
                  {r.line} — {r.note}
                </span>
              </li>
            ))}
          </ul>
          {!result.passed && (
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setResult(null);
                setImage(null);
                setAnswer("");
              }}
            >
              Try again
            </Button>
          )}
        </motion.div>
      )}
    </section>
  );
}
