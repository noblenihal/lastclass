"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { conceptDepths, type Concept } from "@/lib/types";

const W = 820;
const COL_W = 190;
const ROW_H = 108;
const PAD_TOP = 34;
const R = 19;

interface Placed extends Concept {
  x: number;
  y: number;
  depth: number;
  /** 1-based position in a sensible learning order. */
  order: number;
}

/** Column headings, so the left-to-right axis actually means something. */
function tierLabel(depth: number, maxDepth: number): string {
  if (depth === 0) return "Start here";
  if (depth === maxDepth) return "Advanced";
  return `Builds on ${depth === 1 ? "the basics" : "that"}`;
}

function layout(concepts: Concept[]) {
  const depths = conceptDepths(concepts);
  const columns = new Map<number, Concept[]>();
  for (const c of concepts) {
    const d = depths.get(c.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), c]);
  }

  const maxDepth = Math.max(0, ...columns.keys());
  const tallest = Math.max(...[...columns.values()].map((g) => g.length));
  const height = PAD_TOP + tallest * ROW_H + 30;
  const colCount = maxDepth + 1;
  const gutter = (W - colCount * COL_W) / (colCount + 1);

  // Learning order: left-to-right by depth, top-to-bottom within a column.
  let n = 0;
  const placed: Placed[] = [];
  for (let d = 0; d <= maxDepth; d += 1) {
    const group = columns.get(d) ?? [];
    const x = gutter + d * (COL_W + gutter) + COL_W / 2;
    group.forEach((c, i) => {
      n += 1;
      placed.push({
        ...c,
        x,
        y: PAD_TOP + 34 + i * ROW_H,
        depth: d,
        order: n,
      });
    });
  }

  const tiers = [...columns.keys()]
    .sort((a, b) => a - b)
    .map((d) => ({
      depth: d,
      x: gutter + d * (COL_W + gutter) + COL_W / 2,
      label: tierLabel(d, maxDepth),
    }));

  return { placed, height, tiers };
}

/** Wraps a concept name onto at most two lines instead of truncating it. */
function wrap(name: string): string[] {
  const words = name.split(" ");
  if (name.length <= 18) return [name];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 18 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
    if (lines.length === 1 && cur.length > 18) break;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

export function MasteryGraph({ concepts }: { concepts: Concept[] }) {
  const { placed, height, tiers } = useMemo(() => layout(concepts), [concepts]);
  const byId = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);
  const [hovered, setHovered] = useState<string | null>(null);

  const edges = placed.flatMap((n) =>
    n.prereqs
      .map((p) => byId.get(p))
      .filter((from): from is Placed => Boolean(from))
      .map((from) => ({ from, to: n, key: `${from.id}->${n.id}` })),
  );

  const active = hovered ? byId.get(hovered) : null;
  const learned = concepts.filter((c) => c.mastery >= 0.8).length;

  return (
    <figure className="w-full">
      {/* what the picture means, before the picture */}
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
          Arrows point from what you need <strong className="font-medium text-[var(--color-ink)]">first</strong> to
          what it unlocks. Work left to right.
        </span>
        <span className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
          {learned} of {concepts.length} mastered
        </span>
      </figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full h-auto min-w-[40rem]"
          role="img"
          aria-label={`Learning path: ${concepts.length} concepts, ${learned} mastered`}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--color-paper-4)" />
            </marker>
            <marker
              id="arrow-lit"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {/* column headings give the horizontal axis a meaning */}
          {tiers.map((t) => (
            <text
              key={t.depth}
              x={t.x}
              y={16}
              textAnchor="middle"
              fontSize="10.5"
              letterSpacing="0.1em"
              fill="var(--color-ink-4)"
              style={{ textTransform: "uppercase" }}
            >
              {t.label}
            </text>
          ))}

          {edges.map(({ from, to, key }, i) => {
            const lit = hovered === from.id || hovered === to.id;
            const mid = (from.x + to.x) / 2;
            return (
              <motion.path
                key={key}
                d={`M ${from.x + R + 3} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x - R - 7} ${to.y}`}
                fill="none"
                stroke={lit ? "var(--color-accent)" : "var(--color-paper-4)"}
                strokeWidth={lit ? 1.8 : 1.2}
                markerEnd={lit ? "url(#arrow-lit)" : "url(#arrow)"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            );
          })}

          {placed.map((n, i) => {
            const pct = Math.round(n.mastery * 100);
            const circ = 2 * Math.PI * (R + 5);
            const lines = wrap(n.name);
            const isWeak = n.status === "weak";

            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* track — always visible, so 0% still reads as "not filled yet" */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={R + 5}
                  fill="none"
                  stroke="var(--color-paper-3)"
                  strokeWidth={3}
                />
                {/* mastery arc */}
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={R + 5}
                  fill="none"
                  stroke={
                    isWeak ? "var(--color-urgent)" : "var(--color-accent)"
                  }
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  transform={`rotate(-90 ${n.x} ${n.y})`}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ * (1 - n.mastery) }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* body carries the learning-order number */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={R}
                  fill="var(--color-paper-3)"
                  stroke={
                    hovered === n.id
                      ? "var(--color-accent)"
                      : "var(--color-paper-4)"
                  }
                  strokeWidth={1.5}
                />
                <text
                  x={n.x}
                  y={n.y + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="500"
                  fill={
                    n.mastery > 0
                      ? "var(--color-accent)"
                      : "var(--color-ink-3)"
                  }
                  className="font-[family-name:var(--font-geist-mono)]"
                >
                  {n.order}
                </text>

                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={n.x}
                    y={n.y + R + 20 + li * 13}
                    textAnchor="middle"
                    fontSize="11.5"
                    fill="var(--color-ink-2)"
                  >
                    {line}
                  </text>
                ))}
                <text
                  x={n.x}
                  y={n.y + R + 20 + lines.length * 13}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill={
                    isWeak ? "var(--color-urgent)" : "var(--color-ink-4)"
                  }
                >
                  {pct === 0 ? "not started" : `${pct}%`}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* hover detail + legend */}
      <div className="mt-3 min-h-[3rem] rounded-[var(--radius-md)] bg-[var(--color-paper-3)]/40 px-4 py-3">
        {active ? (
          <p className="text-[var(--text-sm)] leading-relaxed">
            <strong className="font-medium text-[var(--color-ink)]">
              {active.order}. {active.name}
            </strong>
            <span className="text-[var(--color-ink-2)]"> — {active.gist}</span>
            {active.prereqs.length > 0 && (
              <span className="block mt-0.5 text-[var(--color-ink-3)]">
                Needs first:{" "}
                {active.prereqs
                  .map((p) => byId.get(p)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[var(--text-sm)] text-[var(--color-ink-3)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-[var(--color-accent)]" />
              ring fills as you master it
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-[var(--color-urgent)]" />
              the class still has questions here
            </span>
            <span className="text-[var(--color-ink-4)]">
              Hover a circle for detail.
            </span>
          </p>
        )}
      </div>
    </figure>
  );
}
