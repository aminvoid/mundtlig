import { createHash } from "node:crypto";

/**
 * Voices used for generated audio (Azure AI Speech, Danish neural voices).
 * Shared by `scripts/audio-generate.ts` (which creates the files) and the content loader
 * (which checks which files exist), so both always agree on file names.
 */
export const VOICES = {
  /** The examiner: intro lines and questions. */
  examiner: "da-DK-JeppeNeural",
  /** Model answers. */
  answer: "da-DK-ChristelNeural",
} as const;

export type VoiceRole = keyof typeof VOICES;

/** Public URL folder for generated audio (files live in `public/audio`). */
export const AUDIO_DIR = "audio";

/** Normalise text so cosmetic whitespace changes don't create new audio files. */
export function normaliseSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Deterministic file name for a piece of speech, e.g. `3fa1c2…e9.mp3`. */
export function audioFileName(role: VoiceRole, text: string): string {
  const hash = createHash("sha256")
    .update(`${VOICES[role]}|${normaliseSpeechText(text)}`)
    .digest("hex")
    .slice(0, 20);
  return `${hash}.mp3`;
}
