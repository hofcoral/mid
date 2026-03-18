# Command Dispatch

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
