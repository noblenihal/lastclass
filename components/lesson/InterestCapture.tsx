"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { Button } from "@/components/ui";

export function InterestCapture() {
  const { session, setSession } = useSession();
  const { profile, update } = useAuth();
  const [value, setValue] = useState(profile?.interest ?? "");

  function save() {
    const v = value.trim();
    if (v.length < 2 || !session) return;
    update({ interest: v });
    setSession({ ...session, interest: v });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-ghost)] p-4">
      <label
        htmlFor="interest"
        className="block text-[var(--text-base)] font-medium text-[var(--color-ink)]"
      >
        What do you already know well?
      </label>
      <p className="mb-3 mt-1 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
        This level explains the hard parts by comparing them to something
        familiar. Name a hobby, a job, a sport.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          id="interest"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Cricket, cooking, Formula 1…"
          className="min-w-[12rem] flex-1 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)] px-4 py-2.5 text-[var(--text-base)] text-[var(--color-ink)] outline-none transition-[border-color] duration-[var(--dur-fast)] placeholder:text-[var(--color-ink-4)] focus:border-[var(--color-accent)]"
        />
        <Button onClick={save} disabled={value.trim().length < 2}>
          Save
        </Button>
      </div>
    </div>
  );
}
