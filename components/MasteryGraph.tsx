"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { conceptDepths, masteryToken, type Concept } from "@/lib/types";

const W = 760;
const H = 300;
const PAD_X = 58;
const PAD_Y = 42;
const R = 13;

interface Placed extends Concept {
  x: number;
  y: number;
}

/**
 * Deterministic layout: concepts are placed in columns by prerequisite depth
 * and spread evenly down each column. No force simulation — the graph renders
 * identically every time and never jitters while a judge is watching it.
 */
function layout(concepts: Concept[]): Placed[] {
  const depths = conceptDepths(concepts);
  const columns = new Map<number, Concept[]>();
  for (const c of concepts) {
    const d = depths.get(c.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), c]);
  }

  const maxDepth = Math.max(0, ...columns.keys());
  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_Y * 2;

  const placed: Placed[] = [];
  for (const [depth, group] of columns) {
    const x = maxDepth === 0 ? W / 2 : PAD_X + (depth / maxDepth) * usableW;
    group.forEach((c, i) => {
      const y =
        group.length === 1
          ? H / 2
          : PAD_Y + (i / (group.length - 1)) * usableH;
      placed.push({ ...c, x, y });
    });
  }
  return placed;
}

export function MasteryGraph({ concepts }: { concepts: Concept[] }) {
  const nodes = useMemo(() => layout(concepts), [concepts]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [hovered, setHovered] = useState<string | null>(null);

  const edges = nodes.flatMap((n) =>
    n.prereqs
      .map((p) => byId.get(p))
      .filter((from): from is Placed => Boolean(from))
      .map((from) => ({ from, to: n, key: `${from.id}->${n.id}` })),
  );

  const active = hovered ? byId.get(hovered) : null;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Concept mastery graph"
      >
        <defs>
          <filter id="node-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map(({ from, to, key }, i) => {
          const mid = (from.x + to.x) / 2;
          const lit = hovered === from.id || hovered === to.id;
          return (
            <motion.path
              key={key}
              d={`M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`}
              fill="none"
              stroke={lit ? "var(--color-accent)" : "var(--color-paper-4)"}
              strokeWidth={lit ? 1.6 : 1.1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.1 + i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          );
        })}

        {nodes.map((n, i) => {
          const isWeak = n.status === "weak";
          const isLocked = n.status === "locked";
          const fill = isLocked ? "var(--mastery-0)" : masteryToken(n.mastery);
          return (
            <motion.g
              key={n.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.06 }}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-default"
            >
              {/* weak concepts pulse — the room will ask about these */}
              {isWeak && (
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={R}
                  fill="none"
                  stroke="var(--color-urgent)"
                  strokeWidth={1.4}
                  animate={{ r: [R, R + 9], opacity: [0.55, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={R}
                fill={fill}
                stroke={
                  isWeak ? "var(--color-urgent)" : "var(--color-paper)"
                }
                strokeWidth={2}
                filter={n.mastery > 0.6 ? "url(#node-glow)" : undefined}
                style={{ transition: "fill 600ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              <text
                x={n.x}
                y={n.y + R + 16}
                textAnchor="middle"
                className="font-[family-name:var(--font-geist-sans)]"
                fontSize="11"
                fill={
                  isLocked ? "var(--color-ink-4)" : "var(--color-ink-2)"
                }
              >
                {n.name.length > 22 ? `${n.name.slice(0, 21)}…` : n.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <figcaption className="mt-3 min-h-[2.5rem] text-[var(--text-sm)] leading-relaxed">
        {active ? (
          <span className="text-[var(--color-ink-2)]">
            <strong className="text-[var(--color-ink)] font-medium">
              {active.name}
            </strong>{" "}
            — {active.gist}{" "}
            <span className="text-[var(--color-accent)]">
              {Math.round(active.mastery * 100)}% mastered
            </span>
          </span>
        ) : (
          <span className="text-[var(--color-ink-4)]">
            Hover a concept. Brightness is mastery; a rose ring means the room
            still has questions.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
