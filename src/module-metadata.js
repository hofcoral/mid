import fs from 'node:fs/promises';
import path from 'node:path';

function ensureString(value, key, metadataPath) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid metadata JSON in ${metadataPath}: ${key} must be a non-empty string`);
  }
}

function ensureBoolean(value, key, metadataPath) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid metadata JSON in ${metadataPath}: ${key} must be true or false`);
  }
}

function ensureStringArray(value, key, metadataPath) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid metadata JSON in ${metadataPath}: ${key} must be an array`);
  }
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error(`Invalid metadata JSON in ${metadataPath}: ${key} must contain non-empty strings`);
    }
  }
}

function normalizeStringArray(value) {
  return [...new Set((value ?? []).map((entry) => entry.trim()).filter(Boolean))];
}

export function parseMetadata(raw, metadataPath = 'metadata.json') {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid metadata JSON in ${metadataPath}: ${error.message}`);
  }
}

export function validateMetadataAttributes(attributes, metadataPath) {
  if (!attributes || typeof attributes !== 'object') {
    throw new Error(`Invalid metadata JSON in ${metadataPath}: metadata must be an object`);
  }

  ensureString(attributes.title, 'title', metadataPath);
  ensureString(attributes.summary ?? '', 'summary', metadataPath);
  ensureBoolean(attributes.alwaysApply ?? false, 'alwaysApply', metadataPath);
  ensureStringArray(attributes.triggers ?? [], 'triggers', metadataPath);
  ensureStringArray(attributes.tags ?? [], 'tags', metadataPath);
  ensureStringArray(attributes.autoSelectWhenTags ?? [], 'autoSelectWhenTags', metadataPath);

  return {
    title: attributes.title,
    summary: attributes.summary ?? '',
    alwaysApply: !!attributes.alwaysApply,
    triggers: normalizeStringArray(attributes.triggers),
    tags: normalizeStringArray(attributes.tags),
    autoSelectWhenTags: normalizeStringArray(attributes.autoSelectWhenTags)
  };
}

export function resolveModuleFiles(standardsRoot, modulePath) {
  const moduleRoot = path.join(standardsRoot, modulePath);
  const sourcePath = modulePath.endsWith('.md')
    ? moduleRoot
    : path.join(moduleRoot, 'instructions.md');
  const metadataPath = modulePath.endsWith('.md')
    ? modulePath.endsWith('base.instructions.md')
      ? path.join(path.dirname(sourcePath), 'base.metadata.json')
      : sourcePath.replace(/\.md$/, '.metadata.json')
    : path.join(moduleRoot, 'metadata.json');

  return { moduleRoot, sourcePath, metadataPath };
}

export async function readModuleAttributes(metadataPath) {
  try {
    const metadataRaw = await fs.readFile(metadataPath, 'utf8');
    return validateMetadataAttributes(parseMetadata(metadataRaw, metadataPath), metadataPath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
    return {};
  }
}

export async function loadModuleMetadata(standardsRoot, module) {
  const { sourcePath, metadataPath } = resolveModuleFiles(standardsRoot, module.path);
  const body = await fs.readFile(sourcePath, 'utf8');
  const attributes = await readModuleAttributes(metadataPath);
  const normalized = validateMetadataAttributes(attributes, metadataPath);

  return {
    ...module,
    meta: {
      title: normalized.title || module.label,
      summary: normalized.summary,
      triggers: normalized.triggers,
      alwaysApply: normalized.alwaysApply,
      tags: normalized.tags,
      autoSelectWhenTags: normalized.autoSelectWhenTags
    },
    instructionPath: sourcePath,
    metadataPath,
    body: body.trim()
  };
}
