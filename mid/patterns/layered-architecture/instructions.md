# Layered Architecture

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
