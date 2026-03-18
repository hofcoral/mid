# Backend

- Keep controllers and handlers thin. Put business logic in services or application-level modules.
- Keep validation, auth, integrations, and persistence concerns out of request entrypoints when they can be applied higher or in dedicated boundaries.
- Prefer explicit module boundaries for APIs, jobs, events, and integrations.
- Do not define shared interfaces, types, enums, or reusable constants inside service or controller files by default.
- Put shared types and constants in dedicated nearby files such as `types.ts`, `constants.ts`, `*.types.ts`, or `*.constants.ts`.
- Normalize external inputs at the edge and keep internal domain models consistent.
- Centralize repeated backend rules instead of copying them across endpoints, handlers, or services.
- Optimize for clarity, operability, and safe change over clever abstractions.
