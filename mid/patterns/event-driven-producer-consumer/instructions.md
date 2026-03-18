# Event-Driven / Producer-Consumer

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
