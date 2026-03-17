# Next.js Framework

- Group pages, layouts, and route handlers by feature and guard edge cases with middleware.
- Clearly separate server and client components; keep server-only logic away from client bundles.
- Prefer `app/` folder conventions and annotate metadata (title, description) in parallel.
- Use `serverActions` or `route handlers` for mutations instead of mixing client calls with REST.
- Keep CSS/metadata co-located with the layout it belongs to so overrides stay predictable.
