# Design Patterns

Load this file when the task is about architecture, abstractions, refactors, or structural design.

## Adapter / Gateway

## Isolate external systems

- Wrap third-party APIs, SDKs, and internal service clients behind an application-facing boundary.
- Translate external contracts into your own domain-friendly shapes.
- Do not leak provider-specific models through the rest of the codebase.

## Keep integrations consistent

- Put retries, auth, serialization, and error mapping inside the adapter or gateway layer.
- Return consistent results and failure modes to the application layer.
- Prefer one gateway per provider or bounded integration area.

## Protect the core model

- Keep the rest of the application stable even if the external system changes.
- If the integration logic grows, split transport concerns from mapping concerns.

## Command Dispatch

## Route actions through explicit handlers

- Represent a request or action as a command with a clear intent.
- Map each command type to a dedicated handler.
- Keep the dispatcher thin: it should route, not own business logic.

## Keep handlers focused

- Prefer one handler per command.
- Keep command payloads explicit and narrow.
- Put validation and authorization at the boundary before dispatch when possible.

## Use it for orchestration

- Reach for command dispatch when many action types need a consistent routing model.
- Do not introduce a dispatcher if simple direct calls are clearer.

## Decorator

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

## Dependency Injection / IoC

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

## DRY

## Keep logic DRY

- Avoid copying the same flow across modules; extract reusable helpers or shared services.
- Prefer small, descriptive abstractions over large generic utilities.

## Identify duplication

- When you spot repeated patterns, write a short note in the PR explaining the proposed abstraction.
- Only create a new pattern module if the duplication is cross-cutting and will simplify future work.

## Share knowledge

- Document the invariant you are pulling into a shared module and how consumers should apply it.
- Keep the extracted helpers focused and testable; avoid coupling them to a specific caller.

## Event-Driven / Producer-Consumer

## Publish work, then process it

- Use events, messages, or jobs when producers and consumers should be decoupled.
- Treat event publication and event handling as separate responsibilities.
- Design consumers to be idempotent and safe to retry.

## Use asynchronous boundaries intentionally

- Reach for this pattern when work can happen later or in parallel.
- Do not hide synchronous business invariants behind async processing if immediate consistency is required.
- Keep event payloads explicit and stable.

## Make operations observable

- Log or trace publication, retries, failures, and dead-letter flows.
- Keep handlers focused on one event or job type.

## Facade

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

## Layered Architecture

## Use clear layers

- Separate input handling, application logic, and infrastructure concerns.
- Keep dependencies flowing inward: outer layers may depend on inner layers, not the reverse.
- Do not leak HTTP, database, or framework details into business logic.

## Keep responsibilities narrow

- Controllers, resolvers, or handlers should translate input and delegate.
- Application services should coordinate use cases and business flows.
- Repositories, gateways, and clients should handle persistence and external systems only.

## Enforce boundaries

- Pass domain-friendly data between layers instead of raw framework objects.
- If logic starts crossing layer boundaries, extract the seam instead of blending responsibilities.

## Strategy

## Encapsulate interchangeable behavior

- Put each variant behind a common contract.
- Select the implementation based on configuration, input, feature flags, or runtime state.
- Keep selection logic outside the strategy implementations themselves.

## Prefer explicit contracts

- Strategies should share the same input and output shape where possible.
- Keep each strategy focused on one behavior, not multiple branches.
- Use clear names that describe when each strategy applies.

## Avoid premature abstraction

- Introduce a strategy only when there are real competing behaviors.
- Do not wrap a single implementation in a strategy just for formality.

## Template Method

## Fix the overall flow

- Use a base abstraction to define the invariant sequence of a workflow.
- Let subclasses or specialized implementations fill in only the variable steps.
- Keep the template focused on orchestration, not every implementation detail.

## Use it when the sequence is stable

- Reach for this pattern when many variants share the same high-level process.
- Prefer composition or strategy if the entire flow needs to change at runtime.
- Avoid deep inheritance chains just to reuse a small amount of code.

## Keep hooks intentional

- Expose only the extension points that actually vary.
- Document which steps are required, optional, or overridable.
