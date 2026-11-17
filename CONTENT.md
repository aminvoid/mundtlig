# Adding and editing exam content

All exam content lives in **`content/sets/<set-id>.json`**, one file per exam term. The app picks up every
file in that folder automatically; there is no list to update.

- **Set ids:** `<year>-s` for May–June (sommer) and `<year>-v` for November–December (vinter), e.g. `2023-v`.
- **Schema:** `src/lib/schema.ts` (Zod) is the source of truth. `content/schema.json` is generated from it, so VS
  Code autocompletes and validates the files (each starts with `"$schema": "../schema.json"`).
- **Audio is not in the JSON:** file names are a hash of the text and the voice, so editing a sentence simply means
  "generate audio again".

> **Confidential material:** PD3 exam material from the **winter 2024 term (`2024-v`) onward is confidential**:
> SIRI reuses it from a closed task bank and it may not be shared. The schema rejects those set ids. Only public sets
> up to May–June 2024 belong here.

## Add a set, step by step

Run everything from `web-app/`. (In Claude Code you can also say "add the November–December 2023 set"; the
`add-exam-set` skill follows these steps.)

### 1. Put the PDFs in `content/sources/<id>/`

This folder is git-ignored, because the PDFs are copyrighted and stay on your machine. Your collection is in
`../src/mundtlig/`: `*_censor.pdf` (examiner booklets), `*_billeder.pdf` (picture sheets), and a scanned compilation
`Mundtlige billeder og spørgsma l, 2018-S2024.pdf`.

### 2. Import the booklet

```bash
bun run content:import 2023-v content/sources/2023-v/booklet.pdf
```

- **What it does:** it parses both booklet layouts, the current format (from May–June 2023) and the older format,
  and writes a draft `content/sets/2023-v.json`.
- **Check the warnings,** then compare every question with the PDF.
- **Booklets without a text layer (scans):** create a skeleton with
  `bun run content:new 2023-v "November-december 2023"` and type the questions in.

### 3. Add the picture sheets

```bash
bun run content:preview "content/sources/2023-v/pictures.pdf" --from 1 --to 12   # numbered contact sheet
bun run content:picture 2023-v <topic-id> "content/sources/2023-v/pictures.pdf" <page> --crop 7,0,7,0
```

- **Crop:** `--crop top,right,bottom,left` cuts percentages off each side, e.g. a scanner's header and footer.
- **Captions:** add the picture captions as `situations` in the JSON if the sheet has them.

### 4. Answers and translations

Use the Claude Code agents `pd3-answer-writer` and then `pd3-danish-reviewer` (in `../.claude/agents/`), or write
them by hand:

```json
"answer": {
  "sentences": ["Jeg tror, der er flere grunde til det.", "For det første …"],
  "en": "I think there are several reasons. First, …",
  "status": "reviewed"
}
```

- **One sentence per item:** the player highlights and repeats sentences one at a time.
- **No abbreviations:** write _for eksempel_, not _fx_, so the voice reads it naturally.

### 5. Audio

```bash
bun run audio:generate 2023-v        # only missing files; ~3 s per sentence on the free tier
bun run audio:generate --prune       # optional: delete files no longer used by any set
```

- **Credentials:** it needs `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `.env.local`.
- **Without audio:** the app uses the browser's Danish voice instead.

### 6. Check

```bash
bun run content:format     # canonical formatting and key order
bun run content:validate   # schema, TODOs, picture sizes, and a status report
bun run verify             # lint, types, tests, content, build
```

## Field reference

| Field                      | What it is                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `format`                   | `current` (from May–June 2023, no picture description) or `legacy-description` (before that)                      |
| `topics[].firstQuestion[]` | Option A and B. In the current format, each has the examiner's `intro` ("Situation A viser …").                   |
| `…question.id`             | Stable ids: `q1-a`, `q1-a-f1`, `q1-b`, `q1-b-f1`, `q2`, `q2-f1`. Progress is stored per id, so don't rename them. |
| `…answer.status`           | `draft` (written) or `reviewed` (checked by the reviewer)                                                         |
| `topics[].picture`         | Written by `content:picture`; `width` and `height` must match the image file                                      |
