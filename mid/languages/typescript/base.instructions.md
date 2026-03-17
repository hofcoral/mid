# TypeScript Base

## Goals
- use strong typing and readonly data structures to reduce runtime surprises
- favour explicit interfaces over implicit `any`, especially at module boundaries
- keep shared utilities generic but focused so they remain reusable

## When to use
- editing TypeScript libraries, shared tooling, or full-stack applications
- defining typings for the broader codebase or refining API surface contracts

## Quick rules
- export only the symbols consumers need and keep implementation helpers internal
- keep logic small, prefer `const` with descriptive names, and document deviations
- run `npm run lint`/`npm run test` frequently so the type system stays in sync
