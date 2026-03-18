# Template Method

## Fix the overall flow

- Use a base abstraction to define the invariant sequence of a workflow.
- Let subclasses or specialized implementations fill in only the variable steps.
- Keep the template focused on orchestration, not every implementation detail.

## Use it when the sequence is stable

- Reach for this pattern when many variants share the same high-level process.
- Prefer composition or strategy if the entire flow needs to change at runtime.
- Avoid deep inheritance chains just to reuse a small amount of code.

## Keep hooks intentional

- Expose only the extension points that actually vary.
- Document which steps are required, optional, or overridable.
