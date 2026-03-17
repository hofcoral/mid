# Git

## Branches

- Never work directly on `main` or `master`.
- Never merge or push directly to `main` or `master` without explicit user permission.
- Work on a topic branch.
- Prefer branch prefixes such as `feat/`, `fix/`, `refactor/`, `dev/`, and `release/`.

## Commits

- Commit early and often. Prefer small commits with a single clear intent.
- Rough commits are allowed. Do not delay commits just to make them look polished.
- Use bracketed commit types only. Do not use Conventional Commit syntax like `feat:`.
- Commit format: `[type] Short imperative summary`
- Preferred commit types:
- `[feat]`: Adds a feature or meaningful capability.
- `[fix]`: Fixes a bug.
- `[refactor]`: Changes structure without intending to change behavior.
- `[dev]`: General development work that does not fit better as a feature, fix, or refactor.
- `[trivial]`: Small low-significance changes.
- `[chore]`: Mechanical maintenance work such as codegen, lint output, file renames, and dependency housekeeping.
- `[bugfix]`: Use when the bug severity is worth calling out explicitly.
- Other valid types seen in existing history:
- `[patch]`: Small targeted patch that is more specific than `dev` and less notable than `fix`.
- `[init]`: Repository bootstrap or initial bulk setup.
- `[test]`: Test-only or testing-focused changes.
- `[debug]`: Temporary debugging changes or extra logs.
- `[ui]`: Small UI-only changes.
- `[sec]`: Security-focused changes.
- `[trivia]`: Minor incidental changes. Usually prefer `[trivial]` for new commits.
- Compound or niche tags such as `[feat+fix]`, `[algo-dev]`, `[pip]`, or repo-specific tags are acceptable when they describe the work better than the common set.
- Use `!` for breaking or high-risk changes when useful, for example `[!refactor]` or `[!bugfix]`.
- If a commit only reverts prior work, make that explicit in the message.
- If unsure which type fits, default to `[dev]`.

## Pull Requests

- Do not merge a pull request into `main` or `master` without explicit user permission.
- When creating a pull request from `staging` or `development` branches to `main` or `master`, the title of the PR should be `[RELEASE] <title>`.
