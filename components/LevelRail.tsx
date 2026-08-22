"use client";

import { useRouter } from "next/navigation";
import { Check, Lock, Map } from "lucide-react";
import { RUNG_LABEL, type Level } from "@/lib/types";

/**
 * Shared navigation across the workspace.
 *
 * Selecting a rung goes straight to that rung — the tab IS the level, so
 * there is no intermediate card to click through. The concept map is its own
 * destination rather than something that crowds every level.
 */
export function LevelRail({
  levels,
  active,
  mastered,
  total,
}: {
  levels: Level[];
  /** "map" or a level number. */
  active: "map" | number;
  mastered: number;
  total: number;
}) {
  const router = useRouter();
  const done = levels.filter((l) => l.passed).length;

  function go(l: Level) {
    router.push(l.rung === "Teach" ? "/classroom" : `/level/${l.n}`);
  }

  return (
    <nav
      className="border-b border-[var(--color-paper-3)] px-3 py-4 lg:h-full lg:border-b-0 lg:border-r"
      aria-label="Levels"
    >
      <p className="mb-3 px-2 text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
        {done} of {levels.length} done
      </p>

      <ol className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
        {levels.map((l) => {
          const on = active === l.n;
          return (
            <li key={l.n} className="shrink-0 lg:shrink">
              <button
                onClick={() => go(l)}
                aria-current={on ? "page" : undefined}
                className={
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)] " +
                  (on
                    ? "bg-[var(--color-paper-3)]"
                    : "hover:bg-[var(--color-paper-2)]")
                }
              >
                <span
                  className={
                    "grid size-6 shrink-0 place-items-center rounded-full font-[family-name:var(--font-mono)] text-[0.6875rem] " +
                    (l.passed
                      ? "bg-[var(--color-accent)] text-[var(--on-accent)]"
                      : on
                        ? "bg-[var(--color-paper-4)] text-[var(--color-accent)]"
                        : "bg-[var(--color-paper-3)] text-[var(--color-ink-3)]")
                  }
                >
                  {l.passed ? <Check size={12} aria-hidden="true" /> : l.n}
                </span>
                <span
                  className={
                    "truncate text-[var(--text-sm)] leading-tight " +
                    (on ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]")
                  }
                >
                  {RUNG_LABEL[l.rung]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* the map is a place you go, not a thing that crowds every level */}
      <div className="mt-3 border-t border-[var(--color-paper-3)] pt-3">
        <button
          onClick={() => router.push("/learn")}
          aria-current={active === "map" ? "page" : undefined}
          className={
            "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)] " +
            (active === "map"
              ? "bg-[var(--color-paper-3)]"
              : "hover:bg-[var(--color-paper-2)]")
          }
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-paper-3)] text-[var(--color-ink-3)]">
            <Map size={12} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={
                "block truncate text-[var(--text-sm)] leading-tight " +
                (active === "map"
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)]")
              }
            >
              Concept map
            </span>
            <span className="block text-[var(--text-xs)] text-[var(--color-ink-4)]">
              {mastered}/{total} mastered
            </span>
          </span>
        </button>
      </div>
    </nav>
  );
}

export { Lock };
