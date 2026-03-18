# Strategy

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
