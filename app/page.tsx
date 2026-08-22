"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { useAuth, useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import type { Session } from "@/lib/types";
import { Button, ErrorNote, Eyebrow, Field, Reveal } from "@/components/ui";

export default function HomePage() {
  const profile = useRequireProfile();
  const { signOut, update } = useAuth();
  const { session, setSession } = useSession();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [interest, setInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!profile) return null;

  async function build(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (topic.trim().length < 2) return setError("Give me something to teach.");
    if (interest.trim().length < 2)
      return setError("Name something you're into — every analogy comes from it.");

    setBusy(true);
    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), interest: interest.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something broke.");
      update({ interest: interest.trim() });
      setSession(data.session as Session);
      router.push("/learn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
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

      <div className="flex-1 grid place-items-center px-6 py-10">
        <div className="w-full max-w-[38rem]">
          <Reveal>
            <h1
              className="font-semibold tracking-[-0.04em] leading-[1.02] text-balance"
              style={{ fontSize: "var(--text-display)" }}
            >
              What should you
              <br />
              be able to teach?
            </h1>
            <p className="mt-5 text-[var(--text-xl)] text-[var(--color-ink-2)] leading-relaxed max-w-[34rem]">
              Name it. We&apos;ll map what it&apos;s made of, then climb you up
              until you can explain it to a room that asks hard questions.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <form onSubmit={build} className="mt-10 space-y-5">
              <Field
                label="The topic"
                placeholder="Recursion · the Krebs cycle · tying a bowline"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <Field
                label="Something you're already into"
                hint="Every analogy gets rebuilt out of this. Be specific."
                placeholder="Cricket · cooking · Formula 1 · rap"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
              />

              <ErrorNote>{error}</ErrorNote>

              <Button type="submit" loading={busy} className="w-full">
                {busy ? "Mapping the topic…" : "Build my ladder"}
                {!busy && <ArrowRight size={16} />}
              </Button>
            </form>
          </Reveal>

          {session && (
            <Reveal delay={0.2}>
              <button
                onClick={() => router.push("/learn")}
                className="mt-6 w-full text-left rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 px-5 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)]"
              >
                <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                  In progress
                </span>
                <span className="mt-1 flex items-center justify-between gap-4">
                  <span className="text-[var(--text-lg)] text-[var(--color-ink)]">
                    {session.topic}
                  </span>
                  <span className="text-[var(--text-sm)] text-[var(--color-accent)] shrink-0">
                    {session.levels.filter((l) => l.passed).length}/5 rungs
                  </span>
                </span>
              </button>
            </Reveal>
          )}
        </div>
      </div>
    </main>
  );
}
