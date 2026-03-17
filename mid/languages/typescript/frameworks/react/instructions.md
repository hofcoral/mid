# React Framework

- Treat each component as a clear contract: props, effects, and UI structure.
- Favor hooks for state and side effects and keep them predictable (no conditional hooks).
- Split component logic from layout by using small, reusable pieces and lifting state up.
- Memoize expensive values with `useMemo` sparingly; prioritize readability.
- Keep styling close to the component via shared tokens or utility classes to avoid drift.
