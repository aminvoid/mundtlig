import { describe, expect, test } from "bun:test";
import { audioFileName } from "./audio";
import { listSetFiles, readAllSets } from "./content-fs";
import { buildSetView, collectSpeech } from "./content-view";
import { allQuestions } from "./schema";

/** Guards the real content files in content/sets, so a broken edit fails the tests. */
const sets = await readAllSets();

describe("content files", () => {
  test("there is at least one set and every file parses", async () => {
    expect((await listSetFiles()).length).toBe(sets.length);
    expect(sets.length).toBeGreaterThan(0);
  });

  for (const set of sets) {
    test(`${set.id}: every question has a translation and no TODO is left`, () => {
      expect(JSON.stringify(set)).not.toContain("TODO");
      for (const topic of set.topics) {
        for (const q of allQuestions(topic))
          expect(q.en, `${topic.id}/${q.id}`).toBeTruthy();
      }
    });

    test(`${set.id}: answers are speakable (one sentence per item, no abbreviations)`, () => {
      for (const topic of set.topics) {
        for (const q of allQuestions(topic)) {
          for (const sentence of q.answer?.sentences ?? []) {
            expect(sentence, `${topic.id}/${q.id}`).toMatch(/[.!?]$/);
            expect(sentence, `${topic.id}/${q.id}`).not.toMatch(
              /\b(fx|osv|bl\.a)\b/,
            );
          }
        }
      }
    });
  }
});

describe("view model", () => {
  test("audio src is set only when the file exists", async () => {
    const [set] = await readAllSets();
    if (!set) throw new Error("no content");
    const first = set.topics[0]?.firstQuestion[0]?.question;
    if (!first) throw new Error("no question");
    const expected = audioFileName("examiner", first.da);

    const none = buildSetView(set, () => false);
    expect(
      none.topics[0]?.firstQuestion[0]?.question.speech.src,
    ).toBeUndefined();

    const all = buildSetView(set, () => true);
    expect(all.topics[0]?.firstQuestion[0]?.question.speech.src).toBe(
      `/audio/${expected}`,
    );
    expect(all.topics[0]?.firstQuestion[0]?.question.key).toBe(
      `${set.id}/${set.topics[0]?.id}/${first.id}`,
    );
  });

  test("collectSpeech has no duplicates and covers every question", async () => {
    const [set] = await readAllSets();
    if (!set) throw new Error("no content");
    const items = collectSpeech(set);
    const keys = items.map((i) => `${i.role}|${i.text}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const topic of set.topics) {
      for (const q of allQuestions(topic))
        expect(keys).toContain(`examiner|${q.da}`);
    }
  });

  test("audio file names are stable and voice-specific", () => {
    expect(audioFileName("answer", "Hej  med dig.")).toBe(
      audioFileName("answer", "Hej med dig."),
    );
    expect(audioFileName("answer", "Hej.")).not.toBe(
      audioFileName("examiner", "Hej."),
    );
  });
});
