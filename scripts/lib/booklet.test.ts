import { describe, expect, test } from "bun:test";
import { cleanLines, joinLines, parseBooklet, slugify } from "./booklet";

// Excerpts in the layout of the official booklets (unpdf text, one string per page).
const CURRENT_PAGES = [
  `M A J - J U N I 2 0 2 4
1. Prøvens niveau og bedømmelsen`,
  `M A J - J U N I 2 0 2 46
A. Støtte til kultur
Eksaminator skal følge retningslinjerne beskrevet på side 5.
Første obligatoriske spørgsmål
Emne A
Forslag til indledning:
”Situation A viser en familie, der er på vej ind på et kunstmuseum.”
Obligatorisk spørgsmål:
”Børn kan ofte få gratis adgang. Hvorfor tror du, de kan det?”
Forslag til opfølgende spørgsmål:
”Synes du, det er en god idé at tage børn med på museum?”
”Hvorfor?/Hvorfor ikke?”
Emne B
Forslag til indledning:
”Situation B viser en biograf.”`,
  `7M A J - J U N I 2 0 2 47
Obligatorisk spørgsmål:
”I Danmark kan kunstnere få støtte af staten. Hvorfor tror du, de kan det?”
Forslag til opfølgende spørgsmål:
”Hvilke problemer kan der være ved det
Eksaminator informerer om, at der nu stilles et spørgsmål af en mere overordnet
karakter.
Andet obligatoriske spørgsmål
Obligatorisk spørgsmål:
”Nogle kommuner bruger mange penge på sport. Hvil-
ke fordele og ulemper mener du, der kan være ved det?”
Forslag til opfølgende spørgsmål:
”Mener du, at det er en god idé?”
”Hvorfor?/Hvorfor ikke?”
Når obligatoriske og opfølgende spørgsmål er stillet, og tiden er gået, siger eksaminator:
”Tak, så er prøven forbi.”`,
];

const LEGACY_PAGES = [
  `Emne A: Køn og arbejde
Første obligatoriske spørgsmål
Eksaminator vælger spørgsmål A eller spørgsmål B.
A. ”I Danmark er der færre kvinder end mænd, der arbejder med it. Hvorfor tror du, det er sådan?”
Forslag til opfølgende spørgsmål:
”Kan der være nogen problemer ved det? Hvorfor?/Hvorfor ikke?”
B. ”Der er færre mænd, der arbejder med børn. Hvorfor tror du, det er sådan?”
Forslag til opfølgende spørgsmål:
”Hvad tror du, det betyder for børnene?”
NOVEMBER-DECEMBER 2019 6`,
  `Andet obligatoriske spørgsmål
”Man kunne lave regler for social- og
sundhedsuddannelser. Hvilke fordele og ulemper mener du, der ville være ved det?”
Forslag til opfølgende spørgsmål:
”Synes du, det er vigtigt? Hvorfor?/Hvorfor ikke?”`,
];

describe("helpers", () => {
  test("cleanLines drops running headers and page numbers", () => {
    expect(cleanLines("M A J - J U N I 2 0 2 46\nHej\n12\n")).toEqual(["Hej"]);
  });
  test("joinLines undoes hyphenation but keeps compound hyphens before og/eller", () => {
    expect(joinLines(["Hvil-", "ke fordele"])).toBe("Hvilke fordele");
    expect(joinLines(["social-", "og sundhedsassistenter"])).toBe(
      "social- og sundhedsassistenter",
    );
  });
  test("slugify handles Danish letters", () => {
    expect(slugify("Pædagogik i folkeskolen")).toBe("paedagogik-i-folkeskolen");
    expect(slugify("Støtte til kultur")).toBe("stoette-til-kultur");
    expect(slugify("Mangel på arbejdskraft")).toBe("mangel-paa-arbejdskraft");
  });
});

describe("parseBooklet — current format", () => {
  const parsed = parseBooklet(CURRENT_PAGES);
  const topic = parsed.topics[0];

  test("detects format and label", () => {
    expect(parsed.format).toBe("current");
    expect(parsed.label).toBe("Maj-juni 2024");
  });

  test("extracts intros, required questions and merged follow-ups", () => {
    expect(topic?.id).toBe("stoette-til-kultur");
    expect(topic?.firstQuestion[0]?.intro?.da).toBe(
      "Situation A viser en familie, der er på vej ind på et kunstmuseum.",
    );
    expect(topic?.firstQuestion[0]?.followUps.map((f) => f.da)).toEqual([
      "Synes du, det er en god idé at tage børn med på museum? Hvorfor?/Hvorfor ikke?",
    ]);
  });

  test("handles a follow-up whose closing quote is missing", () => {
    expect(topic?.firstQuestion[1]?.followUps[0]?.da).toBe(
      "Hvilke problemer kan der være ved det",
    );
  });

  test("dehyphenates the second question", () => {
    expect(topic?.secondQuestion.question.da).toBe(
      "Nogle kommuner bruger mange penge på sport. Hvilke fordele og ulemper mener du, der kan være ved det?",
    );
    expect(topic?.secondQuestion.followUps[0]?.da).toBe(
      "Mener du, at det er en god idé? Hvorfor?/Hvorfor ikke?",
    );
  });

  test("warns when not all three topics were found", () => {
    expect(parsed.warnings).toContain("expected 3 topics, found 1");
  });
});

describe("parseBooklet — legacy format", () => {
  const parsed = parseBooklet(LEGACY_PAGES);
  const topic = parsed.topics[0];

  test("detects the legacy format and the A/B question choice", () => {
    expect(parsed.format).toBe("legacy-description");
    expect(topic?.title.da).toBe("Køn og arbejde");
    expect(topic?.firstQuestion.map((o) => o.question.id)).toEqual([
      "q1-a",
      "q1-b",
    ]);
    expect(topic?.firstQuestion[0]?.intro).toBeUndefined();
    expect(topic?.firstQuestion[1]?.followUps[0]?.da).toBe(
      "Hvad tror du, det betyder for børnene?",
    );
  });

  test("keeps compound hyphens across line breaks", () => {
    expect(topic?.secondQuestion.question.da).toStartWith(
      "Man kunne lave regler for social- og sundhedsuddannelser.",
    );
  });
});
