# Husky

- If Husky or pre-commit hooks exist, treat them as required quality gates.
- Do not bypass hooks unless the user explicitly asks.
- If a hook fails, fix the underlying issue instead of working around it.
- Run the smallest relevant checks yourself before finishing, even if hooks also run them.
- If hooks exist but cannot be run in the current environment, say so clearly.
