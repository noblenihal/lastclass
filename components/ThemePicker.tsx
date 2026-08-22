"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { THEMES, useTheme } from "@/lib/theme";

/** Lets the learner pick the room they'd rather study in. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.name}. Change theme`}
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] px-3 py-1.5 text-[var(--text-sm)] text-[var(--color-ink-2)] transition-[border-color,color] duration-[var(--dur-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]"
      >
        <Palette size={14} />
        <span className="hidden sm:inline">{current.name}</span>
        <Swatch colors={current.swatch} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-[15rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] p-1 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)]"
          >
            {THEMES.map((t) => {
              const on = t.id === theme;
              return (
                <li key={t.id} role="option" aria-selected={on}>
                  <button
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                    className={
                      "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)] " +
                      (on
                        ? "bg-[var(--color-accent-ghost)]"
                        : "hover:bg-[var(--color-paper-3)]")
                    }
                  >
                    <Swatch colors={t.swatch} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[var(--text-sm)] font-medium leading-tight text-[var(--color-ink)]">
                        {t.name}
                      </span>
                      <span className="block text-[var(--text-xs)] text-[var(--color-ink-3)]">
                        {t.note} · {t.band}
                      </span>
                    </span>
                    {on && (
                      <Check size={14} className="text-[var(--color-accent)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Swatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--color-paper-4)]"
      aria-hidden="true"
    >
      {colors.map((c, i) => (
        <span key={i} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  );
}
