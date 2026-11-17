"use client";

import {
  Mic,
  RotateCcw,
  Shuffle,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { EnglishText } from "@/components/english-toggle";
import { QuestionCard } from "@/components/question-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRecorder } from "@/hooks/use-recorder";
import { useSpeechPlayer } from "@/hooks/use-speech-player";
import type { SpeechItem, TopicView } from "@/lib/content-view";
import {
  type ActiveMockExamState,
  EXAM_SECONDS,
  formatClock,
  initialMockExamState,
  type MockStep,
  mockExamReducer,
  PREVIEW_SECONDS,
  secondsLeft,
} from "@/lib/mock-exam";

type Pending = { topicIndex: number; optionIndex: number };
type View = "setup" | "intro" | "preview" | "asking" | "finished";

const STATUS: Record<Exclude<View, "setup">, string> = {
  intro: "The examiner is introducing the pictures",
  preview: "Look at the pictures",
  asking: "Answer the examiner",
  finished: "The exam is over",
};

/**
 * Delprøve 2 mock exam: random topic → examiner intro → 10 s with the pictures → about 4½ minutes of
 * questions read aloud by the examiner voice → review with suggested answers and your recording.
 */
export function MockExam({ topics }: { topics: TopicView[] }) {
  const [state, dispatch] = useReducer(mockExamReducer, initialMockExamState);
  const [pending, setPending] = useState<Pending | null>(null);
  const [chosen, setChosen] = useState<string>("random");
  const [record, setRecord] = useState(false);
  const [showText, setShowText] = useState(false);
  const recorder = useRecorder();
  const examiner = useSpeechPlayer();
  const selectId = useId();
  const recordId = useId();
  const textId = useId();

  // Keyboard focus follows the exam: each view's main control gets focus when the view changes,
  // so focus never falls back to <body> when the previous control disappears.
  const primaryRef = useRef<HTMLElement | null>(null);
  const setPrimary = useCallback((el: HTMLElement | null) => {
    primaryRef.current = el;
  }, []);
  const interacted = useRef(false);

  const active = state.phase === "idle" ? null : state;
  const topicIndex = active?.topicIndex ?? pending?.topicIndex;
  const topic = topicIndex === undefined ? undefined : topics[topicIndex];
  const view: View =
    state.phase === "idle" ? (pending ? "intro" : "setup") : state.phase;

  const play = examiner.play;
  const stopSpeaking = examiner.stop;
  const say = useCallback(
    (lines: SpeechItem[], onEnd?: () => void) =>
      play(0, { items: lines, onEnd }),
    [play],
  );
  const stopRecording = recorder.stop;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs on every view change to focus that view's main control
  useEffect(() => {
    if (interacted.current) primaryRef.current?.focus();
  }, [view]);

  // Timer: tick while the countdown runs (cleanup pauses it when the page is hidden).
  const running = view === "preview" || view === "asking";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      250,
    );
    return () => window.clearInterval(id);
  }, [running]);

  // The exam can't be paused: leaving the page ends it.
  useLayoutEffect(
    () => () => {
      dispatch({ type: "reset" });
      setPending(null);
    },
    [],
  );

  // The examiner reads each question when it comes up.
  const stepIndex = active?.stepIndex;
  const steps = active?.steps;
  useEffect(() => {
    if (view !== "asking" || !steps || stepIndex === undefined) return;
    const step = steps[stepIndex];
    if (step) say(step.lines);
  }, [view, stepIndex, steps, say]);

  // When the exam ends: closing line, stop recording.
  useEffect(() => {
    if (view === "finished" && topic) {
      say([topic.closing.speech]);
      stopRecording();
    }
  }, [view, topic, say, stopRecording]);

  const start = async () => {
    if (topics.length === 0) return;
    interacted.current = true;
    const index =
      chosen === "random"
        ? Math.floor(Math.random() * topics.length)
        : Number(chosen);
    const picked = topics[index];
    if (!picked) return;
    // Don't start without the microphone when the user asked to be recorded.
    if (record && !(await recorder.start())) return;
    const next: Pending = {
      topicIndex: index,
      optionIndex: Math.random() < 0.5 ? 0 : 1,
    };
    setPending(next);
    // The examiner introduces the pictures; the 10-second look starts when the intro ends.
    say([picked.examinerIntro.speech], () =>
      dispatch({ type: "start", topic: picked, ...next, now: Date.now() }),
    );
  };

  const skipIntro = () => {
    if (!pending || !topic) return;
    stopSpeaking();
    dispatch({ type: "start", topic, ...pending, now: Date.now() });
  };

  const restart = () => {
    stopSpeaking();
    stopRecording();
    recorder.clear();
    dispatch({ type: "reset" });
    setPending(null);
  };

  if (topics.length === 0) return <p>No topics yet. Add an exam set first.</p>;

  const seconds = active ? secondsLeft(active) : PREVIEW_SECONDS;
  const step =
    active && view === "asking" ? active.steps[active.stepIndex] : undefined;
  const liveMessage =
    view === "setup"
      ? ""
      : [
          STATUS[view],
          step && stepLabel(step),
          view === "asking" && milestone(seconds),
        ]
          .filter(Boolean)
          .join(". ");

  return (
    <section className="space-y-6" aria-label="Mock exam">
      {/* Always mounted, so screen readers announce every change (phase, question, time left). */}
      <p role="status" className="sr-only">
        {liveMessage}
      </p>

      {view === "setup" && (
        <div className="space-y-6">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              The examiner introduces the topic and puts two pictures in front
              of you.
            </li>
            <li>You get {PREVIEW_SECONDS} seconds to look at them.</li>
            <li>
              You answer questions for about {formatClock(EXAM_SECONDS)}{" "}
              minutes: the first required question about one situation,
              follow-ups, then a more general second question.
            </li>
          </ol>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label htmlFor={selectId} className="text-sm font-medium">
                Topic
              </label>
              <select
                id={selectId}
                value={chosen}
                onChange={(e) => setChosen(e.target.value)}
                className="block h-9 w-full rounded-lg border bg-background px-3 text-sm sm:w-auto"
              >
                <option value="random">
                  Draw at random (like the real exam)
                </option>
                {topics.map((t, i) => (
                  <option
                    key={`${t.setId}/${t.id}`}
                    value={String(i)}
                    lang="da"
                  >
                    {t.title.da} ({t.setLabel})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-1.5 text-sm">
              <Switch
                id={recordId}
                checked={record}
                onCheckedChange={setRecord}
              />
              <label htmlFor={recordId}>Record myself</label>
            </div>
          </div>
          <Button type="button" size="lg" onClick={start} ref={setPrimary}>
            <Shuffle aria-hidden />
            Start mock exam
          </Button>
          {recorder.error && (
            <p role="alert" className="text-sm text-destructive">
              {recorder.error}
            </p>
          )}
        </div>
      )}

      {view !== "setup" && topic && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" lang="da">
              Emne {topic.letter} · {topic.setLabel}
            </Badge>
            <h2 lang="da" className="text-xl font-semibold">
              {topic.title.da}
            </h2>
            {recorder.status === "recording" && (
              <Badge variant="destructive">
                <Mic aria-hidden /> Recording
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={restart}
            >
              <RotateCcw aria-hidden />
              Start over
            </Button>
          </div>
          {recorder.error && (
            <p role="alert" className="text-sm text-destructive">
              {recorder.error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <p className="font-medium" aria-hidden>
              {STATUS[view]}
            </p>
            {running && (
              <p
                className="font-mono text-2xl tabular-nums"
                role="timer"
                aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds left`}
              >
                {formatClock(seconds)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Switch
              id={textId}
              checked={showText}
              onCheckedChange={setShowText}
            />
            <label htmlFor={textId}>
              Show what the examiner says (in the real exam you only hear it)
            </label>
          </div>
          {showText && (
            <Transcript
              lines={transcriptLines(view, topic, step)}
              en={step?.question.en}
            />
          )}

          {view !== "finished" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <PictureOrCaptions topic={topic} />
              <div className="space-y-4">
                {view === "intro" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={skipIntro}
                    ref={setPrimary}
                  >
                    <SkipForward aria-hidden />
                    Skip intro
                  </Button>
                )}
                {view === "preview" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => dispatch({ type: "next", now: Date.now() })}
                    ref={setPrimary}
                  >
                    <SkipForward aria-hidden />
                    I'm ready
                  </Button>
                )}
                {step && active && (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {stepLabel(step)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          dispatch({ type: "next", now: Date.now() })
                        }
                        ref={setPrimary}
                      >
                        <SkipForward aria-hidden />
                        {active.stepIndex >= active.steps.length - 1
                          ? "Finish"
                          : "Next question"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => say(step.lines)}
                      >
                        <Volume2 aria-hidden />
                        Repeat question
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          dispatch({ type: "finish", now: Date.now() })
                        }
                      >
                        <Square aria-hidden />
                        End exam
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "finished" && active && (
            <Review
              state={active}
              topic={topic}
              recordingUrl={recorder.url}
              headingRef={setPrimary}
            />
          )}
        </>
      )}
    </section>
  );
}

function stepLabel(step: MockStep): string {
  if (step.kind === "follow-up") return "Follow-up question";
  return step.part === "first"
    ? "First required question"
    : "Second required question (more general)";
}

/** Announce the last minute and the last 30 seconds (bucketed, so it isn't read every second). */
function milestone(seconds: number): string {
  if (seconds <= 30) return "Less than 30 seconds left";
  if (seconds <= 60) return "Less than 1 minute left";
  return "";
}

function transcriptLines(
  view: View,
  topic: TopicView,
  step: MockStep | undefined,
): string[] {
  if (view === "intro" || view === "preview") return [topic.examinerIntro.da];
  if (view === "finished") return [topic.closing.da];
  return step?.lines.map((l) => l.text) ?? [];
}

function Transcript({ lines, en }: { lines: string[]; en?: string }) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      {lines.map((line) => (
        <p key={line} lang="da" className="text-lg">
          {line}
        </p>
      ))}
      <EnglishText>{en}</EnglishText>
    </div>
  );
}

function PictureOrCaptions({ topic }: { topic: TopicView }) {
  if (topic.picture) {
    return (
      <Image
        src={topic.picture.file}
        width={topic.picture.width}
        height={topic.picture.height}
        alt={topic.picture.alt}
        lang="da"
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="h-auto w-full rounded-lg border bg-white"
        priority
      />
    );
  }
  return (
    <ul className="space-y-2 rounded-lg border p-4" lang="da">
      {topic.firstQuestion.map((o) => (
        <li key={o.label}>
          <strong>Situation {o.label}:</strong> {o.intro?.da ?? "—"}
        </li>
      ))}
    </ul>
  );
}

function Review({
  state,
  topic,
  recordingUrl,
  headingRef,
}: {
  state: ActiveMockExamState;
  topic: TopicView;
  recordingUrl: string | null;
  headingRef: (el: HTMLElement | null) => void;
}) {
  const asked = state.steps.slice(0, Math.max(1, state.reachedIndex + 1));
  return (
    <div className="space-y-6">
      <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        Questions you were asked
      </h3>
      {recordingUrl && (
        <div className="space-y-2 rounded-xl border p-4">
          <h4 className="font-semibold">Your recording</h4>
          {/* biome-ignore lint/a11y/useMediaCaption: the user's own voice recording has no captions */}
          <audio controls src={recordingUrl} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Stays in this browser tab only. Compare it with the suggested
            answers below.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {asked.map((step) => (
          <QuestionCard
            key={step.question.key}
            question={step.question}
            kind={stepLabel(step)}
            headingLevel={4}
          />
        ))}
        {state.reachedIndex + 1 < state.steps.length && (
          <p className="text-sm text-muted-foreground">
            You didn't reach every question. Open the topic page to practise the
            rest: <span lang="da">{topic.title.da}</span>.
          </p>
        )}
      </div>
    </div>
  );
}
