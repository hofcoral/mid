import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export function trim(value) {
  return value.trim();
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function assistantLabel(assistants, id) {
  return assistants.find((assistant) => assistant.id === id)?.label ?? id;
}

export function resolveOutputPath(projectRoot, rawPath) {
  return path.isAbsolute(rawPath) ? rawPath : path.join(projectRoot, rawPath);
}

export function toPortablePath(value) {
  return value.split(path.sep).join("/");
}

export function relativeDisplayPath(fromPath, toPath) {
  const relativePath = toPortablePath(path.relative(fromPath, toPath));
  if (!relativePath) {
    return "./";
  }
  if (relativePath.startsWith("../") || relativePath.startsWith("./") || relativePath.startsWith("/")) {
    return relativePath;
  }
  if (relativePath.startsWith(".")) {
    return `./${relativePath}`;
  }
  return `./${relativePath}`;
}

export async function getGitRevision(cwd) {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      cwd,
      "rev-parse",
      "HEAD",
    ]);
    return trim(stdout) || "unknown";
  } catch {
    return "unknown";
  }
}

export function joinIds(values) {
  return values.length > 0 ? values.join(", ") : "(none)";
}
