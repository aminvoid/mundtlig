/**
 * Fixed examiner lines, following the official SIRI examiner booklet (censor- og eksaminatorhæfte).
 * They are generated from templates instead of being stored per topic, and they get audio like
 * everything else (see `collectSpeech` in `content-view.ts`).
 */

/** Said when the picture sheet is put in front of the candidate (current format). */
export function examinerIntro(topicTitle: string): string {
  return `Her er der to billeder, som viser nogle situationer, der handler om emnet ${topicTitle}. Du har nu 10 sekunder til at overveje emnet, og derefter vil jeg stille dig spørgsmål til én af situationerne.`;
}

/** The booklet tells the examiner to announce the more general second question. */
export const TRANSITION_LINE =
  "Nu kommer der et spørgsmål af en mere overordnet karakter.";

/** Said when the time is up. */
export const CLOSING_LINE = "Tak, så er prøven forbi.";
