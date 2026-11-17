import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SETS_DIR } from "../../src/lib/content-fs";
import type { ExamSet } from "../../src/lib/schema";

export function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Minimal flag parser: `--name value` and `--flag`; everything else is positional. */
export function parseArgs(argv = process.argv.slice(2)) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg.startsWith("--")) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[arg.slice(2)] = next;
        i++;
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

export function setFilePath(setId: string): string {
  return path.join(SETS_DIR, `${setId}.json`);
}

/** Write a set file with a stable key order and the `$schema` reference for editor autocomplete. */
export async function writeSet(
  set: ExamSet,
  { overwrite = false } = {},
): Promise<string> {
  const file = setFilePath(set.id);
  if (!overwrite && existsSync(file)) {
    fail(
      `${path.relative(process.cwd(), file)} already exists (use --force to overwrite)`,
    );
  }
  await mkdir(SETS_DIR, { recursive: true });
  const { $schema: _ignored, ...rest } = set;
  await writeFile(
    file,
    `${JSON.stringify({ $schema: "../schema.json", ...rest }, null, 2)}\n`,
  );
  return file;
}
