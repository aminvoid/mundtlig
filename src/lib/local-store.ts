"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed stores for per-browser state (progress, preferences, notes).
 * `useSyncExternalStore` keeps every component in sync, also across tabs, and the server
 * snapshot is always the default value, so the static HTML hydrates without mismatches.
 */

type Listener = () => void;

export type LocalStore<T> = {
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
  serverValue: T;
};

export function createLocalStore<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): LocalStore<T> {
  const listeners = new Set<Listener>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return fallback; // storage blocked (private mode etc.)
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      const parsed: unknown = raw === null ? fallback : JSON.parse(raw);
      cachedValue = validate(parsed) ? parsed : fallback;
    } catch {
      cachedValue = fallback;
    }
    return cachedValue;
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: read,
    set(value) {
      const next =
        typeof value === "function" ? (value as (prev: T) => T)(read()) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore quota/blocked storage; the UI still works for this session.
        cachedRaw = JSON.stringify(next);
        cachedValue = next;
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    serverValue: fallback,
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.get,
    () => store.serverValue,
  );
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const isString = (v: unknown): v is string => typeof v === "string";
const isRate = (v: unknown): v is PlaybackRate => v === 0.75 || v === 1;

export type PlaybackRate = 0.75 | 1;

/** Question keys (`<set>/<topic>/<question>`) the user marked as practised. */
export const practisedStore = createLocalStore<string[]>(
  "pd3.practised.v1",
  [],
  isStringArray,
);
/** Show English translations next to the Danish text. */
export const showEnglishStore = createLocalStore<boolean>(
  "pd3.showEnglish.v1",
  false,
  isBoolean,
);
/** Preferred playback speed for answers. */
export const playbackRateStore = createLocalStore<PlaybackRate>(
  "pd3.rate.v1",
  1,
  isRate,
);
/** Delprøve 1 notes (topic and outline). */
export const presentationTopicStore = createLocalStore<string>(
  "pd3.d1.topic.v1",
  "",
  isString,
);
export const presentationOutlineStore = createLocalStore<string>(
  "pd3.d1.outline.v1",
  "",
  isString,
);

export function togglePractised(key: string) {
  practisedStore.set((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
  );
}
