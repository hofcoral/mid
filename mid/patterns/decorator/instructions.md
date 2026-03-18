# Decorator

## Add behavior compositionally

- Use decorators when behavior or metadata should be attached without rewriting the core component.
- Keep each decorator focused on one cross-cutting concern.
- Prefer composition over large inheritance trees for additive behavior.

## Keep decorators intentional

- Decorators should materially affect behavior, metadata, validation, or integration points.
- Avoid piling on decorators that add noise without changing the outcome.
- If the same decorator set repeats, extract or move it to a higher level.

## Preserve clarity

- Do not let decorator stacks hide the real flow of the code.
- Keep the decorated component understandable without chasing too many layers.
