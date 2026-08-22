"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { usePersisted } from "./persisted";
import { useRouter } from "next/navigation";
import type { Profile } from "./types";

const KEY = "lastclass:profile";

interface AuthValue {
  profile: Profile | null;
  ready: boolean;
  signIn: (p: Profile) => void;
  signOut: () => void;
  update: (patch: Partial<Profile>) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { value: profile, set, hydrated } = usePersisted<Profile | null>(
    KEY,
    null,
  );

  const signIn = useCallback((p: Profile) => set(p), [set]);
  const signOut = useCallback(() => set(null), [set]);

  const update = useCallback(
    (patch: Partial<Profile>) => {
      if (!profile) return;
      set({ ...profile, ...patch });
    },
    [profile, set],
  );

  const value = useMemo(
    () => ({ profile, ready: hydrated, signIn, signOut, update }),
    [profile, hydrated, signIn, signOut, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Sends unauthenticated visitors to the sign-in screen. */
export function useRequireProfile(): Profile | null {
  const { profile, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !profile) router.replace("/login");
  }, [ready, profile, router]);

  return profile;
}
