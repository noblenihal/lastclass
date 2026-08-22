"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { politeProps } from "@/lib/a11y";
import { Button, ErrorNote } from "@/components/ui";
import type { Lesson } from "./types";

export function ApplyTask({
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
              alt="The photo of your attempt that will be marked"
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
          {...politeProps()}
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
