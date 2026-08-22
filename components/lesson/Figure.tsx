"use client";

import { motion } from "framer-motion";

export type FigureKind =
  | "flow"
  | "stack"
  | "cycle"
  | "split"
  | "compare"
  | "layers";

export interface FigureData {
  kind: FigureKind;
  nodes: string[];
  caption: string;
}

const W = 640;
const H = 300;

/** Deterministic wobble, so shapes look drawn by hand but never re-jitter. */
function wob(seed: number, amp = 2.2) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * 2 * amp;
}

const STROKE = "oklch(92% 0.03 85)";
const ACCENT = "oklch(80% 0.14 72)";
const INK = "oklch(96% 0.02 85)";

const draw = (i: number, total: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: {
    duration: 0.55,
    delay: 0.12 + (i / Math.max(1, total)) * 0.9,
    ease: [0.16, 1, 0.3, 1] as const,
  },
});

const fade = (i: number, total: number) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: 0.35,
    delay: 0.32 + (i / Math.max(1, total)) * 0.9,
  },
});

/** A hand-drawn rectangle: four slightly-off corners, not a perfect box. */
function RoughRect({
  x,
  y,
  w,
  h,
  seed,
  i,
  total,
  highlight,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  i: number;
  total: number;
  highlight?: boolean;
}) {
  const p = `M ${x + wob(seed)} ${y + wob(seed + 1)}
    L ${x + w + wob(seed + 2)} ${y + wob(seed + 3)}
    L ${x + w + wob(seed + 4)} ${y + h + wob(seed + 5)}
    L ${x + wob(seed + 6)} ${y + h + wob(seed + 7)} Z`;
  return (
    <motion.path
      d={p}
      fill="none"
      stroke={highlight ? ACCENT : STROKE}
      strokeWidth={highlight ? 2.6 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...draw(i, total)}
    />
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  seed,
  i,
  total,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: number;
  i: number;
  total: number;
}) {
  const mx = (x1 + x2) / 2 + wob(seed, 6);
  const my = (y1 + y2) / 2 + wob(seed + 1, 6);
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = 8;
  return (
    <>
      <motion.path
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        {...draw(i, total)}
      />
      <motion.path
        d={`M ${x2} ${y2} L ${x2 - head * Math.cos(ang - 0.4)} ${
          y2 - head * Math.sin(ang - 0.4)
        } M ${x2} ${y2} L ${x2 - head * Math.cos(ang + 0.4)} ${
          y2 - head * Math.sin(ang + 0.4)
        }`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        {...fade(i, total)}
      />
    </>
  );
}

function Label({
  x,
  y,
  text,
  i,
  total,
  size = 13,
}: {
  x: number;
  y: number;
  text: string;
  i: number;
  total: number;
  size?: number;
}) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 14 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 2);

  return (
    <motion.g {...fade(i, total)}>
      {shown.map((l, k) => (
        <text
          key={k}
          x={x}
          y={y + (k - (shown.length - 1) / 2) * (size + 3)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size}
          fill={INK}
          className="font-[family-name:var(--font-geist-sans)]"
        >
          {l}
        </text>
      ))}
    </motion.g>
  );
}

/**
 * The drawing on the board.
 *
 * Gemini chooses the diagram *kind* and supplies short node labels; the
 * geometry is owned here, so the board always composes cleanly instead of
 * relying on a model to invent coordinates.
 */
