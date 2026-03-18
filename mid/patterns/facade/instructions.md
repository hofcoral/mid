# Facade

## Simplify complex subsystems

- Add a facade when callers should not need to know the details of multiple underlying services.
- Expose a smaller, task-focused interface instead of leaking subsystem complexity upward.
- Keep the facade thin: it should coordinate, not become the entire business layer.

## Reduce coupling

- Let callers depend on the simplified API instead of many low-level collaborators.
- Keep subsystem-specific details inside the facade boundary.
- Use the facade to make common flows easier and safer to use.

## Do not hide everything

- Avoid turning the facade into a generic catch-all.
- If the abstraction gets too broad, split it by use case.
