"use client";

import { useRouter } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { byId, type Doubt } from "@/lib/characters";
import type { Concept } from "@/lib/types";
import { Roadmap } from "@/components/Roadmap";
import { Button, Eyebrow, Reveal } from "@/components/ui";

/**
 * The grade was never a separate step — it's just which hands went down.
 * Deferred hands are unpaid debt and are counted against the learner.
 */
export function ReportCard({
  doubts,
  concepts,
  topic,
  onRestart,
}: {
  doubts: Doubt[];
  concepts: Concept[];
  topic: string;
  onRestart: () => void;
}) {
  const router = useRouter();

  const resolved = doubts.filter((d) => d.status === "resolved");
  const assisted = resolved.filter((d) => d.assisted);
  const dodged = doubts.filter((d) => d.status === "deferred");
  const fumbled = doubts.filter((d) => d.status === "fumbled");
  const clean = doubts.length > 0 && dodged.length === 0 && fumbled.length === 0;

  const verdict = !doubts.length
    ? "The class ended before anyone asked anything."
    : clean
      ? "Every hand went down. You can teach this."
      : dodged.length
        ? `You left ${dodged.length} hand${dodged.length === 1 ? "" : "s"} in the air.`
        : "Some answers didn't land.";

  return (
    <main id="main" className="flex-1 px-6 py-6 sm:px-10">
      <header className="mb-8">
        <Eyebrow>Class dismissed</Eyebrow>
      </header>

      <div className="mx-auto max-w-[56rem]">
        <Reveal>
          <h1
            className="font-semibold tracking-[-0.035em] leading-[1.06] text-balance"
            style={{ fontSize: "var(--text-display-s)" }}
          >
            {verdict}
          </h1>
          <p className="mt-3 text-[var(--text-lg)] text-[var(--color-ink-2)]">
            {topic} · {resolved.length} of {doubts.length} questions cleared
            {assisted.length > 0 && (
              <span className="text-[var(--color-ink-3)]">
                {" "}
                ({assisted.length} with the Master&apos;s help)
              </span>
            )}
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/50 p-6">
            <h2 className="text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--color-ink-3)] mb-5">
              How this class changed your map
            </h2>
            <Roadmap concepts={concepts} topic={topic} level="MEDIUM" />
          </section>
        </Reveal>

        {doubts.length > 0 && (
          <Reveal delay={0.2}>
            <section className="mt-10 space-y-2.5">
              <h2 className="text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--color-ink-3)] mb-4">
                Every hand
              </h2>
              {[...resolved, ...fumbled, ...dodged].map((d) => {
                const c = byId(d.characterId);
                const tone =
                  d.status === "resolved"
                    ? "border-[var(--color-paper-4)]"
                    : "border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)]";
                const Icon =
                  d.status === "resolved"
                    ? Check
                    : d.status === "deferred"
                      ? Clock
                      : X;
                return (
                  <div
                    key={d.id}
                    className={`flex items-start gap-4 rounded-[var(--radius-md)] border px-5 py-4 ${tone}`}
                  >
                    <span className="text-[1.4rem] leading-none shrink-0">
                      {c.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--text-base)] text-[var(--color-ink)] leading-snug">
                        {d.question}
                      </p>
                      <p className="mt-1 text-[var(--text-sm)] text-[var(--color-ink-3)]">
                        {d.status === "resolved"
                          ? d.assisted
                            ? "Cleared — with the Master's help, counts for half"
                            : "Cleared on your own"
                          : d.status === "deferred"
                            ? "You said you'd come back to it"
                            : "Answer didn't land"}
                      </p>
                    </div>
                    <Icon
                      size={16}
                      className={
                        d.status === "resolved"
                          ? "text-[var(--color-accent)] shrink-0 mt-0.5"
                          : "text-[var(--color-urgent)] shrink-0 mt-0.5"
                      }
                    />
                  </div>
                );
              })}
            </section>
          </Reveal>
        )}

        <Reveal delay={0.28}>
          <div className="mt-10 flex gap-3 flex-wrap">
            <Button onClick={onRestart}>Teach it again</Button>
            <Button variant="ghost" onClick={() => router.push("/learn")}>
              Back to the ladder
            </Button>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
