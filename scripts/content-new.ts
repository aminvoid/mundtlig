/**
 * Create an empty set file to fill in by hand (when there is no booklet PDF to import).
 *
 *   bun run content:new <set-id> "<label>" [--format current|legacy-description]
 *
 * Example:
 *   bun run content:new 2023-v "November-december 2023"
 */
import path from "node:path";
import type { ExamSet, Topic } from "../src/lib/schema";
import { SetIdSchema } from "../src/lib/schema";
import { fail, parseArgs, writeSet } from "./lib/cli";

const { positional, flags } = parseArgs();
const [setId, label] = positional;
if (!setId || !label)
  fail(
    'usage: bun run content:new <set-id> "<label>" [--format current|legacy-description]',
  );
if (!SetIdSchema.safeParse(setId).success)
  fail(`"${setId}" is not a valid set id (expected e.g. 2024-s)`);
const format =
  flags.format === "legacy-description" ? "legacy-description" : "current";

const emptyTopic = (letter: Topic["letter"]): Topic => ({
  id: `emne-${letter.toLowerCase()}`,
  letter,
  title: { da: `TODO titel ${letter}` },
  firstQuestion: (["A", "B"] as const).map((l) => ({
    label: l,
    ...(format === "current"
      ? { intro: { da: `Situation ${l} viser TODO.` } }
      : {}),
    question: { id: `q1-${l.toLowerCase()}`, da: "TODO" },
    followUps: [{ id: `q1-${l.toLowerCase()}-f1`, da: "TODO" }],
  })) as Topic["firstQuestion"],
  secondQuestion: {
    question: { id: "q2", da: "TODO" },
    followUps: [{ id: "q2-f1", da: "TODO" }],
  },
});

const set: ExamSet = {
  id: setId,
  label,
  format,
  source: {
    title: `Prøve i Dansk 3, mundtlig del – censor- og eksaminatorhæfte (${label})`,
  },
  topics: (["A", "B", "C"] as const).map(emptyTopic),
};

const file = await writeSet(set);
console.log(
  `✔ Created ${path.relative(process.cwd(), file)} — replace every TODO, then run content:validate`,
);
