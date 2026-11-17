/**
 * Import an official examiner booklet (PDF) into a draft set file.
 *
 *   bun run content:import <set-id> <booklet.pdf> [--force] [--source-url <url>] [--source-title <text>]
 *
 * Example:
 *   bun run content:import 2024-s content/sources/2024-s/booklet.pdf
 *
 * The result is a draft: check every question against the PDF, then add pictures
 * (content:picture), translations and answers.
 */
import path from "node:path";
import { parseSet } from "../src/lib/content-fs";
import { type ExamSet, SetIdSchema } from "../src/lib/schema";
import { parseBooklet } from "./lib/booklet";
import { fail, parseArgs, writeSet } from "./lib/cli";
import { readPdfPages } from "./lib/pdf";

const { positional, flags } = parseArgs();
const [setId, bookletPath] = positional;
if (!setId || !bookletPath)
  fail("usage: bun run content:import <set-id> <booklet.pdf> [--force]");
if (!SetIdSchema.safeParse(setId).success)
  fail(`"${setId}" is not a valid set id (expected e.g. 2024-s or 2023-v)`);
if (!(await Bun.file(bookletPath).exists()))
  fail(`file not found: ${bookletPath}`);

const pages = await readPdfPages(bookletPath);
const parsed = parseBooklet(pages);

console.log(
  `Parsed ${path.basename(bookletPath)}: ${parsed.topics.length} topics, format "${parsed.format}"`,
);
for (const t of parsed.topics)
  console.log(`  ${t.letter}. ${t.title.da}  →  id "${t.id}"`);
if (parsed.warnings.length > 0) {
  console.warn("\n⚠ Check these by hand:");
  for (const w of parsed.warnings) console.warn(`  - ${w}`);
}

const draft: ExamSet = {
  id: setId,
  label:
    typeof flags.label === "string" ? flags.label : (parsed.label ?? setId),
  format: parsed.format,
  source: {
    title:
      typeof flags["source-title"] === "string"
        ? flags["source-title"]
        : `Prøve i Dansk 3, mundtlig del – censor- og eksaminatorhæfte (${parsed.label ?? setId})`,
    ...(typeof flags["source-url"] === "string"
      ? { url: flags["source-url"] }
      : {}),
  },
  topics: parsed.topics,
};

// Validate before writing so a broken parse never lands in content/sets.
parseSet(`${setId}.json`, draft);
const file = await writeSet(draft, { overwrite: flags.force === true });
console.log(`\n✔ Wrote ${path.relative(process.cwd(), file)}`);
console.log(
  "Next: compare with the PDF, then run content:picture for each topic and add answers.",
);
