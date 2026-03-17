# DRY

## Keep logic DRY

- Avoid copying the same flow across modules; extract reusable helpers or shared services.
- Prefer small, descriptive abstractions over large generic utilities.

## Identify duplication

- When you spot repeated patterns, write a short note in the PR explaining the proposed abstraction.
- Only create a new pattern module if the duplication is cross-cutting and will simplify future work.

## Share knowledge

- Document the invariant you are pulling into a shared module and how consumers should apply it.
- Keep the extracted helpers focused and testable; avoid coupling them to a specific caller.
