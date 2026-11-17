import { describe, expect, test } from "bun:test";
import {
  allQuestions,
  type ExamSet,
  ExamSetSchema,
  isConfidentialTerm,
} from "./schema";

function makeSet(overrides: Partial<ExamSet> = {}): ExamSet {
  const option = (label: "A" | "B") => ({
    label,
    intro: { da: `Situation ${label} viser noget.` },
    question: {
      id: `q1-${label.toLowerCase()}`,
      da: "Hvorfor tror du, det er sådan?",
    },
    followUps: [
      { id: `q1-${label.toLowerCase()}-f1`, da: "Hvorfor?/Hvorfor ikke?" },
    ],
  });
  return {
    id: "2024-s",
    label: "Maj-juni 2024",
    format: "current",
    source: { title: "Test" },
    topics: [
      {
        id: "emne-a",
        letter: "A",
        title: { da: "Emne" },
        firstQuestion: [option("A"), option("B")],
        secondQuestion: {
          question: {
            id: "q2",
            da: "Hvilke fordele og ulemper mener du, der kan være ved det?",
          },
          followUps: [],
        },
      },
    ],
    ...overrides,
  };
}

describe("isConfidentialTerm", () => {
  test("summer 2024 and earlier are public", () => {
    expect(isConfidentialTerm("2024-s")).toBe(false);
    expect(isConfidentialTerm("2019-v")).toBe(false);
  });
  test("winter 2024 and later are confidential", () => {
    expect(isConfidentialTerm("2024-v")).toBe(true);
    expect(isConfidentialTerm("2025-s")).toBe(true);
  });
});

describe("ExamSetSchema", () => {
  test("accepts a valid set and fills defaults", () => {
    const result = ExamSetSchema.safeParse(makeSet());
    expect(result.success).toBe(true);
  });

  test("rejects confidential terms", () => {
    const result = ExamSetSchema.safeParse(makeSet({ id: "2024-v" }));
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("confidential");
  });

  test("rejects duplicate question ids within a topic", () => {
    const set = makeSet();
    const topic = set.topics[0];
    if (!topic) throw new Error("fixture");
    topic.secondQuestion.question.id = "q1-a";
    expect(ExamSetSchema.safeParse(set).success).toBe(false);
  });

  test("current format requires intro lines", () => {
    const set = makeSet();
    const option = set.topics[0]?.firstQuestion[0];
    if (!option) throw new Error("fixture");
    delete option.intro;
    expect(ExamSetSchema.safeParse(set).success).toBe(false);
    expect(
      ExamSetSchema.safeParse({ ...set, format: "legacy-description" }).success,
    ).toBe(true);
  });

  test("answer status defaults to draft", () => {
    const set = makeSet();
    const q = set.topics[0]?.firstQuestion[0]?.question;
    if (!q) throw new Error("fixture");
    (q as { answer?: unknown }).answer = {
      sentences: ["Jeg tror, det skyldes mange ting."],
      en: "I think…",
    };
    const parsed = ExamSetSchema.parse(set);
    expect(parsed.topics[0]?.firstQuestion[0]?.question.answer?.status).toBe(
      "draft",
    );
  });
});

test("allQuestions returns questions in exam order", () => {
  const topic = makeSet().topics[0];
  if (!topic) throw new Error("fixture");
  expect(allQuestions(topic).map((q) => q.id)).toEqual([
    "q1-a",
    "q1-a-f1",
    "q1-b",
    "q1-b-f1",
    "q2",
  ]);
});
