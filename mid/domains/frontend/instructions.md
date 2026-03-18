# Frontend

- Keep components, pages, and hooks focused on UI behavior. Move business logic and cross-cutting concerns into dedicated boundaries.
- Keep state shape, reusable types, and constants out of component or hook files when they are shared beyond that file.
- Do not define shared interfaces, types, enums, or constants inside services, components, or hooks by default.
- Put shared types and constants in dedicated nearby files such as `types.ts`, `constants.ts`, `*.types.ts`, or `*.constants.ts`.
- Normalize API data at the edge so the rest of the UI works with stable frontend-facing shapes.
- Optimize for clarity, composition, and predictable rendering over smart abstractions.
