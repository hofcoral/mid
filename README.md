# mid

`mid` generates project-specific AI instruction files from reusable markdown standards.

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

### Commands

| Command | Purpose |
| --- | --- |
| `mid` | Interactive selector that saves `.mid/config` and generates outputs. |
| `mid sync` | Regenerate outputs from the saved config with no prompts. |
| `mid doctor` | Show standards root, module count, and config status. |
| `mid kill` | Remove managed outputs, restore adopted originals, and delete `.mid/config`. |
| `mid kill --backup` | Move managed outputs into `.mid/backups/<timestamp>/` before cleanup. |

## Generated Files

`mid` writes assistant-native files and stores its own state under `.mid/`.

Common outputs:
- `.mid/config`
- `.mid/instructions/**`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/mid-*.mdc`

Recommended gitignore:

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
- selected languages
- selected frameworks
- optional output path overrides
- the standards revision used for generation

`mid sync` overwrites managed outputs from that config. If an unmanaged file already exists at a target path, `mid` will not replace it silently.

Generated root instruction files are entrypoints only. They point to copied module snapshots under `.mid/instructions/` using relative paths so deeper instructions can be loaded on demand instead of bloating initial context.

## Content Layout

All reusable instruction content lives under `mid/`.

Structure:
- `mid/core/*`: shared core modules
- `mid/languages/*`: language and framework modules
- `mid/patterns/*`: reusable patterns
- `mid/workflows/*`: workflow modules

Module format:
- framework/general/pattern/workflow modules use a folder with `instructions.md` and `metadata.json`
- language base modules use `base.instructions.md` and `base.metadata.json`

`mid` discovers modules directly from the filesystem.
