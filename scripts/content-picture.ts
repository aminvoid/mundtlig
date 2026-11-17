/**
 * Render one page of a picture PDF as the topic's picture sheet.
 *
 *   bun run content:picture <set-id> <topic-id> <pictures.pdf> <page-number> [--crop top,right,bottom,left]
 *
 * --crop cuts off a percentage of each side, e.g. "--crop 5,0,7,0" removes a scanned header and footer.
 *
 * Example:
 *   bun run content:picture 2024-s mangel-paa-arbejdskraft content/sources/2024-s/pictures-b.pdf 1
 *
 * Writes public/sets/<set-id>/<topic-id>.webp and updates the topic's `picture` field.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_DIR, readSet } from "../src/lib/content-fs";
import { fail, parseArgs, writeSet } from "./lib/cli";
import { parseCrop, renderPageToWebp } from "./lib/pdf";

const { positional, flags } = parseArgs();
const [setId, topicId, pdfPath, pageArg] = positional;
if (!setId || !topicId || !pdfPath || !pageArg) {
  fail(
    "usage: bun run content:picture <set-id> <topic-id> <pictures.pdf> <page-number>",
  );
}
const page = Number.parseInt(pageArg, 10);
if (!Number.isInteger(page) || page < 1)
  fail(`page must be a positive number, got "${pageArg}"`);

const set = await readSet(`${setId}.json`);
const topic = set.topics.find((t) => t.id === topicId);
if (!topic)
  fail(
    `topic "${topicId}" not found in ${setId}. Topics: ${set.topics.map((t) => t.id).join(", ")}`,
  );

const crop = typeof flags.crop === "string" ? parseCrop(flags.crop) : undefined;
const { data, width, height } = await renderPageToWebp(pdfPath, page, { crop });
const dir = path.join(PUBLIC_DIR, "sets", setId);
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, `${topicId}.webp`), data);

topic.picture = {
  file: `/sets/${setId}/${topicId}.webp`,
  width,
  height,
  alt: `Arket med to billeder til emnet ${topic.title.da}`,
};
await writeSet(set, { overwrite: true });
console.log(
  `✔ ${topic.picture.file} (${width}×${height}) added to topic "${topicId}"`,
);
