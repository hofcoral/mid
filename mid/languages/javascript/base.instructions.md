# JavaScript Base

## Goals
- keep syntax idiomatic by favoring modern ES modules and consistent formatting
- prefer clarity over cleverness so reviewers can read the code without decoding it
- encourage automated tooling (linters/type checks) as part of the workflow

## When to use
- editing UI, shared utilities, or tooling scripts that target JavaScript runtimes
- adjusting configuration files that predominantly rely on JavaScript logic

## Quick rules
- keep functions small and expressive, export only what is consumed externally
- document non-obvious behavior via concise inline comments or short READMEs
- run `npm run lint`/`npm run test` before merging to catch regressions early
