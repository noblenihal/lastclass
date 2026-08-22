"use client";

import { motion } from "framer-motion";
import { Keyboard, Mic, MicOff } from "lucide-react";
import { useDictation } from "@/lib/speech";
import { useMotionSafe } from "@/lib/a11y";
import { Button } from "@/components/ui";

/* ---------------------------------------------------------------
   Voice input with an always-available typed fallback. Speech
   recognition is Chrome-only, so the mic can never be the only door.
   --------------------------------------------------------------- */
export function VoicePad({
  dictation,
  typed,
  setTyped,
  placeholder,
}: {
  dictation: ReturnType<typeof useDictation>;
  typed: boolean;
  setTyped: (v: boolean) => void;
  placeholder: string;
}) {
  const motion$ = useMotionSafe();
  const useKeyboard = typed || !dictation.supported;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
          {useKeyboard ? "Typed" : dictation.listening ? "Listening…" : "Your turn"}
        </span>
        <button
          type="button"
          onClick={() => setTyped(!typed)}
          className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors duration-[var(--dur-fast)]"
        >
          {useKeyboard ? <Mic size={13} /> : <Keyboard size={13} />}
          {useKeyboard ? "Use voice" : "Type instead"}
        </button>
      </div>

      <textarea
        value={dictation.transcript}
        onChange={(e) => dictation.setManual(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-[var(--radius-md)] bg-[var(--color-paper-2)] border border-[var(--color-paper-4)] px-4 py-3 text-[var(--text-lg)] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)] outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-[var(--color-accent)] focus:shadow-[var(--glow)]"
      />

      {!useKeyboard && (
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant={dictation.listening ? "ghost" : "solid"}
            onClick={dictation.listening ? dictation.stop : dictation.start}
            className="!px-4 !py-2"
          >
            {dictation.listening ? <MicOff size={14} /> : <Mic size={14} />}
            {dictation.listening ? "Stop" : "Speak"}
          </Button>
          {dictation.listening && (
            <span className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 0.9,
                    repeat: motion$.repeat(),
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                  className="block h-4 w-[3px] rounded-full bg-[var(--color-accent)]"
                />
              ))}
            </span>
          )}
          {dictation.error && (
            <span className="text-[var(--text-sm)] text-[var(--color-urgent)]">
              {dictation.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
