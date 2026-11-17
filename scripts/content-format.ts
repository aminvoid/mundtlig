/**
 * Rewrite every set file in canonical form (schema key order, defaults filled in, 2-space JSON).
 * Run after editing by hand or after an agent changed a file.
 *
 *   bun run content:format
 */
import { listSetFiles, readSet } from "../src/lib/content-fs";
import { writeSet } from "./lib/cli";

for (const file of await listSetFiles()) {
  const set = await readSet(file);
  await writeSet(set, { overwrite: true });
  console.log(`✔ ${file}`);
}
