/**
 * Render a range of PDF pages as one numbered contact sheet, to find the picture pages of a topic
 * (e.g. in a scanned compilation).
 *
 *   bun run content:preview <file.pdf> [--from 1] [--to 12]
 *
 * Writes content/sources/previews/<file>-p<from>-<to>.png (git-ignored) and prints its path.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { fail, parseArgs } from "./lib/cli";

const THUMB_WIDTH = 300;
const COLUMNS = 6;
const LABEL_HEIGHT = 28;

const { positional, flags } = parseArgs();
const [file] = positional;
if (!file)
  fail("usage: bun run content:preview <file.pdf> [--from 1] [--to 12]");
if (!(await Bun.file(file).exists())) fail(`file not found: ${file}`);

const pdf = await getDocumentProxy(
  new Uint8Array(await Bun.file(file).arrayBuffer()),
);
const from = Math.max(1, Number(flags.from ?? 1));
const to = Math.min(pdf.numPages, Number(flags.to ?? from + 11));
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to)
  fail(`invalid range ${from}–${to}`);

const thumbs = [];
for (let page = from; page <= to; page++) {
  const png = await renderPageAsImage(pdf, page, {
    canvasImport: () => import("@napi-rs/canvas"),
    width: THUMB_WIDTH,
  });
  thumbs.push({ page, image: await loadImage(Buffer.from(png)) });
}

const cellHeight =
  Math.max(...thumbs.map((t) => t.image.height)) + LABEL_HEIGHT;
const rows = Math.ceil(thumbs.length / COLUMNS);
const canvas = createCanvas(
  Math.min(thumbs.length, COLUMNS) * THUMB_WIDTH,
  rows * cellHeight,
);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = "bold 20px sans-serif";
for (const [i, { page, image }] of thumbs.entries()) {
  const x = (i % COLUMNS) * THUMB_WIDTH;
  const y = Math.floor(i / COLUMNS) * cellHeight;
  ctx.fillStyle = "#c00000";
  ctx.fillText(`page ${page}`, x + 6, y + 21);
  ctx.drawImage(image, x, y + LABEL_HEIGHT);
}

const outDir = path.join(process.cwd(), "content", "sources", "previews");
await mkdir(outDir, { recursive: true });
const out = path.join(
  outDir,
  `${path.basename(file, ".pdf").replace(/\s+/g, "_")}-p${from}-${to}.png`,
);
await Bun.write(out, await canvas.encode("png"));
console.log(
  `✔ ${path.relative(process.cwd(), out)}  (pages ${from}–${to} of ${pdf.numPages})`,
);
