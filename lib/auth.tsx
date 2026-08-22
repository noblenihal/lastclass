"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

function read(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return p && typeof p.email === "string" ? p : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(read());
    setReady(true);
  }, []);

  const signIn = useCallback((p: Profile) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable — session stays in memory for this tab */
    }
    setProfile(p);
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
    setProfile(null);
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ profile, ready, signIn, signOut, update }),
    [profile, ready, signIn, signOut, update],
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
