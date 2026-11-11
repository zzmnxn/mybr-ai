# mybr.ai — Agent Rules

Korean-first, editorial-quality personal dev knowledge blog ("my digital brain, powered by ai."). Static Astro site on GitHub Pages. Content: Knowledge / Experience / AI Hub (real, verified records of using AI tools, plugins, skills, workflows).

## Scope (first release)

Home, Knowledge, Experience, AI Hub, About, `/notes/[permalink]`, `/topics/[id]`, and the metadata-driven brain graph (`src/lib/graph.ts`, `src/scripts/`). Do **not** add wikilink/backlink generation, search, dark mode, migration tooling, backend/DB/SSR, or a client framework (React etc.) unless explicitly asked. Keep data contracts compatible with adding them later.

## Content model

One `notes` collection (Astro Content Collections + Zod), Markdown files in `src/content/notes/`. The schema in `src/content.config.ts` is the source of truth. Essentials:

- Required: `uid`, `permalink`, `title`, `summary`, `section`, `kind`, `domains` (may be empty), `growth`, `publication`; `publishedAt` for published/archived.
- `section`: `knowledge | experience | ai-hub`. `kind` must be valid for the section:
  - knowledge: `concept | comparison | guide`
  - experience: `troubleshooting | project | problem | retrospective`
  - ai-hub: `build-log | plugin-review | skill-review | workflow | experiment`
- `growth`: `impulse | synapse | engram` (maturity, not access control). `publication`: `published | archived` only in this repo; `draft` must never be committed.
- `uid` is permanent (`know-|exp-|hub-` + kebab-case); `permalink` is the URL key. Never use a frontmatter `slug` field (collides with Astro's entry id).
- Optional fields are valid only for their `kind`; reject others instead of ignoring them.
- Cross-document checks (duplicate uid/permalink, dangling references) run in a separate script before build.

## Planned notes (앞으로 쓸 글)

- A topic promised in a note but not yet written goes in `src/data/planned.yaml` (`planned` collection). Schema: `id` (`plan-` + kebab-case), `title`, `section`, `domains`, `near` (existing note `uid`s or other plan ids). The file is public: add only topics that are fine to publish, and no drafts or private notes.
- Planned notes are not relations: never put a plan id in `related`, `prerequisites`, or `projectRefs` (`scripts/verify-content.mjs` rejects it).
- To link to a planned topic from a note body, use a relative path from the note page: `[text](../../topics/<plan-id>)`. Do not use root-relative paths like `/topics/...`, because the site `base` is `/mybr-ai`.
- Do not write a note's content just because a plan exists; a plan is a placeholder with no claims.
- When the planned note is actually written, create it in `src/content/notes/` with a new `uid`, remove its `planned.yaml` entry, and repoint body links from `../../topics/<plan-id>` to `../<permalink>`. Then run `npm run build`.

## Truthfulness and privacy

- Never invent first-hand experience, tests, tools used, dates, metrics, or project contributions. Distinguish designed / implemented / verified / published.
- Only approved public Markdown is committed. No private notes, drafts, Tistory originals, company/customer information, credentials, or sensitive prompts. Check images for EXIF and licensing.
- Do not reference local-only paths (e.g. `docs/`) from committed files.

## Activity log (`src/data/activities.yaml`)

- Add entries only when the user explicitly asks. Never add them on your own judgment.
- Use only the `uid` of notes actually handled in this session. If unsure, ask first. Never invent study or edits.
- kind: `review` if the user studied the note again, `revise` if the note's content was changed. `on` is today's date in Seoul time (`YYYY-MM-DD`).
- `detail` is optional: one public-safe plain-text line (≤280 chars). No prompts, private content, or local-only paths.
- Do not add a `review` for a note and date that already has one. Run `npm run verify` after adding. Commit only when asked.
- Publish activities are generated from `publishedAt`; never add them by hand. Field rules are in `CONTENT_GUIDE.md` §9.

## Design

Calm, precise, editorial; Korean long-form readability first. The approved design lives in `DESIGN.md` — follow it over any generic style. Avoid generic AI-SaaS layouts, purple/neon gradients, glass blur, repeated identical cards, giant brain art, auto-rotating 3D, decorative animation. Respect `prefers-reduced-motion`; semantic HTML; keyboard focus visible; verify at 1440 / 768 / 390px.

## Engineering

- Small commits; run `npm run build` (and type checks) before claiming anything works; report what was not verified.
- Prefer Astro components and plain CSS with design tokens. Add a dependency only for a demonstrated need.
- Commit `package-lock.json`. Deploy with the official Astro GitHub Pages action.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full Astro documentation: https://docs.astro.build

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
- [Deploy to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
