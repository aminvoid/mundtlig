/**
 * Validate every set file and report what is still missing.
 *
 *   bun run content:validate
 *
 * Fails (exit code 1) on schema errors, TODO placeholders or missing picture files.
 * Missing translations, answers and audio are reported but don't fail.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { loadImage } from "@napi-rs/canvas";
import { audioFileName } from "../src/lib/audio";
import {
  audioFileExists,
  ContentError,
  listSetFiles,
  PUBLIC_DIR,
  readSet,
} from "../src/lib/content-fs";
import { collectSpeech } from "../src/lib/content-view";
import { allQuestions, type ExamSet } from "../src/lib/schema";

let errors = 0;
const files = await listSetFiles();
if (files.length === 0) {
  console.error("✖ No set files in content/sets");
  process.exit(1);
}

for (const file of files) {
  let set: ExamSet;
  try {
    set = await readSet(file);
  } catch (error) {
    errors++;
    console.error(
      `✖ ${error instanceof ContentError ? error.message : String(error)}\n`,
    );
    continue;
  }

  const problems: string[] = [];
  const notes: string[] = [];
  if (JSON.stringify(set).includes("TODO"))
    problems.push("contains TODO placeholders");

  let questions = 0;
  let answers = 0;
  let reviewed = 0;
  let missingEn = 0;
  for (const topic of set.topics) {
    if (topic.picture) {
      const file = path.join(PUBLIC_DIR, topic.picture.file);
      if (!existsSync(file)) {
        problems.push(
          `${topic.id}: picture file ${topic.picture.file} is missing`,
        );
      } else {
        // width/height feed next/image; they must match the real file.
        const image = await loadImage(file);
        if (
          image.width !== topic.picture.width ||
          image.height !== topic.picture.height
        ) {
          problems.push(
            `${topic.id}: picture size in JSON (${topic.picture.width}×${topic.picture.height}) differs from the file (${image.width}×${image.height}); re-run content:picture`,
          );
        }
      }
    }
    if (!topic.picture) notes.push(`${topic.id}: no picture sheet`);
    for (const q of allQuestions(topic)) {
      questions++;
      if (!q.en) missingEn++;
      if (q.answer) answers++;
      if (q.answer?.status === "reviewed") reviewed++;
    }
  }
  const speech = collectSpeech(set);
  const withAudio = speech.filter((s) =>
    audioFileExists(audioFileName(s.role, s.text)),
  ).length;

  const status = problems.length ? "✖" : "✔";
  console.log(`${status} ${file}  (${set.label}, ${set.format})`);
  console.log(
    `   questions ${questions} · answers ${answers} (reviewed ${reviewed}) · translations missing ${missingEn} · audio ${withAudio}/${speech.length}`,
  );
  for (const p of problems) console.log(`   ✖ ${p}`);
  for (const n of notes) console.log(`   · ${n}`);
  errors += problems.length;
}

if (errors > 0) {
  console.error(`\n✖ ${errors} problem(s) found`);
  process.exit(1);
}
console.log("\n✔ All content files are valid");
