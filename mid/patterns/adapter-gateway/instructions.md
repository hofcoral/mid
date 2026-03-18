# Adapter / Gateway

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
