@AGENTS.md

# PD3 practice app — notes for Claude

- Package manager and scripts: **Bun** (`bun run …`); Next.js runs on Node 26. Never use npm/npx.
- Before finishing a change: `bun run verify`; after UI changes also `bun run e2e`.
- Content rules are in `CONTENT.md`. Never add PD3 exam material from the winter 2024 term (`2024-v`) or later — it is confidential; the schema rejects it.
- Content files (`content/sets/*.json`) are formatted by `bun run content:format`, not Biome. Never change the official `da` wording of questions.
- Cache Components is on: read content only through `src/lib/content.ts` (`use cache`); no `dynamicParams`/`revalidate` route configs. Hidden pages stay mounted (Activity), so media and timers must stop in effect cleanups.
- Agents for content: `pd3-answer-writer`, `pd3-danish-reviewer`, `accessibility-auditor` (in `../.claude/agents/`); skill: `add-exam-set`.
