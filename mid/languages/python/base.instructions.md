# Python Base

## Goals
- keep functions pure when practical and surface side effects explicitly
- stay idiomatic with context managers, dataclasses, and typing hints where they buy clarity
- rely on tooling (`ruff`, `mypy`, `pytest`) to catch style and correctness issues

## When to use
- refactoring modules, scripts, or services written in Python
- defining backend workflows, data processing, or automation logic

## Quick rules
- prefer short helper functions over large ones and keep public APIs clear
- document tricky behavior with short module-level notes (no novels)
- run the standard lint/test chain before merging to keep the tree green
