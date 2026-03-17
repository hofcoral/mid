# Vite.js Framework

- Keep config minimal; prefer convention over extensive plugin wiring unless needed.
- Use Vite’s aliasing and env handling to keep shared constants centralized.
- Optimize builds by keeping vendor dependencies lean and splitting code when necessary.
- Favor fast refresh-friendly patterns: pure components and explicit file-based routes.
- Document any manual rollup or server hooks so future maintainers know why the override exists.
