"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, LogOut } from "lucide-react";
import { useAuth, useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import {
  LEVEL_CHOICES,
  RUNGS,
  RUNG_BLURB,
  RUNG_LABEL,
  type LearnerLevel,
  type Session,
} from "@/lib/types";
import { Button, ErrorNote, Eyebrow, Field, Reveal } from "@/components/ui";

export default function HomePage() {
  const profile = useRequireProfile();
  const { signOut, update } = useAuth();
  const { session, setSession } = useSession();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [interest, setInterest] = useState("");
  const [level, setLevel] = useState<LearnerLevel>("BASIC");
  const [sample, setSample] = useState("");
  const [showSample, setShowSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!profile) return null;

  async function build(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (topic.trim().length < 2) return setError("Enter a topic first.");
    if (interest.trim().length < 2)
      return setError("Enter a hobby or interest so we can build analogies.");

    setBusy(true);
    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          interest: interest.trim(),
          level,
          sample: sample.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      update({ interest: interest.trim() });
      setSession(data.session as Session);
      router.push("/learn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Eyebrow>LastClass</Eyebrow>
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
            {profile.name}
          </span>
          <Button variant="quiet" onClick={signOut} aria-label="Sign out">
            <LogOut size={15} />
          </Button>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-[52rem] grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16 items-start">
          {/* ---- the form ---- */}
          <div>
            <Reveal>
              <h1
                className="font-semibold tracking-[-0.02em] leading-[1.15]"
                style={{ fontSize: "var(--text-display)" }}
              >
                What do you want to learn?
              </h1>
              <p className="mt-3 text-[var(--text-lg)] text-[var(--color-ink-2)] leading-relaxed">
                We&apos;ll break your topic into concepts and build 5 levels —
                ending with you teaching it to a class that asks questions.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <form onSubmit={build} className="mt-8 space-y-6">
                <Field
                  label="Topic you want to learn"
                  hint="Anything — a concept, a skill, an exam subject."
                  placeholder="Recursion, photosynthesis, tying a bowline…"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Field
                  label="A hobby or interest of yours"
                  hint="We use this to explain hard parts with analogies you'll get."
                  placeholder="Cricket, cooking, Formula 1…"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />

                {/* how much they already know */}
                <fieldset>
                  <legend className="block text-[var(--text-base)] font-medium text-[var(--color-ink)] mb-2">
                    How deep should we go?
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {LEVEL_CHOICES.map((c) => {
                      const on = level === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setLevel(c.value)}
                          aria-pressed={on}
                          className={
                            "rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] " +
                            (on
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-ghost)] shadow-[var(--glow)]"
                              : "border-[var(--color-paper-4)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink-4)]")
                          }
                        >
                          <span
                            className={
                              "block text-[var(--text-base)] font-medium leading-tight " +
                              (on
                                ? "text-[var(--color-accent)]"
                                : "text-[var(--color-ink)]")
                            }
                          >
                            {c.label}
                          </span>
                          <span className="block mt-0.5 text-[var(--text-xs)] text-[var(--color-ink-3)] leading-snug">
                            {c.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* optional: let the writing speak instead of the self-rating */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSample(!showSample)}
                    className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--color-accent)] hover:text-[var(--color-accent-hot)] transition-colors duration-[var(--dur-fast)]"
                  >
                    <FileText size={14} />
                    {showSample
                      ? "Hide writing sample"
                      : "Or paste something you've written about it"}
                  </button>
                  {showSample && (
                    <div className="mt-3">
                      <p className="mb-2 text-[var(--text-sm)] text-[var(--color-ink-3)] leading-relaxed">
                        Paste your notes, an answer you wrote, or material
                        you&apos;ve been studying. We&apos;ll read it to work out
                        what you actually understand — and start your map with
                        real values instead of zeros.
                      </p>
                      <textarea
                        value={sample}
                        onChange={(e) => setSample(e.target.value)}
                        rows={6}
                        placeholder="Paste your notes or an explanation you've written…"
                        className="w-full resize-none rounded-[var(--radius-md)] bg-[var(--color-paper-2)] border border-[var(--color-paper-4)] px-4 py-3 text-[var(--text-base)] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)] outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-[var(--color-accent)] focus:shadow-[var(--glow)]"
                      />
                      <p className="mt-1.5 text-[var(--text-xs)] text-[var(--color-ink-4)]">
                        {sample.trim().length < 40
                          ? "Needs about 40+ characters to read anything from."
                          : `${sample.trim().length} characters — enough to assess.`}
                      </p>
                    </div>
                  )}
                </div>

                <ErrorNote>{error}</ErrorNote>

                <Button type="submit" loading={busy} className="w-full">
                  {busy
                    ? sample.trim().length > 40
                      ? "Reading your writing…"
                      : "Building your levels…"
                    : "Build my 5 levels"}
                  {!busy && <ArrowRight size={16} />}
                </Button>
              </form>
            </Reveal>

            {session && (
              <Reveal delay={0.16}>
                <button
                  onClick={() => router.push("/learn")}
                  className="mt-6 w-full text-left rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 px-5 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)]"
                >
                  <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
                    Continue where you left off
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-4">
                    <span className="text-[var(--text-lg)] text-[var(--color-ink)]">
                      {session.topic}
                    </span>
                    <span className="text-[var(--text-sm)] text-[var(--color-accent)] shrink-0">
                      {session.levels.filter((l) => l.passed).length}/5 done
                    </span>
                  </span>
                </button>
              </Reveal>
            )}
          </div>

          {/* ---- what the levels actually are ---- */}
          <Reveal delay={0.2}>
            <aside className="rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/50 p-5">
              <h2 className="text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                How it works
              </h2>
              <ol className="mt-4 space-y-3.5">
                {RUNGS.map((rung, i) => (
                  <li key={rung} className="flex gap-3">
                    <span className="grid place-items-center size-6 shrink-0 rounded-full bg-[var(--color-paper-4)] font-[family-name:var(--font-mono)] text-[0.6875rem] text-[var(--color-accent)]">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[var(--text-sm)] font-medium text-[var(--color-ink)] leading-tight">
                        {RUNG_LABEL[rung]}
                      </span>
                      <span className="block text-[var(--text-sm)] text-[var(--color-ink-3)] leading-snug">
                        {RUNG_BLURB[rung]}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
