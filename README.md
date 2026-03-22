# mid

AI-generated code sucks, so I created `mid` (Mark. It. Down).

We all want to be 10x devs but AI on it's own is too sloppy. Nobody wants to spend time reviewing low-quality code and refactoring it.

`mid` generates AI **standards** not just instructions. `mid` does this effeciently by instructing your agent to only load modular standards on demand.

Have fun writing sexy-looking code

## Install

Requires `node >= 18`.

Run without installing globally:

```bash
npx midtool
```

Install globally:

```bash
npm install -g midtool
```

After a global install, use:

```bash
mid
```

## Usage

Run `mid` inside a project root:

```bash
cd /your/project
mid
```

This opens an interactive selector, saves `.mid/config`, and generates the selected assistant files.
When `.mid/config` is missing or effectively empty, `mid` also scans the repo and pre-fills a conservative recommended selection before you confirm it.

### Commands

| Command | Purpose |
| --- | --- |
| `mid` | Interactive selector that saves `.mid/config` and generates outputs. |
| `mid sync` | Regenerate outputs from the saved config with no prompts. |
| `mid doctor` | Show standards root, module count, and config status. |
| `mid kill` | Ask for confirmation, then remove managed outputs, restore adopted originals, and delete `.mid/config`. |
| `mid kill --backup` | Ask for confirmation, then move managed outputs into `.mid/backups/<timestamp>/` before cleanup. |
| `mid kill --yes` | Skip the confirmation prompt. Useful for non-interactive runs. |

## Releases

CI validates every push to `main` and every pull request.

Publishing is manual through the GitHub Actions `Publish` workflow:

- set `version` for an exact release such as `0.2.0`
- or leave `version` empty and choose `patch`, `minor`, or `major` via `release_type`

The workflow bumps `package.json` and `package-lock.json`, creates the release commit and tag, publishes to npm, and pushes the result back to `main`.

## Generated Files

`mid` writes assistant-native files and stores its own state under `.mid/`.

Common outputs:

- `.mid/config`
- `.mid/instructions/**`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/mid-router.mdc`

Recommended gitignore (Auto-added by mid):

```gitignore
.mid/backups/
.mid/adopted/
.mid/state/
```

Commit `.mid/config` and the generated assistant files you want to keep in the project.

## Config

`.mid/config` is the project source of truth.

It stores:

- selected assistants
- selected general modules
- selected domains
- selected design patterns
- selected languages
- selected frameworks
- optional output path overrides
- the standards revision used for generation

`mid sync` overwrites managed outputs from that config. If an unmanaged file already exists at a target path, `mid` will not replace it silently.

Generated root instruction files are entrypoints only. They point to copied module snapshots under `.mid/instructions/` using relative paths so deeper instructions can be loaded on demand instead of bloating initial context. Selected design patterns are bundled into `.mid/instructions/design-patterns.md`. Domain modules can also be auto-included when selected languages or frameworks expose matching metadata tags.

## Content Layout

All reusable instruction content lives under `mid/`.

Structure:

- `mid/core/*`: shared core modules
- `mid/domains/*`: cross-cutting domain modules
- `mid/languages/*`: language and framework modules
- `mid/patterns/*`: reusable patterns
- `mid/workflows/*`: workflow modules

Module format:

- core/domain/framework/pattern/workflow modules use a folder with `instructions.md` and `metadata.json`
- language base modules use `base.instructions.md` and `base.metadata.json`

`mid` discovers modules directly from the filesystem. Metadata may include `tags` and `autoSelectWhenTags` so cross-cutting domain modules can be auto-selected without duplicating tag matches.

## Contributing

Any contribution to this project is highly appreciated!

If you have very opinionated programming style, please contribute and improve these.

Reach out to me on [X](https://x.com/hof_coral)
