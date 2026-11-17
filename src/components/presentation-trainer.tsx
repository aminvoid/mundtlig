"use client";

import { Mic, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRecorder } from "@/hooks/use-recorder";
import {
  presentationOutlineStore,
  presentationTopicStore,
  useLocalStore,
} from "@/lib/local-store";
import { formatClock } from "@/lib/mock-exam";
import { cn } from "@/lib/utils";

/** SIRI: the presentation must be "neither shorter nor longer than about 2 minutes". */
const TARGET = 120;
const TOLERANCE = 15;
const MAX_SCALE = 180;

function verdict(seconds: number): { text: string; tone: "ok" | "warn" } {
  if (seconds < TARGET - TOLERANCE)
    return { text: "Too short — aim for about 2 minutes.", tone: "warn" };
  if (seconds > TARGET + TOLERANCE)
    return {
      text: "Too long — the examiner will stop you around 2 minutes.",
      tone: "warn",
    };
  return { text: "Good length — about 2 minutes.", tone: "ok" };
}

const FOLLOW_UP_TYPES = [
  {
    type: "Clarifying",
    da: "Du sagde, at … Vil du godt forklare det lidt nærmere?",
  },
  {
    type: "Going deeper",
    da: "Du sagde, at … Kan du ikke fortælle lidt mere om det?",
  },
  {
    type: "Explaining and justifying",
    da: "Du sagde, at …, men hvorfor tror du så, at …?",
  },
  { type: "Taking a position", da: "Mener du, at …? Hvorfor?/Hvorfor ikke?" },
];

export function PresentationTrainer() {
  const topic = useLocalStore(presentationTopicStore);
  const outline = useLocalStore(presentationOutlineStore);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [record, setRecord] = useState(false);
  const recorder = useRecorder();
  const topicId = useId();
  const outlineId = useId();
  const recordId = useId();

  const running = startedAt !== null;
  const elapsed = running
    ? Math.max(0, (now - startedAt) / 1000)
    : (result ?? 0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Stop the timer if the page is hidden.
  useLayoutEffect(() => () => setStartedAt(null), []);
  const mainButton = useRef<HTMLButtonElement>(null);

  const start = async () => {
    setResult(null);
    recorder.clear();
    // Don't start the clock without the microphone when the user asked to be recorded.
    if (record && !(await recorder.start())) return;
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  };

  const stop = () => {
    if (startedAt === null) return;
    setResult((Date.now() - startedAt) / 1000);
    setStartedAt(null);
    recorder.stop();
  };

  const reset = () => {
    setStartedAt(null);
    setResult(null);
    recorder.clear();
    // The Reset button disappears; keep keyboard focus on the Start button.
    requestAnimationFrame(() => mainButton.current?.focus());
  };

  const finished = result !== null && !running;
  const v = finished ? verdict(result) : null;
  const words = outline.trim() ? outline.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby={`${topicId}-h`}>
        <h2 id={`${topicId}-h`} className="text-lg font-semibold">
          1. Your topic and notes
        </h2>
        <div className="space-y-1">
          <label htmlFor={topicId} className="text-sm font-medium">
            Topic from your school
          </label>
          <input
            id={topicId}
            lang="da"
            value={topic}
            onChange={(e) => presentationTopicStore.set(e.target.value)}
            placeholder="fx Livsstilssygdomme med fokus på diabetes"
            className="block h-10 w-full rounded-lg border bg-background px-3"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={outlineId} className="text-sm font-medium">
            Outline and keywords (what you may bring: one A4 page)
          </label>
          <textarea
            id={outlineId}
            lang="da"
            value={outline}
            onChange={(e) => presentationOutlineStore.set(e.target.value)}
            rows={8}
            placeholder={"Indledning: …\n1. …\n2. …\n3. …\nAfslutning: …"}
            className="block w-full rounded-lg border bg-background p-3 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {words} words · Saved in this browser only. Use keywords, not a
            script — reading aloud lowers your grade.
          </p>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={`${recordId}-h`}>
        <h2 id={`${recordId}-h`} className="text-lg font-semibold">
          2. Time your presentation
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            id={recordId}
            checked={record}
            onCheckedChange={setRecord}
            disabled={running}
          />
          <label htmlFor={recordId}>Record myself</label>
        </div>

        <div className="rounded-xl border p-4">
          <p
            className="font-mono text-5xl tabular-nums"
            role="timer"
            aria-label={`Elapsed ${formatClock(elapsed)}`}
          >
            {formatClock(elapsed)}
          </p>
          <div
            className="relative mt-4 h-3 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div
              className="absolute inset-y-0 bg-green-500/30"
              style={{
                left: `${((TARGET - TOLERANCE) / MAX_SCALE) * 100}%`,
                width: `${((2 * TOLERANCE) / MAX_SCALE) * 100}%`,
              }}
            />
            <div
              className={cn(
                "absolute inset-y-0 left-0 bg-primary transition-[width]",
                elapsed > TARGET + TOLERANCE && "bg-destructive",
              )}
              style={{
                width: `${Math.min(100, (elapsed / MAX_SCALE) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Green zone: 1:45–2:15
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {!running ? (
              <Button type="button" onClick={start} ref={mainButton}>
                <Play aria-hidden />
                {finished ? "Try again" : "Start"}
              </Button>
            ) : (
              <Button type="button" onClick={stop} ref={mainButton}>
                <Square aria-hidden />
                Stop
              </Button>
            )}
            {(finished || running) && (
              <Button type="button" variant="ghost" onClick={reset}>
                <RotateCcw aria-hidden />
                Reset
              </Button>
            )}
            <span
              role="status"
              className="inline-flex items-center gap-1 text-sm text-destructive"
            >
              {recorder.status === "recording" && (
                <>
                  <Mic aria-hidden /> Recording
                </>
              )}
            </span>
          </div>
          <p
            aria-live="polite"
            className={cn(
              "mt-3 font-medium",
              v?.tone === "ok"
                ? "text-green-700 dark:text-green-400"
                : "text-destructive",
            )}
          >
            {v?.text}
          </p>
          {recorder.error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {recorder.error}
            </p>
          )}
          {recorder.url && !running && (
            // biome-ignore lint/a11y/useMediaCaption: the user's own voice recording has no captions
            <audio controls src={recorder.url} className="mt-3 w-full" />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          3. Prepare for the follow-up questions (about 2½ minutes)
        </h2>
        <p className="text-muted-foreground">
          The examiner builds questions from what you said. They must include
          questions that make you explain and take a position. Write 8–10
          questions of these types about your own presentation and practise
          answering them aloud.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FOLLOW_UP_TYPES.map((f) => (
            <li key={f.type} className="rounded-lg border p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {f.type}
              </p>
              <p lang="da" className="mt-1">
                {f.da}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
