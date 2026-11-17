import { describe, expect, test } from "bun:test";
import { buildSetView } from "./content-view";
import {
  buildSteps,
  EXAM_SECONDS,
  formatClock,
  initialMockExamState,
  type MockExamState,
  mockExamReducer,
  PREVIEW_SECONDS,
  SECOND_QUESTION_AT_SECONDS,
  secondsLeft,
} from "./mock-exam";
import type { ExamSet } from "./schema";

const set: ExamSet = {
  id: "2024-s",
  label: "Maj-juni 2024",
  format: "current",
  source: { title: "Test" },
  topics: [
    {
      id: "emne",
      letter: "A",
      title: { da: "Emne" },
      firstQuestion: (["A", "B"] as const).map((l) => ({
        label: l,
        intro: { da: `Situation ${l} viser noget.` },
        question: { id: `q1-${l.toLowerCase()}`, da: `Spørgsmål ${l}?` },
        followUps: [{ id: `q1-${l.toLowerCase()}-f1`, da: `Opfølgning ${l}?` }],
      })) as ExamSet["topics"][number]["firstQuestion"],
      secondQuestion: {
        question: { id: "q2", da: "Fordele og ulemper?" },
        followUps: [{ id: "q2-f1", da: "Hvorfor?" }],
      },
    },
  ],
};
const topic = buildSetView(set, () => false).topics[0];
if (!topic) throw new Error("fixture");

const T0 = 1_000_000;
const start = (optionIndex = 1): MockExamState =>
  mockExamReducer(initialMockExamState, {
    type: "start",
    topic,
    topicIndex: 0,
    optionIndex,
    now: T0,
  });

describe("buildSteps", () => {
  test("first question of the chosen situation, its follow-ups, then the second question", () => {
    const steps = buildSteps(topic, 1);
    expect(steps.map((s) => s.question.id)).toEqual([
      "q1-b",
      "q1-b-f1",
      "q2",
      "q2-f1",
    ]);
    expect(steps[0]?.lines.map((l) => l.text)).toEqual([
      "Situation B viser noget.",
      "Spørgsmål B?",
    ]);
    expect(steps[2]?.lines[0]?.text).toContain("mere overordnet");
  });
});

describe("mockExamReducer", () => {
  test("starts with a 10-second preview, then asks the first question", () => {
    let s = start();
    expect(s.phase).toBe("preview");
    expect(secondsLeft(s)).toBe(PREVIEW_SECONDS);
    s = mockExamReducer(s, { type: "tick", now: T0 + PREVIEW_SECONDS * 1000 });
    expect(s.phase).toBe("asking");
    if (s.phase === "idle") throw new Error("unreachable");
    expect(s.stepIndex).toBe(0);
    expect(secondsLeft(s)).toBe(EXAM_SECONDS);
  });

  test("'next' skips the preview and moves through the questions", () => {
    let s = mockExamReducer(start(), { type: "next", now: T0 + 2000 });
    expect(s.phase).toBe("asking");
    s = mockExamReducer(s, { type: "next", now: T0 + 3000 });
    if (s.phase === "idle") throw new Error("unreachable");
    expect(s.steps[s.stepIndex]?.question.id).toBe("q1-b-f1");
  });

  test("moves on to the second required question at half time, like the examiner", () => {
    let s = mockExamReducer(start(), { type: "next", now: T0 });
    s = mockExamReducer(s, {
      type: "tick",
      now: T0 + SECOND_QUESTION_AT_SECONDS * 1000,
    });
    if (s.phase === "idle") throw new Error("unreachable");
    expect(s.steps[s.stepIndex]?.question.id).toBe("q2");
    expect(s.reachedIndex).toBe(2);
  });

  test("finishes when time is up or after the last question", () => {
    const asking = mockExamReducer(start(), { type: "next", now: T0 });
    expect(
      mockExamReducer(asking, { type: "tick", now: T0 + EXAM_SECONDS * 1000 })
        .phase,
    ).toBe("finished");

    let s = asking;
    for (let i = 0; i < 4; i++)
      s = mockExamReducer(s, { type: "next", now: T0 + i });
    expect(s.phase).toBe("finished");
  });

  test("reset returns to idle", () => {
    expect(mockExamReducer(start(), { type: "reset" })).toEqual(
      initialMockExamState,
    );
  });
});

test("formatClock", () => {
  expect(formatClock(270)).toBe("4:30");
  expect(formatClock(9)).toBe("0:09");
  expect(formatClock(-3)).toBe("0:00");
});
