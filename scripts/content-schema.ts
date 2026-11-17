/**
 * Generate content/schema.json from the Zod schema, for autocomplete and validation
 * while editing set files in VS Code (each set file starts with "$schema": "../schema.json").
 *
 *   bun run content:schema
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ExamSetSchema } from "../src/lib/schema";

const schema = z.toJSONSchema(ExamSetSchema, {
  io: "input",
  unrepresentable: "any",
});
const file = path.join(process.cwd(), "content", "schema.json");
await writeFile(
  file,
  `${JSON.stringify({ ...schema, title: "PD3 oral exam set", description: "One exam term of Prøve i Dansk 3, mundtlig del (delprøve 2)." }, null, 2)}\n`,
);
console.log(`✔ Wrote ${path.relative(process.cwd(), file)}`);
