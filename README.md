# PD3 mundtlig: practice app

A local web app for practising the oral part of **Prøve i Dansk 3**:

- **Questions:** past official delprøve 2 topics, with the picture sheets.
- **Suggested answers:** sentence-by-sentence Danish audio, 0.75× speed and repeat for shadowing.
- **Mock exam:** a random topic, 10 seconds with the pictures, about 4½ minutes of spoken questions, with optional
  self-recording.
- **Delprøve 1 trainer:** a 2-minute presentation timer, saved notes and the follow-up question types.

The official questions and pictures are SIRI's (public sets up to May–June 2024) and are **for personal study only**:
keep this app on your own machine. The suggested answers are AI-written.

## Run it

Requires Node.js 26 LTS and Bun.

```bash
bun install
bun run dev            # http://localhost:3000
bun run dev:https      # to test on your phone (microphone needs https): open the https address it prints
```

## Commands

| Command                           | What it does                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| `bun run dev` / `build` / `start` | Next.js development server, production build, production server           |
| `bun run check` / `check:fix`     | Lint and format (Biome)                                                   |
| `bun run typecheck`               | TypeScript                                                                |
| `bun run test`                    | Unit tests (`bun test`): schema, booklet parser, mock exam, content files |
| `bun run e2e`                     | Playwright end-to-end and accessibility (axe) tests on desktop and mobile |
| `bun run verify`                  | Everything above except e2e                                               |
| `bun run content:*`               | Import, edit and validate exam sets — see [CONTENT.md](CONTENT.md)        |
| `bun run audio:generate`          | Generate missing Danish audio with Azure AI Speech                        |

## How it's built

- **Framework:** Next.js 16.4 (App Router, Cache Components, React Compiler, typed routes), React 19.3, Tailwind 4,
  shadcn/ui (Base UI).
- **Static site:** every page is prerendered at build time (`ensureStatic = "navigation"`). Content is JSON in
  `content/sets/`, validated with Zod (`src/lib/schema.ts`) and read through a `use cache` loader
  (`src/lib/content.ts`).
- **Audio:**
  - one MP3 per sentence in `public/audio/`, named by a hash of the text and voice (`src/lib/audio.ts`)
  - the player (`src/hooks/use-speech-player.ts`) falls back to the browser's Danish voice for missing files
- **Progress and preferences:** saved in `localStorage` (`src/lib/local-store.ts`). Nothing leaves the browser,
  recordings included.
