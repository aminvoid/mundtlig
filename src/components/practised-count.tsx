"use client";

import { practisedStore, useLocalStore } from "@/lib/local-store";

/** "3 of 18 questions" — how many of the given questions are marked as practised. */
export function PractisedCount({ keys }: { keys: string[] }) {
  const practised = useLocalStore(practisedStore);
  const done = keys.filter((k) => practised.includes(k)).length;
  return (
    <span className="tabular-nums">
      {done} of {keys.length} questions
    </span>
  );
}
