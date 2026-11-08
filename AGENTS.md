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

## Truthfulness and privacy

- Never invent first-hand experience, tests, tools used, dates, metrics, or project contributions. Distinguish designed / implemented / verified / published.
- Only approved public Markdown is committed. No private notes, drafts, Tistory originals, company/customer information, credentials, or sensitive prompts. Check images for EXIF and licensing.
- Do not reference local-only paths (e.g. `docs/`) from committed files.

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
