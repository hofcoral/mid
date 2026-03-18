export const INSTALL_COMMAND = "npm i -g midtool";
export const GITHUB_URL = "https://github.com/hofcoral/mid";

export const navItems = [
  { id: "top", label: "Overview" },
  { id: "flow", label: "How" },
  { id: "install", label: "Install" }
];

export const steps = [
  {
    title: "Pick the stack",
    copy: "Select only the shared rules, language, and frameworks the project needs."
  },
  {
    title: "Pick the assistants",
    copy: "Generate instructions that already match Codex, Claude Code, or Cursor."
  },
  {
    title: "Keep context lean",
    copy: "Ship a small router instead of dropping a full handbook into every session."
  }
];

export const outputItems = [
  "AGENTS.md, CLAUDE.md, or MID.md",
  ".cursor/rules/mid-*.mdc when Cursor is selected",
  ".mid/config to preserve project state"
];
