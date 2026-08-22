"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Figure, type FigureData } from "@/components/lesson/Figure";

export interface Beat {
  concept_id: string;
  label: string;
  detail: string;
  narration: string;
  figure: FigureData;
}

/**
 * The board.
 *
 * Each beat draws its figure while its narration plays, and playback advances
 * only when the audio for that beat has finished — so picture and voice stay
 * in step without guessing at durations. Audio is fetched once per beat and
 * the next beat is prefetched during playback, so scrubbing is instant.
 */
export function Whiteboard({
  beats,
  topic,
  onFinished,
}: {
  beats: Beat[];
  topic: string;
  onFinished?: () => void;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  /** How many beats already have audio in hand. */
  const [ready, setReady] = useState(0);

  const cache = useRef<Map<number, string>>(new Map());
  /** Dedupes concurrent requests for the same beat. */
  const inflight = useRef<Map<number, Promise<string | null>>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playToken = useRef(0);

  const beat = beats[i];

  const fetchAudio = useCallback(
    async (idx: number): Promise<string | null> => {
      if (cache.current.has(idx)) return cache.current.get(idx)!;
      const b = beats[idx];
      if (!b) return null;
      if (inflight.current.has(idx)) return inflight.current.get(idx)!;
      const job = (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: b.narration,
            voice: "Kore",
            direction:
              "Speak like a teacher drawing on a whiteboard — clear, warm, unhurried.",
          }),
        });
        if (!res.ok) return null;
        const url = URL.createObjectURL(await res.blob());
        cache.current.set(idx, url);
        setReady((r) => r + 1);
        return url;
      } catch {
        return null;
      }
      })();
      inflight.current.set(idx, job);
      return job;
    },
    [beats],
  );

  const stopAudio = useCallback(() => {
    playToken.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  /** Plays beat `idx`, then continues if still in play mode. */
  const run = useCallback(
    async (idx: number) => {
      const token = ++playToken.current;
      setI(idx);
      setSeen((prev) => new Set(prev).add(idx));
      setLoadingAudio(true);

      const url = await fetchAudio(idx);
      if (token !== playToken.current) return;
      setLoadingAudio(false);

      // prefetch the next beat while this one speaks
      void fetchAudio(idx + 1);

      if (url) {
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } else {
        // no voice available — hold long enough to read the figure
        await new Promise((r) => setTimeout(r, 3200));
      }
      if (token !== playToken.current) return;

      if (idx + 1 < beats.length) {
        void run(idx + 1);
      } else {
        setPlaying(false);
        onFinished?.();
      }
    },
    [beats.length, fetchAudio, onFinished],
  );

  /**
   * Warms every beat's narration the moment the script arrives, three at a
   * time. The bottleneck in an explainer is not generating the script, it is
   * waiting on speech mid-playback — so all of it is fetched up front and the
   * board never stalls between beats.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const queue = beats.map((_, k) => k);
      const workers = Array.from({ length: 3 }, async () => {
        while (!cancelled) {
          const next = queue.shift();
          if (next === undefined) return;
          await fetchAudio(next);
        }
      });
      await Promise.all(workers);
    })();
    return () => {
      cancelled = true;
    };
  }, [beats, fetchAudio]);

  useEffect(() => stopAudio, [stopAudio]);

  function toggle() {
    if (playing) {
      stopAudio();
      setPlaying(false);
      setLoadingAudio(false);
    } else {
      setPlaying(true);
      void run(i);
    }
  }

  function go(idx: number) {
    const clamped = Math.min(beats.length - 1, Math.max(0, idx));
    stopAudio();
    setLoadingAudio(false);
    setI(clamped);
    setSeen((prev) => new Set(prev).add(clamped));
    if (playing) void run(clamped);
  }

  if (!beat) return null;
  const done = seen.size >= beats.length;

  return (
    <section>
      {/* the board */}
      <div className="rounded-[var(--radius-lg)] border-[6px] border-[oklch(42%_0.055_58)] bg-[oklch(23%_0.022_155)] p-4 shadow-[inset_0_2px_24px_rgb(0_0_0/0.35)] sm:p-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="font-[family-name:var(--font-mono)] text-[var(--text-xs)] uppercase tracking-[0.16em] text-[oklch(78%_0.05_80)]">
            {topic}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[var(--text-xs)] text-[oklch(70%_0.03_80)]">
            {i + 1}/{beats.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <h3 className="text-center text-[var(--text-xl)] font-medium text-[oklch(96%_0.02_85)]">
              {beat.label}
            </h3>
            <p className="mt-0.5 text-center text-[var(--text-sm)] text-[oklch(80%_0.02_85)]">
              {beat.detail}
            </p>
            <div className="mt-3">
              <Figure figure={beat.figure} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* transport */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => go(i - 1)}
          disabled={i === 0}
          aria-label="Previous step"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-paper-4)] text-[var(--color-ink-2)] transition-[border-color,color] duration-[var(--dur-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] disabled:opacity-35"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--on-accent)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-accent-hot)]"
        >
          {loadingAudio ? (
            <Volume2 size={18} className="animate-pulse" />
          ) : playing ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="ml-0.5" />
          )}
        </button>

        <button
          onClick={() => go(i + 1)}
          disabled={i >= beats.length - 1}
          aria-label="Next step"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-paper-4)] text-[var(--color-ink-2)] transition-[border-color,color] duration-[var(--dur-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] disabled:opacity-35"
        >
          <SkipForward size={16} />
        </button>

        {ready < beats.length && (
          <span className="ml-1 shrink-0 text-[var(--text-xs)] text-[var(--color-ink-3)]">
            voice {ready}/{beats.length}
          </span>
        )}

        {/* scrubber: one segment per beat */}
        <div className="ml-2 flex flex-1 gap-1">
          {beats.map((b, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-label={`Step ${k + 1}: ${b.label}`}
              title={b.label}
              className="group relative h-1.5 flex-1 rounded-full bg-[var(--color-paper-3)]"
            >
              <span
                className={
                  "absolute inset-0 rounded-full transition-colors duration-[var(--dur-mid)] " +
                  (k === i
                    ? "bg-[var(--color-accent)]"
                    : seen.has(k)
                      ? "bg-[var(--color-accent-dim)]"
                      : "bg-transparent group-hover:bg-[var(--color-paper-4)]")
                }
              />
            </button>
          ))}
        </div>
      </div>

      {/* what is being said, for anyone who can't hear it */}
      <p className="mt-3 min-h-[3rem] text-[var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
        {beat.narration}
      </p>

      {!done && (
        <p className="text-[var(--text-sm)] text-[var(--color-ink-3)]">
          Watch all {beats.length} steps before the question.
        </p>
      )}
    </section>
  );
}
