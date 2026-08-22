"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Play } from "lucide-react";
import { useDictation, useSpeaker } from "@/lib/speech";
import { politeProps } from "@/lib/a11y";
import { Button } from "@/components/ui";
import type { Scene } from "./types";

export function Visualise({
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
          {...politeProps()}
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
