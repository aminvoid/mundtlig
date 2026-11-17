/**
 * Parser for the official PD3 oral examiner booklets ("Censor- og eksaminatorhæfte, mundtlig del").
 *
 * Supports both layouts:
 * - current (from May–June 2023): per situation "Emne A/B" → "Forslag til indledning" →
 *   "Obligatorisk spørgsmål" → "Forslag til opfølgende spørgsmål"
 * - legacy (2018–2022): "A. ”question”" / "B. ”question”" (examiner picks one), followed by suggestions
 *
 * The output is a draft: always compare it with the PDF before using it.
 */

import type { ExamSet, Question, Topic } from "../../src/lib/schema";

export type BookletFormat = ExamSet["format"];

export type ParsedBooklet = {
  label?: string;
  format: BookletFormat;
  topics: Topic[];
  warnings: string[];
};

const HEADER_COMPACT =
  /^\d*(MAJ|JUNI|NOV|DEC|SOMMER|VINTER)[A-ZÆØÅ-]*\d{4}\d*$/i;
const TOPIC_HEADING = /^(?:Emne\s+)?([ABC])[.:]\s+([^”“"].{2,80})$/;
const FIRST_MARKER = "Første obligatoriske spørgsmål";
const SECOND_MARKER = "Andet obligatoriske spørgsmål";
const INTRO_MARKER = "Forslag til indledning";
const REQUIRED_MARKER = "Obligatorisk spørgsmål";
const FOLLOW_UP_MARKER = "Forslag til opfølgende spørgsmål";
const END_MARKERS = [
  "Når obligatoriske og opfølgende spørgsmål er stillet",
  "Tak, så er prøven forbi",
];
const TRANSITION_MARKER = "Eksaminator informerer";
// The closing quote is optional at the very end: some official booklets forget it.
const QUOTE = /[”“"„]([^”“"„]+?)(?:[”“"]|$)/g;
const CONJUNCTIONS = /^(og|eller|samt|til)\b/;

/** Remove running headers/footers such as "M A J - J U N I 2 0 2 4 6" and bare page numbers. */
export function cleanLines(pageText: string): string[] {
  return pageText
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^\d+$/.test(l))
    .filter((l) => !HEADER_COMPACT.test(l.replace(/\s+/g, "")));
}

/** Join lines into one string, undoing end-of-line hyphenation ("Hvil-" + "ke" → "Hvilke"). */
export function joinLines(lines: string[]): string {
  let out = "";
  for (const line of lines) {
    if (
      out.endsWith("-") &&
      /^[a-zæøå]/.test(line) &&
      !CONJUNCTIONS.test(line)
    ) {
      out = out.slice(0, -1) + line;
    } else {
      out = out ? `${out} ${line}` : line;
    }
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function quotes(text: string): string[] {
  return [...text.matchAll(QUOTE)]
    .map((m) => (m[1] ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Quotes after the first occurrence of `marker` (or all quotes when the marker is missing). */
function quotesAfter(text: string, marker: string): string[] {
  const i = text.indexOf(marker);
  return quotes(i === -1 ? text : text.slice(i + marker.length));
}

/** Quotes between `marker` and the next marker in `until` (exclusive). */
function quotesBetween(
  text: string,
  marker: string,
  until: string[],
): string[] {
  const start = text.indexOf(marker);
  if (start === -1) return [];
  let rest = text.slice(start + marker.length);
  const ends = until.map((u) => rest.indexOf(u)).filter((i) => i >= 0);
  if (ends.length > 0) rest = rest.slice(0, Math.min(...ends));
  return quotes(rest);
}

/** "Hvorfor?/Hvorfor ikke?" belongs to the follow-up before it. */
function mergeFollowUps(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    const prev = out.at(-1);
    if (prev && /^Hvorfor\?/.test(item))
      out[out.length - 1] = `${prev} ${item}`;
    else out.push(item);
  }
  return out;
}

function question(id: string, da: string): Question {
  return { id, da };
}

function cutAtEnd(text: string): string {
  const ends = END_MARKERS.map((m) => text.indexOf(m)).filter((i) => i >= 0);
  return ends.length ? text.slice(0, Math.min(...ends)) : text;
}

function parseTopic(
  letter: Topic["letter"],
  title: string,
  body: string,
  warnings: string[],
): Topic | undefined {
  const where = `topic ${letter} (${title})`;
  const first = body.indexOf(FIRST_MARKER);
  const second = body.indexOf(SECOND_MARKER);
  if (first === -1 || second === -1) {
    warnings.push(
      `${where}: could not find "${FIRST_MARKER}" / "${SECOND_MARKER}"`,
    );
    return undefined;
  }
  let firstPart = body.slice(first + FIRST_MARKER.length, second);
  const transition = firstPart.indexOf(TRANSITION_MARKER);
  if (transition !== -1) firstPart = firstPart.slice(0, transition);
  const secondPart = cutAtEnd(body.slice(second + SECOND_MARKER.length));
  const isCurrent = firstPart.includes(INTRO_MARKER);

  // Split the first part into option A and option B.
  const splitter = isCurrent
    ? /Emne\s+([AB])\b/g
    : /(?:^|\s)([AB])\.\s*(?=[”“"„])/g;
  const marks = [...firstPart.matchAll(splitter)];
  if (marks.length < 2) {
    warnings.push(
      `${where}: expected two options (A and B) in the first question, found ${marks.length}`,
    );
    return undefined;
  }

  const options = marks.slice(0, 2).map((m, idx) => {
    const label = (m[1] ?? "A") as "A" | "B";
    const start = (m.index ?? 0) + m[0].length;
    const end = marks[idx + 1]?.index ?? firstPart.length;
    const chunk = firstPart.slice(start, end);
    const id = `q1-${label.toLowerCase()}`;

    const intro = isCurrent
      ? quotesBetween(chunk, INTRO_MARKER, [REQUIRED_MARKER])[0]
      : undefined;
    const q = isCurrent
      ? quotesBetween(chunk, REQUIRED_MARKER, [FOLLOW_UP_MARKER])[0]
      : quotes(chunk.split(FOLLOW_UP_MARKER)[0] ?? "")[0];
    const followUps = mergeFollowUps(quotesAfter(chunk, FOLLOW_UP_MARKER));
    if (!q)
      warnings.push(`${where}: no required question found for option ${label}`);
    if (isCurrent && !intro)
      warnings.push(`${where}: no intro line found for situation ${label}`);
    if (followUps.length === 0)
      warnings.push(`${where}: no follow-up questions for option ${label}`);

    return {
      label,
      ...(intro ? { intro: { da: intro } } : {}),
      question: question(id, q ?? "TODO"),
      followUps: followUps.map((f, i) => question(`${id}-f${i + 1}`, f)),
    };
  });

  const secondQuestion = secondPart.includes(REQUIRED_MARKER)
    ? quotesBetween(secondPart, REQUIRED_MARKER, [FOLLOW_UP_MARKER])[0]
    : quotes(secondPart.split(FOLLOW_UP_MARKER)[0] ?? "")[0];
  const secondFollowUps = mergeFollowUps(
    secondPart.includes(FOLLOW_UP_MARKER)
      ? quotesAfter(secondPart, FOLLOW_UP_MARKER)
      : [],
  );
  if (!secondQuestion)
    warnings.push(`${where}: no second required question found`);

  return {
    id: slugify(title),
    letter,
    title: { da: title },
    firstQuestion: options as Topic["firstQuestion"],
    secondQuestion: {
      question: question("q2", secondQuestion ?? "TODO"),
      followUps: secondFollowUps.map((f, i) => question(`q2-f${i + 1}`, f)),
    },
  };
}

function detectLabel(pages: string[]): string | undefined {
  for (const page of pages) {
    for (const raw of page.split("\n")) {
      const compact = raw.replace(/\s+/g, "");
      const m = compact.match(/^\d*(MAJ-JUNI|NOVEMBER-DECEMBER)(\d{4})/i);
      if (m?.[1] && m[2]) {
        const term = m[1].toLowerCase();
        return `${term.charAt(0).toUpperCase()}${term.slice(1)} ${m[2]}`;
      }
    }
  }
  return undefined;
}

/** Parse the text of a booklet, one string per page. */
export function parseBooklet(pages: string[]): ParsedBooklet {
  const warnings: string[] = [];
  const lines = pages.flatMap(cleanLines);

  // Find topic headings ("A. Støtte til kultur" or "Emne A: Køn og arbejde").
  const headings: { index: number; letter: Topic["letter"]; title: string }[] =
    [];
  lines.forEach((line, index) => {
    const m = line.match(TOPIC_HEADING);
    if (m?.[1] && m[2] && !line.includes("obligatorisk")) {
      headings.push({
        index,
        letter: m[1] as Topic["letter"],
        title: m[2].trim(),
      });
    }
  });
  // Keep only headings followed by the topic instructions (skips stray "A. ..." lines).
  const topicHeadings = headings.filter((h, i) => {
    const end = headings[i + 1]?.index ?? lines.length;
    return joinLines(lines.slice(h.index + 1, end)).includes(FIRST_MARKER);
  });

  const topics: Topic[] = [];
  for (const [i, h] of topicHeadings.entries()) {
    const end = topicHeadings[i + 1]?.index ?? lines.length;
    const body = joinLines(lines.slice(h.index + 1, end));
    const topic = parseTopic(h.letter, h.title, body, warnings);
    if (topic) topics.push(topic);
  }
  if (topics.length !== 3)
    warnings.push(`expected 3 topics, found ${topics.length}`);

  const anyIntro = topics.some((t) => t.firstQuestion.some((o) => o.intro));
  return {
    label: detectLabel(pages),
    format: anyIntro ? "current" : "legacy-description",
    topics,
    warnings,
  };
}
