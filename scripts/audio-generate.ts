/**
 * Generate Danish audio (MP3, one file per sentence) with Azure AI Speech.
 *
 *   bun run audio:generate [set-id ...] [--prune] [--interval-ms 3100] [--dry-run]
 *
 * - Only missing files are generated; file names come from the text and voice (src/lib/audio.ts),
 *   so changing a sentence creates a new file and the old one can be removed with --prune.
 * - Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local (Bun loads it automatically).
 * - The default pace (one request every 3.1 s) stays under the Free (F0) tier limit.
 */
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AUDIO_DIR,
  audioFileName,
  normaliseSpeechText,
  VOICES,
  type VoiceRole,
} from "../src/lib/audio";
import {
  audioFileExists,
  PUBLIC_DIR,
  readAllSets,
} from "../src/lib/content-fs";
import { collectSpeech } from "../src/lib/content-view";
import { fail, parseArgs } from "./lib/cli";

const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const MAX_RETRIES = 5;

const { positional: setIds, flags } = parseArgs();
const dryRun = flags["dry-run"] === true;
const intervalMs = Number(flags["interval-ms"] ?? 3100);
const outDir = path.join(PUBLIC_DIR, AUDIO_DIR);

const allSets = await readAllSets();
const sets = setIds.length
  ? allSets.filter((s) => setIds.includes(s.id))
  : allSets;
const unknown = setIds.filter((id) => !allSets.some((s) => s.id === id));
if (unknown.length) fail(`unknown set id(s): ${unknown.join(", ")}`);

// Everything any set needs (for pruning) and what the selected sets still miss.
const wanted = new Map<string, { role: VoiceRole; text: string }>();
for (const set of allSets) {
  for (const item of collectSpeech(set))
    wanted.set(audioFileName(item.role, item.text), item);
}
const missing = new Map<string, { role: VoiceRole; text: string }>();
for (const set of sets) {
  for (const item of collectSpeech(set)) {
    const file = audioFileName(item.role, item.text);
    if (!audioFileExists(file)) missing.set(file, item);
  }
}

console.log(
  `${sets.map((s) => s.id).join(", ")}: ${missing.size} audio file(s) to generate`,
);

if (missing.size > 0 && !dryRun) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    fail(
      "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set in .env.local (see .env.example)",
    );
  }
  await mkdir(outDir, { recursive: true });
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  let done = 0;
  for (const [file, item] of missing) {
    const audio = await synthesize(endpoint, key, item.role, item.text);
    await writeFile(path.join(outDir, file), audio);
    done++;
    console.log(
      `  [${done}/${missing.size}] ${item.role.padEnd(8)} ${truncate(item.text)}`,
    );
    if (done < missing.size) await sleep(intervalMs);
  }
}

if (flags.prune === true) {
  const existing = (await readdir(outDir).catch(() => [] as string[])).filter(
    (f) => f.endsWith(".mp3"),
  );
  const unused = existing.filter((f) => !wanted.has(f));
  for (const f of unused) {
    if (!dryRun) await unlink(path.join(outDir, f));
  }
  console.log(
    `${dryRun ? "Would remove" : "Removed"} ${unused.length} unused audio file(s)`,
  );
}
console.log("✔ Done");

async function synthesize(
  endpoint: string,
  key: string,
  role: VoiceRole,
  text: string,
): Promise<Uint8Array> {
  const ssml = `<speak version="1.0" xml:lang="da-DK"><voice name="${VOICES[role]}">${escapeXml(normaliseSpeechText(text))}</voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
        "User-Agent": "pd3-practice-app",
      },
      body: ssml,
    });
    if (response.ok) return new Uint8Array(await response.arrayBuffer());

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) {
      const detail = await response.text().catch(() => "");
      if (response.status === 401)
        fail(
          "Azure rejected the key (401). Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.",
        );
      fail(
        `Azure TTS failed with ${response.status} ${response.statusText} ${detail}`.trim(),
      );
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2 ** attempt * 2000;
    console.warn(
      `  … ${response.status}, retrying in ${Math.round(wait / 1000)} s`,
    );
    await sleep(wait);
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(text: string, max = 70): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
