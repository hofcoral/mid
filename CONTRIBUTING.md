# Contributing to mid

Thanks for contributing.

`mid` is intentionally lightweight. The best contributions keep it deterministic, explainable, and easy to maintain.

## Ways to contribute

- Add or improve standards under `mid/`
- Improve repo detection and recommendation heuristics
- Fix bugs in config parsing, generation, or cleanup flows
- Improve tests, docs, and release workflow

For larger changes to generation behavior, config format, or release flow, open an issue first so the direction is clear before implementation.

## Development setup

Requires `node >= 18`.

Install dependencies:

```bash
npm install
```

Run the validation suite before opening a PR:

```bash
npm test
npm run validate:content
npm run lint
```

## Project structure

- `src/`: CLI, config, catalog loading, generation, recommendation logic, and tests
- `mid/`: reusable standards content bundled into generated outputs
- `.github/workflows/`: CI and publishing workflows

## Adding or updating standards

The main contribution surface in this repo is the standards catalog under `mid/`.

Current layout:

- `mid/core/*`: shared core modules
- `mid/domains/*`: cross-cutting domain modules
- `mid/languages/*`: language and framework modules
- `mid/patterns/*`: reusable design patterns
- `mid/workflows/*`: workflow modules

Module file format:

- core, domain, framework, pattern, and workflow modules use a folder with `instructions.md` and `metadata.json`
- language base modules use `base.instructions.md` and `base.metadata.json`

Keep standards:

- concise and reusable across many projects
- specific enough to be actionable
- broadly applicable instead of narrowly personal
- modular so they can be loaded on demand

Avoid turning a module into a long checklist or a dump of personal preferences.

## Metadata guidance

Metadata should stay clean and intentional.

- `title`: short human-readable name
- `summary`: one-line description of the module
- `alwaysApply`: reserve for guidance that should always be loaded
- `triggers`: phrases that help an assistant decide when to load the module
- `tags`: capabilities or domains expressed by the module
- `autoSelectWhenTags`: use when a module should be auto-included based on selected module tags

Use `tags` and `autoSelectWhenTags` sparingly. They affect automatic resolution and should stay predictable.

## Working on detection logic

Auto-detection should remain conservative.

- prefer strong filesystem or config signals
- avoid guesses that are hard to explain
- do not use network calls
- do not add heavy parsing when simple heuristics are enough
- only recommend selections that are safe defaults

Patterns are intentionally more opinionated than languages, frameworks, and domains. Treat them carefully.

## Tests

Add or update tests when behavior changes.

This is especially important for:

- catalog discovery
- config parsing and migration
- generation output shape
- cleanup and adoption behavior
- recommendation heuristics

If a change affects the CLI or generated outputs, it should usually be covered in `src/cli.test.js`.

## Pull requests

Keep PRs focused and easy to review.

- one change set per PR when possible
- include tests for behavior changes
- update docs when the user-facing flow changes
- do not sneak in unrelated refactors

Commit messages should follow the repo’s bracketed style, for example:

- `[feat] Add repo detection for Vite`
- `[fix] Preserve adopted files on kill`
- `[chore] Update publish workflow`

## Releases

Validation runs on pushes to `main` and on pull requests.

Publishing is manual through GitHub Actions:

- provide `version` for an exact release such as `0.2.0`
- or leave `version` empty and choose `patch`, `minor`, or `major`

The publish workflow creates the release commit and tag, publishes to npm, and pushes the result back to `main`.