export function Figure({ figure }: { figure: FigureData }) {
  const nodes = figure.nodes.slice(0, 5);
  const n = nodes.length;
  const total = n * 2 + 1;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {figure.kind === "flow" &&
          (() => {
            const bw = Math.min(130, (W - 60 - (n - 1) * 34) / n);
            const gap = (W - 60 - n * bw) / Math.max(1, n - 1);
            const y = H / 2 - 34;
            return nodes.map((t, i) => {
              const x = 30 + i * (bw + gap);
              return (
                <g key={i}>
                  <RoughRect x={x} y={y} w={bw} h={68} seed={i * 7} i={i} total={total} />
                  <Label x={x + bw / 2} y={y + 34} text={t} i={i} total={total} />
                  {i < n - 1 && (
                    <Arrow
                      x1={x + bw + 4}
                      y1={y + 34}
                      x2={x + bw + gap - 4}
                      y2={y + 34}
                      seed={i * 13}
                      i={i}
                      total={total}
                    />
                  )}
                </g>
              );
            });
          })()}

        {figure.kind === "stack" &&
          (() => {
            const bh = Math.min(46, (H - 60) / n);
            const bw = 240;
            const x = W / 2 - bw / 2;
            return nodes.map((t, i) => {
              const y = H - 34 - (i + 1) * (bh + 6);
              return (
                <g key={i}>
                  <RoughRect
                    x={x}
                    y={y}
                    w={bw}
                    h={bh}
                    seed={i * 9}
                    i={i}
                    total={total}
                    highlight={i === n - 1}
                  />
                  <Label x={x + bw / 2} y={y + bh / 2} text={t} i={i} total={total} />
                  <Arrow
                    x1={x + bw + 26}
                    y1={y + bh / 2}
                    x2={x + bw + 8}
                    y2={y + bh / 2}
                    seed={i * 3}
                    i={i}
                    total={total}
                  />
                </g>
              );
            });
          })()}

        {figure.kind === "cycle" &&
          (() => {
            const cx = W / 2;
            const cy = H / 2;
            const r = 96;
            return nodes.map((t, i) => {
              const a = (i / n) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(a) * r;
              const y = cy + Math.sin(a) * r;
              const a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
              return (
                <g key={i}>
                  <RoughRect
                    x={x - 58}
                    y={y - 22}
                    w={116}
                    h={44}
                    seed={i * 11}
                    i={i}
                    total={total}
                  />
                  <Label x={x} y={y} text={t} i={i} total={total} size={12} />
                  <Arrow
                    x1={cx + Math.cos(a + 0.5) * (r - 30)}
                    y1={cy + Math.sin(a + 0.5) * (r - 30)}
                    x2={cx + Math.cos(a2 - 0.5) * (r - 30)}
                    y2={cy + Math.sin(a2 - 0.5) * (r - 30)}
                    seed={i * 5}
                    i={i}
                    total={total}
                  />
                </g>
              );
            });
          })()}

        {figure.kind === "split" &&
          (() => {
            const rest = nodes.slice(1);
            return (
              <>
                <RoughRect x={40} y={H / 2 - 32} w={150} h={64} seed={1} i={0} total={total} />
                <Label x={115} y={H / 2} text={nodes[0] ?? ""} i={0} total={total} />
                {rest.map((t, i) => {
                  const y = 44 + i * ((H - 120) / Math.max(1, rest.length - 1 || 1));
                  return (
                    <g key={i}>
                      <Arrow
                        x1={196}
                        y1={H / 2}
                        x2={384}
                        y2={y + 32}
                        seed={i * 17}
                        i={i + 1}
                        total={total}
                      />
                      <RoughRect
                        x={392}
                        y={y}
                        w={200}
                        h={64}
                        seed={i * 19}
                        i={i + 1}
                        total={total}
                      />
                      <Label x={492} y={y + 32} text={t} i={i + 1} total={total} />
                    </g>
                  );
                })}
              </>
            );
          })()}

        {figure.kind === "compare" &&
          (() => {
            const half = Math.ceil(n / 2);
            const cols = [nodes.slice(0, half), nodes.slice(half)];
            return (
              <>
                <motion.path
                  d={`M ${W / 2} 24 L ${W / 2 + wob(2, 3)} ${H - 40}`}
                  stroke={STROKE}
                  strokeWidth={1.6}
                  strokeDasharray="6 7"
                  fill="none"
                  {...draw(0, total)}
                />
                {cols.map((col, c) =>
                  col.map((t, i) => {
                    const x = c === 0 ? 34 : W / 2 + 26;
                    const y = 40 + i * 74;
                    return (
                      <g key={`${c}-${i}`}>
                        <RoughRect
                          x={x}
                          y={y}
                          w={W / 2 - 62}
                          h={58}
                          seed={c * 31 + i * 7}
                          i={c * half + i}
                          total={total}
                          highlight={c === 1}
                        />
                        <Label
                          x={x + (W / 2 - 62) / 2}
                          y={y + 29}
                          text={t}
                          i={c * half + i}
                          total={total}
                        />
                      </g>
                    );
                  }),
                )}
              </>
            );
          })()}

        {figure.kind === "layers" &&
          nodes.map((t, i) => {
            const inset = i * 34;
            const w = W - 80 - inset * 2;
            const h = H - 70 - inset * 2;
            return (
              <g key={i}>
                <RoughRect
                  x={40 + inset}
                  y={26 + inset}
                  w={w}
                  h={h}
                  seed={i * 23}
                  i={i}
                  total={total}
                  highlight={i === n - 1}
                />
                <Label
                  x={40 + inset + w / 2}
                  y={26 + inset + (i === n - 1 ? h / 2 : 17)}
                  text={t}
                  i={i}
                  total={total}
                  size={12}
                />
              </g>
            );
          })}
      </svg>

      {figure.caption && (
        <figcaption
          className="mt-1 text-center text-[var(--text-sm)]"
          style={{ color: "oklch(84% 0.025 85)" }}
        >
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}
