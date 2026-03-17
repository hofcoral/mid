# NestJS Framework

- Break backend work into modules around providers, controllers, and guards.
- Keep each `@Module` explicit about its exports/imports so dependencies are readable.
- Favor constructor injection for services, guards, and filters; avoid static state.
- Validate incoming payloads with DTOs/class-validator at the controller boundary.
- Log and surface critical lifecycle events so integrations are traceable.
