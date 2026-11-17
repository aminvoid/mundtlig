import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { AUDIO_DIR } from "./audio";
import { buildSetView, type SetView } from "./content-view";
import { type ExamSet, ExamSetSchema } from "./schema";

/**
 * Reads and validates content files from disk. No Next.js imports, so the same code runs in
 * the app (through `content.ts`), in the Bun scripts and in tests.
 */

export const PROJECT_ROOT = process.cwd();
export const SETS_DIR = path.join(PROJECT_ROOT, "content", "sets");
export const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

export class ContentError extends Error {
  override name = "ContentError";
}

/** Parse one set file. Throws a readable `ContentError` when the file doesn't match the schema. */
export function parseSet(fileName: string, data: unknown): ExamSet {
  const result = ExamSetSchema.safeParse(data);
  if (!result.success) {
    throw new ContentError(
      `${fileName} is invalid:\n${z.prettifyError(result.error)}`,
    );
  }
  const expected = `${result.data.id}.json`;
  if (fileName !== expected) {
    throw new ContentError(
      `${fileName}: file name must match the set id ("${expected}")`,
    );
  }
  return result.data;
}

export async function listSetFiles(dir = SETS_DIR): Promise<string[]> {
  // turbopackIgnore: content is read at build time (prerendering); no need to trace these files.
  const entries = await readdir(/*turbopackIgnore: true*/ dir).catch(
    () => [] as string[],
  );
  return entries.filter((f) => f.endsWith(".json")).sort();
}

export async function readSet(
  fileName: string,
  dir = SETS_DIR,
): Promise<ExamSet> {
  const raw = await readFile(
    path.join(/*turbopackIgnore: true*/ dir, fileName),
    "utf8",
  );
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new ContentError(
      `${fileName} is not valid JSON: ${(error as Error).message}`,
    );
  }
  return parseSet(fileName, data);
}

/** All sets, newest first. */
export async function readAllSets(dir = SETS_DIR): Promise<ExamSet[]> {
  const files = await listSetFiles(dir);
  const sets = await Promise.all(files.map((f) => readSet(f, dir)));
  return sets.sort((a, b) => b.id.localeCompare(a.id));
}

export function audioFileExists(fileName: string): boolean {
  return existsSync(
    path.join(/*turbopackIgnore: true*/ PUBLIC_DIR, AUDIO_DIR, fileName),
  );
}

export async function readAllSetViews(): Promise<SetView[]> {
  const sets = await readAllSets();
  return sets.map((set) => buildSetView(set, audioFileExists));
}
