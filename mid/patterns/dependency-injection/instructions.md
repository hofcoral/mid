# Dependency Injection / IoC

## Inject dependencies

- Receive collaborators from the outside instead of constructing them inside the class.
- Prefer constructor injection for required dependencies.
- Depend on contracts, tokens, or abstractions when the implementation may change.

## Keep wiring separate

- Build objects in the composition root, module, or container layer.
- Keep business classes focused on behavior, not object creation.
- Avoid hidden singletons or static state when injection is possible.

## Use it for decoupling

- Reach for injection when testing, swapping implementations, or reducing coupling matters.
- Do not add indirection if the dependency is trivial and unlikely to vary.
