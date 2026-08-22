"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { usePersisted } from "./persisted";

export type ThemeId = "daylight" | "meadow" | "ember" | "indigo";

export const THEMES: {
  id: ThemeId;
  name: string;
  note: string;
  band: "light" | "dark";
  /** Swatch: [paper, ink, accent] — drawn, never a screenshot. */
  swatch: [string, string, string];
}[] = [
  {
    id: "daylight",
    name: "Daylight",
    note: "Warm classroom",
    band: "light",
    swatch: ["oklch(97% 0.018 85)", "oklch(26% 0.035 60)", "oklch(62% 0.16 52)"],
  },
  {
    id: "meadow",
    name: "Meadow",
    note: "Cool and calm",
    band: "light",
    swatch: ["oklch(97% 0.02 150)", "oklch(25% 0.04 165)", "oklch(55% 0.14 152)"],
  },
  {
    id: "ember",
    name: "Ember",
    note: "Evening study",
    band: "dark",
    swatch: ["oklch(15% 0.012 55)", "oklch(95% 0.006 65)", "oklch(74% 0.17 58)"],
  },
  {
    id: "indigo",
    name: "Indigo",
    note: "Late night",
    band: "dark",
    swatch: ["oklch(17% 0.045 275)", "oklch(95% 0.012 260)", "oklch(78% 0.13 205)"],
  },
];

const KEY = "lastclass:theme";
const DEFAULT: ThemeId = "daylight";

const Ctx = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { value: theme, set } = usePersisted<ThemeId>(KEY, DEFAULT);
  const valid = THEMES.some((t) => t.id === theme) ? theme : DEFAULT;

  // The inline script in the layout sets this before first paint; this keeps
  // the attribute in step when the choice changes or another tab changes it.
  useEffect(() => {
    document.documentElement.dataset.theme = valid;
  }, [valid]);

  const setTheme = useCallback((t: ThemeId) => set(t), [set]);

  const value = useMemo(
    () => ({ theme: valid, setTheme }),
    [valid, setTheme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
