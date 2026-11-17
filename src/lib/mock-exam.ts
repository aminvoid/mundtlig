import type { QuestionView, SpeechItem, TopicView } from "./content-view";

/**
 * Mock exam for delprøve 2, following the official examiner booklet:
 * the candidate draws a topic, looks at the two pictures for about 10 seconds, then answers
 * questions for about 4½ minutes — the first required question with follow-ups, then (after
 * the examiner announces it) the more general second required question with follow-ups.
 *
 * Pure reducer: time is passed in, so the flow is deterministic and unit-testable.
 */

export const PREVIEW_SECONDS = 10;
export const EXAM_SECONDS = 270;
/** When the examiner moves on to the second required question if the candidate is still on the first. */
export const SECOND_QUESTION_AT_SECONDS = 135;

export type MockStep = {
  part: "first" | "second";
  kind: "required" | "follow-up";
  /** What the examiner says at this step, in order. */
  lines: SpeechItem[];
  question: QuestionView;
};

export type MockExamState =
  | { phase: "idle" }
  | {
      phase: "preview" | "asking" | "finished";
      topicIndex: number;
      optionIndex: number;
      steps: MockStep[];
      stepIndex: number;
      /** Highest step reached; used to show what was asked. */
      reachedIndex: number;
      previewEndsAt: number;
      examStartedAt: number;
      examEndsAt: number;
      now: number;
    };

export type MockExamAction =
  | {
      type: "start";
      topic: TopicView;
      topicIndex: number;
      optionIndex: number;
      now: number;
    }
  | { type: "tick"; now: number }
  | { type: "next"; now: number }
  | { type: "finish"; now: number }
  | { type: "reset" };

export type ActiveMockExamState = Exclude<MockExamState, { phase: "idle" }>;

export const initialMockExamState: MockExamState = { phase: "idle" };

export function buildSteps(topic: TopicView, optionIndex: number): MockStep[] {
  const option = topic.firstQuestion[optionIndex] ?? topic.firstQuestion[0];
  if (!option) return [];
  const second = topic.secondQuestion;
  return [
    {
      part: "first",
      kind: "required",
      lines: [
        ...(option.intro ? [option.intro.speech] : []),
        option.question.speech,
      ],
      question: option.question,
    },
    ...option.followUps.map(
      (q): MockStep => ({
        part: "first",
        kind: "follow-up",
        lines: [q.speech],
        question: q,
      }),
    ),
    {
      part: "second",
      kind: "required",
      lines: [topic.transition.speech, second.question.speech],
      question: second.question,
    },
    ...second.followUps.map(
      (q): MockStep => ({
        part: "second",
        kind: "follow-up",
        lines: [q.speech],
        question: q,
      }),
    ),
  ];
}

function firstSecondPartIndex(steps: MockStep[]): number {
  return steps.findIndex((s) => s.part === "second");
}

export function mockExamReducer(
  state: MockExamState,
  action: MockExamAction,
): MockExamState {
  switch (action.type) {
    case "reset":
      return initialMockExamState;

    case "start": {
      const steps = buildSteps(action.topic, action.optionIndex);
      const previewEndsAt = action.now + PREVIEW_SECONDS * 1000;
      return {
        phase: "preview",
        topicIndex: action.topicIndex,
        optionIndex: action.optionIndex,
        steps,
        stepIndex: 0,
        reachedIndex: -1,
        previewEndsAt,
        examStartedAt: previewEndsAt,
        examEndsAt: previewEndsAt + EXAM_SECONDS * 1000,
        now: action.now,
      };
    }

    case "tick": {
      if (state.phase === "idle" || state.phase === "finished") return state;
      const now = action.now;
      if (state.phase === "preview") {
        return now >= state.previewEndsAt
          ? startAsking(state, state.previewEndsAt, now)
          : { ...state, now };
      }
      if (now >= state.examEndsAt) return { ...state, phase: "finished", now };
      // Like the examiner: move on to the general question at about half time.
      const secondIndex = firstSecondPartIndex(state.steps);
      const elapsed = (now - state.examStartedAt) / 1000;
      if (
        secondIndex > state.stepIndex &&
        elapsed >= SECOND_QUESTION_AT_SECONDS
      ) {
        return {
          ...state,
          stepIndex: secondIndex,
          reachedIndex: Math.max(state.reachedIndex, secondIndex),
          now,
        };
      }
      return { ...state, now };
    }

    case "next": {
      if (state.phase === "preview")
        return startAsking(state, action.now, action.now);
      if (state.phase !== "asking") return state;
      if (state.stepIndex >= state.steps.length - 1)
        return { ...state, phase: "finished", now: action.now };
      const stepIndex = state.stepIndex + 1;
      return {
        ...state,
        stepIndex,
        reachedIndex: Math.max(state.reachedIndex, stepIndex),
        now: action.now,
      };
    }

    case "finish":
      if (state.phase === "idle") return state;
      return { ...state, phase: "finished", now: action.now };
  }
}

function startAsking(
  state: ActiveMockExamState,
  startedAt: number,
  now: number,
): MockExamState {
  return {
    ...state,
    phase: "asking",
    stepIndex: 0,
    reachedIndex: 0,
    examStartedAt: startedAt,
    examEndsAt: startedAt + EXAM_SECONDS * 1000,
    now,
  };
}

/** Seconds left in the current phase (never negative). */
export function secondsLeft(state: MockExamState): number {
  if (state.phase === "preview")
    return Math.max(0, Math.ceil((state.previewEndsAt - state.now) / 1000));
  if (state.phase === "asking")
    return Math.max(0, Math.ceil((state.examEndsAt - state.now) / 1000));
  return 0;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
