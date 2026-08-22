"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * State backed by localStorage, read the way React wants it read.
 *
 * The obvious approach — read storage inside an effect and setState — causes a
 * cascading render on every mount and is what `react-hooks/set-state-in-effect`
 * is warning about. `useSyncExternalStore` exists for exactly this: it gives
 * the server a defined snapshot, subscribes to changes, and never sets state
 * during an effect.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab writing the same key should update this one too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Cached so getSnapshot returns a stable reference between reads. */
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }

  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;

  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

export function writePersisted(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* storage unavailable — the in-memory snapshot still updates */
  }
  cache.delete(key);
  emit();
}

/**
 * Returns the stored value and a setter. `hydrated` is false during the server
 * render and the first client paint, so callers can avoid flashing a default
 * before the real value is known.
 */
export function usePersisted<T>(key: string, fallback: T) {
  const getSnapshot = useCallback(() => read(key, fallback), [key, fallback]);
  // The server has no storage; a fixed snapshot keeps hydration consistent.
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const set = useCallback((next: T | null) => writePersisted(key, next), [key]);

  return { value, set, hydrated };
}
