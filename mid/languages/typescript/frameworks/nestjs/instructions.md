# NestJS Framework

## Structure

- Default to this `src/` layout:

```text
src/
├── core/           # app-wide infrastructure
├── common/         # shared reusable utilities
├── integrations/   # external or internal service clients
├── modules/        # business/domain features
├── events/         # event publishers and listeners
├── commands/       # CLI jobs and cron logic
├── app.module.ts
└── main.ts
```

- Keep domain logic inside `modules/`, not in `core/` or `common/`.
- Treat `core/` as infrastructure only: auth, config, redis, mail, persistence wiring.
- Treat `common/` as lightweight shared building blocks: decorators, pipes, guards, types, utils.
- Put third-party or cross-service wrappers in `integrations/`.
- Put event-driven orchestration in `events/`.
- Put operational jobs, workers, schedulers, and CLI entrypoints in `commands/`.

## Placement Rules

- Business feature: `modules/<feature>/`
- Feature DTOs: `modules/<feature>/dto/`
- Feature-specific helpers: `modules/<feature>/utils/`
- Shared helpers or decorators: `common/`
- Auth, redis, config, or other app infrastructure: `core/`
- External provider or internal API client: `integrations/`
- Event publishers/listeners: `events/`
- Cron jobs and one-off scripts: `commands/`

## Naming

- Use singular names for domain folders: `account/`, `user/`, `payment/`
- Use plural names for shared reusable folders: `pipes/`, `decorators/`, `utils/`
- Name services as `[name].service.ts`
- Name modules as `[name].module.ts`
- Name DTOs as `[action]-[entity].dto.ts`
- Name clients as `[provider]-[entity].client.ts`
- Name guards and pipes as `[name].guard.ts` and `[name].pipe.ts`

## Architecture

- Keep each module explicit about its `imports`, `providers`, `controllers`, and `exports`.
- Favor constructor injection over static state or hidden singletons.
- Keep controllers thin. Put business logic in services and orchestration in the module layer.
- Keep feature internals close to the feature instead of centralizing everything in shared folders too early.
- Reach for `common/` only when code is truly shared across multiple modules.
- Do not repeat auth or validation logic on individual endpoints when it can be applied once at the controller or guard level.
- If controller-level auth, validation, or decorator stacks repeat, extract or move them higher instead of copying them route by route.

## Decorators

- Use decorators sparingly.
- Skip documentation-only or "nice to have" decorators unless the user explicitly asks for them.
- Do not add Swagger metadata like `ApiOperation` by default.
- Only add decorators that materially affect behavior, validation, security, or required API documentation.
- If the same decorator stack repeats, move it higher or abstract it.

## Testing

- Keep unit tests beside the implementation file they cover.
- Keep end-to-end tests in `test/` or `e2e/`.
- Match the production module boundaries in test organization.
