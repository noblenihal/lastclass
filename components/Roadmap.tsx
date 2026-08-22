"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock, X } from "lucide-react";
import { conceptDepths, type Concept } from "@/lib/types";
import { Button } from "@/components/ui";
import { politeProps, useMotionSafe } from "@/lib/a11y";

interface Layer {
  brief: string;
  keyPoints: string[];
  trap: string;
  canGoDeeper: boolean;
  nextLayer: string;
}

/**
 * The roadmap.
 *
 * A prerequisite graph is an engineer's picture; a learner wants a route. The
 * concepts are ordered by prerequisite depth and laid out as stops along one
 * winding path, so progress reads as distance travelled rather than as a
 * diagram to decode.
 */
export function Roadmap({
  concepts,
  topic,
  level,
  interest,
}: {
  concepts: Concept[];
  topic: string;
  level: string;
  interest?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const motion$ = useMotionSafe();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Route order: prerequisite depth first, so the path is walkable.
  const depths = conceptDepths(concepts);
  const stops = [...concepts].sort(
    (a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0),
  );
  const open = stops.find((c) => c.id === openId) ?? null;

  const fetchLayer = useCallback(
    async (concept: Concept, depth: number, already: string[]) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/concept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            concept: concept.name,
            gist: concept.gist,
            level,
            interest,
            mastery: concept.mastery,
            depth,
            already,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not open that one.");
        setLayers((prev) => [...prev, data as Layer]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [topic, level, interest],
  );

  function openStop(c: Concept) {
    // Remember where focus came from so closing returns it to that stop.
    returnTo.current = document.activeElement as HTMLElement | null;
    setOpenId(c.id);
    setLayers([]);
    setError("");
    void fetchLayer(c, 0, []);
  }

  const close = useCallback(() => {
    setOpenId(null);
    returnTo.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Move focus into the drawer when it opens, and lock the page behind it.
  useEffect(() => {
    if (!openId) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openId]);

  const learned = concepts.filter((c) => c.mastery >= 0.8).length;

  return (
    <>
      <div>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
            Your route through {topic}. Tap any stop to read about it.
          </p>
          <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
            {learned} of {concepts.length} mastered
          </span>
        </div>

        <ol className="relative">
          {/* the road */}
          <span
            aria-hidden="true"
            className="absolute left-[1.4375rem] top-4 bottom-4 w-[3px] rounded-full bg-[var(--color-paper-3)] sm:left-[1.6875rem]"
          />

          {stops.map((c, i) => {
            const pct = Math.round(c.mastery * 100);
            const done = c.mastery >= 0.8;
            const weak = c.status === "weak";
            return (
              <li key={c.id} className="relative">
                <button
                  onClick={() => openStop(c)}
                  aria-label={`Stop ${i + 1}: ${c.name}. ${
                    pct === 0 ? "Not started" : `${pct} percent mastered`
                  }. Open detail.`}
                  className="group flex w-full items-start gap-4 rounded-[var(--radius-md)] py-3 pl-1 pr-3 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-2)]"
                >
                  {/* the stop */}
                  <span className="relative z-10 grid size-12 shrink-0 place-items-center sm:size-14">
                    <svg
                      viewBox="0 0 48 48"
                      className="absolute inset-0 size-full -rotate-90"
                      aria-hidden="true"
                    >
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="var(--color-paper)"
                        stroke="var(--color-paper-3)"
                        strokeWidth="4"
                      />
                      <motion.circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        aria-hidden="true"
                        stroke={
                          weak
                            ? "var(--color-urgent)"
                            : "var(--color-accent)"
                        }
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 20}
                        initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                        animate={{
                          strokeDashoffset: 2 * Math.PI * 20 * (1 - c.mastery),
                        }}
                        transition={{
                          duration: motion$.dur(0.9),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </svg>
                    <span
                      className={
                        "relative font-[family-name:var(--font-mono)] text-[var(--text-sm)] " +
                        (done
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-ink-3)]")
                      }
                    >
                      {i + 1}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1 pt-1.5">
                    <span className="block text-[var(--text-lg)] font-medium leading-snug text-[var(--color-ink)]">
                      {c.name}
                    </span>
                    <span className="block text-[var(--text-sm)] leading-snug text-[var(--color-ink-3)]">
                      {c.gist}
                    </span>
                    <span
                      className={
                        "mt-1 block text-[var(--text-xs)] " +
                        (weak
                          ? "text-[var(--color-urgent)]"
                          : done
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-ink-4)]")
                      }
                    >
                      {pct === 0
                        ? "Not started"
                        : done
                          ? "Mastered"
                          : weak
                            ? `${pct}% · shaky`
                            : `${pct}% there`}
                    </span>
                  </span>

                  <span className="mt-3 shrink-0 text-[var(--text-sm)] text-[var(--color-accent)] opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100">
                    Read
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* the drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-[var(--scrim)]"
            />
            <motion.aside
              key="drawer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[30rem] flex-col border-l border-[var(--color-paper-4)] bg-[var(--color-paper)] shadow-[-16px_0_48px_-16px_rgb(0_0_0/0.4)]"
              role="dialog"
              aria-modal="true"
              aria-label={`${open.name} — concept detail`}
            >
              <header className="flex items-start justify-between gap-3 border-b border-[var(--color-paper-3)] px-5 py-4">
                <div className="min-w-0">
                  <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                    Stop {stops.findIndex((s) => s.id === open.id) + 1} of{" "}
                    {stops.length}
                  </span>
                  <h3 className="mt-0.5 text-[var(--text-xl)] font-medium leading-snug text-[var(--color-ink)]">
                    {open.name}
                  </h3>
                </div>
                <button
                  ref={closeRef}
                  onClick={close}
                  aria-label="Close concept detail"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {open.prereqs.length > 0 && (
                  <p className="mb-4 flex items-start gap-2 text-[var(--text-sm)] text-[var(--color-ink-3)]">
                    <Lock size={13} className="mt-0.5 shrink-0" />
                    <span>
                      Needs first:{" "}
                      {open.prereqs
                        .map((p) => concepts.find((c) => c.id === p)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                )}

                {layers.map((l, li) => (
                  <motion.section
                    key={li}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={li > 0 ? "mt-6 border-t border-[var(--color-paper-3)] pt-6" : ""}
                  >
                    {li > 0 && (
                      <span className="mb-2 block text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                        Deeper · layer {li + 1}
                      </span>
                    )}
                    <p className="text-[var(--text-base)] leading-relaxed text-[var(--color-ink)]">
                      {l.brief}
                    </p>

                    {l.keyPoints.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {l.keyPoints.map((k, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[var(--text-sm)] text-[var(--color-ink-2)]"
                          >
                            <span className="text-[var(--color-accent)]">·</span>
                            {k}
                          </li>
                        ))}
                      </ul>
                    )}

                    {l.trap && (
                      <p className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)] px-4 py-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
                        <strong className="font-medium text-[var(--color-urgent)]">
                          Common trap:{" "}
                        </strong>
                        {l.trap}
                      </p>
                    )}
                  </motion.section>
                ))}

                {loading && (
                  <div className="space-y-2" {...politeProps()} aria-label="Loading explanation">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-4 rounded bg-[var(--color-paper-3)]"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{
                          duration: 1.4,
                          repeat: motion$.repeat(),
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                )}

                {error && (
                  <p
                    role="alert"
                    className="text-[var(--text-sm)] text-[var(--color-urgent)]"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* go deeper — the learner pulls, we don't push */}
              {layers.length > 0 && !loading && (
                <footer className="border-t border-[var(--color-paper-3)] px-5 py-4">
                  {layers[layers.length - 1].canGoDeeper ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() =>
                          fetchLayer(
                            open,
                            layers.length,
                            layers.map((l) => l.brief),
                          )
                        }
                      >
                        <ChevronDown size={15} /> Go deeper
                      </Button>
                      {layers[layers.length - 1].nextLayer && (
                        <p className="mt-2 text-center text-[var(--text-xs)] text-[var(--color-ink-3)]">
                          Next: {layers[layers.length - 1].nextLayer}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-[var(--text-sm)] text-[var(--color-ink-3)]">
                      That&apos;s this stop covered. Going further would leave
                      the topic.
                    </p>
                  )}
                </footer>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
