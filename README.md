# mid

`mid` generates project-specific AI instruction files from this standards repo.

## Install

For local development:

```bash
npm install
ln -sf /path/to/standards/bin/mid /usr/local/bin/mid
```

For distribution, the intended install path is:

```bash
npx mid
```

`mid` now requires `node` and resolves the standards checkout from the installed package or `MID_HOME`. You can also override the standards source with `MID_HOME=/path/to/standards`.

### Release install
Ship new versions with `npm version && npm publish`, keeping `package-lock.json` current and confirming `npm pack` only includes `bin`, `mid`, `src`, `README.md`, and `LICENSE`. After publishing, downstream projects run `npx mid` or `npm install -g mid`. Ensure release notes call out the `.mid/` conventions and the `node >= 18` engine requirement.

## Usage

Run `mid` inside a project root:

```bash
cd /your/project
mid
```

`mid` will:

- load `.mid/config` if it exists
- reopen the selector with the saved values preselected
- save the updated config
- generate native assistant files

Use `mid sync` to regenerate from the saved config with no prompts.

Use `mid doctor` to inspect the current standards root, content root, revision, and config validity.

Use `mid kill` to remove managed generated instruction files for the project, restore any original files that `mid` previously adopted, and delete `.mid/config`.

Use `mid kill --backup` to move managed generated files into `.mid/backups/<timestamp>/` before removing the active files and config. `kill` still restores previously adopted original files from `.mid/adopted/`.

Commit the generated files that apply to your project:

- `.mid/config`
- `AGENTS.md`
- `CLAUDE.md`
- `MID.md`
- `.cursor/rules/mid-*.mdc`

### Command reference

| Command | Purpose |
| --- | --- |
| `mid` | Interactive selector that saves `.mid/config` and emits the configured assistant files. |
| `mid sync` | Non-interactive regeneration from the saved config. |
| `mid doctor` | Diagnostics view of standards root, module count, and config validity. |
| `mid kill` | Removes managed outputs, restores any adopted originals, and deletes `.mid/config`. |
| `mid kill --backup` | Pushes managed outputs into `.mid/backups/<timestamp>/` before deleting them plus the config. |

Use this table plus the rest of the README as the canonical help reference for the tool.

## Project Config

`.mid/config` is the source of truth for a project.

It stores:

- selected assistants
- selected general modules
- selected languages
- selected frameworks
- optional output path overrides
- the standards revision used during generation

It uses a simple line-based format with repeated keys such as `assistant=codex` and `framework=framework.typescript.nextjs`.

`mid sync` overwrites managed outputs from that config. If it finds an unmanaged target file at the same path, it fails instead of replacing it.

Generated markdown entrypoints are router-style files. They point to the selected instruction modules instead of inlining every module body into the initial context.

`.mid/backups/` is reserved for `mid` backup snapshots and should usually be gitignored in consumer projects.

`.mid/adopted/` and `.mid/state/` are internal `mid` storage used to restore original files when `mid` replaces an unmanaged target during adoption.

### Consumer gitignore

```
.mid/backups/
.mid/adopted/
.mid/state/
```

Only commit `.mid/config` together with the generated assistant files listed above.

## Repository Structure

- `mid/`: all reusable instruction content lives here
- `mid/<module>/metadata.json`: sidecar metadata for router generation such as title, summary, triggers, and `alwaysApply`
- `mid/<module>/instructions.md`: module instructions content
- `mid/core/required`: always included modules
- `mid/core/optional`: optional shared modules
- `mid/languages/*`: language and framework modules
- `mid/patterns/*`: reusable patterns
- `mid/workflows/*`: workflow modules

Keep markdown files content-only. `mid` infers available instructions directly from `mid/`. Put router metadata in `metadata.json` and the module body in `instructions.md` inside the module directory or use root-level language base pairs such as `base.instructions.md` and `base.metadata.json`.

When adding a new module:

1. Create the module in the right place under `mid/`.
2. For general modules, patterns, workflows, and frameworks, create a module directory with `instructions.md` and `metadata.json`.
3. For language base modules, create `base.instructions.md` and `base.metadata.json` at the language root.
4. Framework dependencies on their language base are inferred automatically from the path.
