import fs from 'node:fs/promises';
import path from 'node:path';
import prompts from 'prompts';
import {
  ADOPTED_BACKUPS_DIR_NAME,
  ADOPTED_STATE_NAME,
  ASSISTANTS,
  BACKUPS_DIR_NAME,
  CONFIG_NAME,
  CONFIG_VERSION,
  CURSOR_PREFIX,
  CURSOR_ROUTER_NAME,
  DEFAULT_OUTPUTS,
  INSTRUCTIONS_DIR_NAME,
  MANAGED_TOKEN,
  MID_DIR_NAME,
  STATE_DIR_NAME
} from './constants.js';
import { loadModuleMetadata } from './module-metadata.js';
import { assistantLabel, relativeDisplayPath, resolveOutputPath, yamlQuote } from './utils.js';

const ASSISTANT_NOTES = {
  codex: 'Treat this file as the entry point and only load referenced modules when the task clearly matches their triggers.',
  claude: 'Claude Code should prefer the module map below rather than pulling every instruction into context at once.',
  cursor: 'Apply this rule as the entry point and load the referenced module snapshots only when the task matches their triggers.',
  general: 'Use this guide as the starting context for general-purpose assistance and load referenced modules on demand.'
};

async function ensureParentDir(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(targetPath) {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function isManagedFile(targetPath) {
  try {
    const file = await fs.open(targetPath, 'r');
    const buffer = Buffer.alloc(2048);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    await file.close();
    return buffer.subarray(0, bytesRead).toString('utf8').includes(MANAGED_TOKEN);
  } catch {
    return false;
  }
}

function getInstructionsDir(projectRoot) {
  return path.join(projectRoot, MID_DIR_NAME, INSTRUCTIONS_DIR_NAME);
}

function getContentRoot(standardsRoot) {
  return path.join(standardsRoot, 'mid');
}

function instructionSubpath(standardsRoot, instructionPath) {
  const relativePath = path.relative(getContentRoot(standardsRoot), instructionPath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Could not resolve instruction path within standards content root: ${instructionPath}`);
  }
  return relativePath;
}

function projectInstructionPath(standardsRoot, projectRoot, instructionPath) {
  return path.join(getInstructionsDir(projectRoot), instructionSubpath(standardsRoot, instructionPath));
}

async function removeIfManaged(targetPath) {
  if (await isManagedFile(targetPath)) {
    await fs.rm(targetPath, { force: true });
    return true;
  }
  return false;
}

function assistantOutputPath(projectRoot, config, assistantId) {
  const rawPath = config.outputs[assistantId] || DEFAULT_OUTPUTS[assistantId];
  if (!rawPath) {
    throw new Error(`Output path for ${assistantId} is empty in ${CONFIG_NAME}`);
  }
  return resolveOutputPath(projectRoot, rawPath);
}

function cursorOutputDir(projectRoot, config) {
  return assistantOutputPath(projectRoot, config, 'cursor');
}

function cursorRouterPath(projectRoot, config) {
  return path.join(cursorOutputDir(projectRoot, config), CURSOR_ROUTER_NAME);
}

function timestampId() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function getStateDir(projectRoot) {
  return path.join(projectRoot, MID_DIR_NAME, STATE_DIR_NAME);
}

function getAdoptedStatePath(projectRoot) {
  return path.join(getStateDir(projectRoot), ADOPTED_STATE_NAME);
}

async function readAdoptedState(projectRoot) {
  const statePath = getAdoptedStatePath(projectRoot);
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeAdoptedState(projectRoot, entries) {
  const statePath = getAdoptedStatePath(projectRoot);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

async function clearAdoptedState(projectRoot) {
  await fs.rm(getAdoptedStatePath(projectRoot), { force: true });
}

async function backupPathForAdoption(projectRoot, targetPath) {
  const relativePath = path.relative(projectRoot, targetPath);
  const timestamp = timestampId();
  const backupRoot = path.join(projectRoot, MID_DIR_NAME, ADOPTED_BACKUPS_DIR_NAME, timestamp);
  const backupPath = path.join(backupRoot, relativePath);
  await ensureParentDir(backupPath);
  return { backupPath, relativePath };
}

export async function adoptExistingFile(projectRoot, targetPath) {
  const { backupPath, relativePath } = await backupPathForAdoption(projectRoot, targetPath);
  await fs.rename(targetPath, backupPath);

  const entries = await readAdoptedState(projectRoot);
  entries.push({
    targetPath: relativePath,
    backupPath: path.relative(projectRoot, backupPath)
  });
  await writeAdoptedState(projectRoot, entries);
  return backupPath;
}

export async function validateTargetCollisions(projectRoot, config) {
  const fileTargets = [];
  for (const assistant of ['codex', 'claude', 'general']) {
    if (!config.assistants.includes(assistant)) {
      continue;
    }
    fileTargets.push(assistantOutputPath(projectRoot, config, assistant));
  }

  for (let index = 0; index < fileTargets.length; index += 1) {
    for (let compare = index + 1; compare < fileTargets.length; compare += 1) {
      if (fileTargets[index] === fileTargets[compare]) {
        throw new Error(`Selected assistants resolve to the same output path: ${fileTargets[index]}`);
      }
    }
  }

  if (config.assistants.includes('cursor')) {
    const cursorDir = cursorOutputDir(projectRoot, config);
    for (const assistant of ['codex', 'claude', 'general']) {
      if (!config.assistants.includes(assistant)) {
        continue;
      }
      if (assistantOutputPath(projectRoot, config, assistant) === cursorDir) {
        throw new Error(`Cursor output directory conflicts with ${assistant} output: ${cursorDir}`);
      }
    }
  }
}

export async function ensureSyncSafe(projectRoot, config, resolvedModules) {
  for (const assistant of config.assistants) {
    if (assistant === 'cursor') {
      const cursorDir = cursorOutputDir(projectRoot, config);
      if ((await fileExists(cursorDir)) && !(await isDirectory(cursorDir))) {
        throw new Error(`Cursor output path must be a directory: ${cursorDir}`);
      }
      const targetPath = cursorRouterPath(projectRoot, config);
      if ((await fileExists(targetPath)) && !(await isManagedFile(targetPath))) {
        throw new Error(`${targetPath} already exists and is not managed by mid.`);
      }
      continue;
    }

    const targetPath = assistantOutputPath(projectRoot, config, assistant);
    if (await isDirectory(targetPath)) {
      throw new Error(`Output path must be a file, not a directory: ${targetPath}`);
    }
    if ((await fileExists(targetPath)) && !(await isManagedFile(targetPath))) {
      throw new Error(`${targetPath} already exists and is not managed by mid.`);
    }
  }
}

export async function resolveInteractiveConflicts(projectRoot, config, resolvedModules) {
  for (const assistant of [...config.assistants]) {
    if (assistant === 'cursor') {
      const cursorDir = cursorOutputDir(projectRoot, config);
      if ((await fileExists(cursorDir)) && !(await isDirectory(cursorDir))) {
        throw new Error(`Cursor output path must be a directory: ${cursorDir}`);
      }

      const targetPath = cursorRouterPath(projectRoot, config);
      if (!(await fileExists(targetPath)) || (await isManagedFile(targetPath))) {
        continue;
      }

      const response = await prompts({
        type: 'select',
        name: 'decision',
        message: `${targetPath} already exists and is not managed by mid for ${assistantLabel(ASSISTANTS, assistant)}.`,
        choices: [
          { title: 'Backup and adopt', value: 'backup' },
          { title: 'Skip this assistant', value: 'skip' },
          { title: 'Abort', value: 'abort' }
        ]
      });

      if (response.decision === 'abort' || !response.decision) {
        throw new Error('Aborted.');
      }

      if (response.decision === 'skip') {
        config.assistants = config.assistants.filter((value) => value !== assistant);
        continue;
      }

      const backupPath = await adoptExistingFile(projectRoot, targetPath);
      console.log(`Backed up ${targetPath} to ${backupPath}`);
      continue;
    }

    const targetPath = assistantOutputPath(projectRoot, config, assistant);
    if (await isDirectory(targetPath)) {
      throw new Error(`Output path must be a file, not a directory: ${targetPath}`);
    }
    if (!(await fileExists(targetPath)) || (await isManagedFile(targetPath))) {
      continue;
    }

    const response = await prompts({
      type: 'select',
      name: 'decision',
      message: `${targetPath} already exists and is not managed by mid for ${assistantLabel(ASSISTANTS, assistant)}.`,
      choices: [
        { title: 'Backup and adopt', value: 'backup' },
        { title: 'Skip this assistant', value: 'skip' },
        { title: 'Abort', value: 'abort' }
      ]
    });

    if (response.decision === 'abort' || !response.decision) {
      throw new Error('Aborted.');
    }

    if (response.decision === 'skip') {
      config.assistants = config.assistants.filter((value) => value !== assistant);
      continue;
    }

    const backupPath = await adoptExistingFile(projectRoot, targetPath);
    console.log(`Backed up ${targetPath} to ${backupPath}`);
  }

  if (config.assistants.length === 0) {
    throw new Error('No assistants selected after resolving conflicts.');
  }
}

export async function cleanupDeselectOutputs(projectRoot, config) {
  for (const assistant of ['codex', 'claude', 'general']) {
    if (config.assistants.includes(assistant)) {
      continue;
    }
    const targetPath = assistantOutputPath(projectRoot, config, assistant);
    if (await removeIfManaged(targetPath)) {
      console.log(`Removed stale ${assistantLabel(ASSISTANTS, assistant)} output: ${targetPath}`);
    }
  }

  const cursorDir = assistantOutputPath(projectRoot, config, 'cursor');
  if (!config.assistants.includes('cursor') && (await isDirectory(cursorDir))) {
    const entries = await fs.readdir(cursorDir);
    for (const entry of entries.filter((name) => name.startsWith(CURSOR_PREFIX) && name.endsWith('.mdc')).sort()) {
      const targetPath = path.join(cursorDir, entry);
      if (await removeIfManaged(targetPath)) {
        console.log(`Removed stale Cursor rule: ${targetPath}`);
      }
    }
  }
}

async function removeEmptyDirectory(targetPath) {
  try {
    const entries = await fs.readdir(targetPath);
    if (entries.length === 0) {
      await fs.rmdir(targetPath);
    }
  } catch {
    // Ignore missing directories and non-directory paths.
  }
}

async function listFilesRecursive(rootPath) {
  const files = [];

  async function visit(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      files.push(entryPath);
    }
  }

  if (await isDirectory(rootPath)) {
    await visit(rootPath);
  }

  return files;
}

async function removeEmptyDirectoriesRecursive(rootPath) {
  if (!(await isDirectory(rootPath))) {
    return;
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    await removeEmptyDirectoriesRecursive(path.join(rootPath, entry.name));
  }
  await removeEmptyDirectory(rootPath);
}

async function syncInstructionModules(standardsRoot, projectRoot, modulesWithMetadata) {
  const instructionsDir = getInstructionsDir(projectRoot);
  const plannedPaths = new Set();

  for (const module of modulesWithMetadata) {
    const targetPath = projectInstructionPath(standardsRoot, projectRoot, module.instructionPath);
    plannedPaths.add(targetPath);
    await ensureParentDir(targetPath);
    await fs.writeFile(targetPath, `${module.body}\n`, 'utf8');
  }

  const existingFiles = await listFilesRecursive(instructionsDir);
  for (const targetPath of existingFiles.sort()) {
    if (plannedPaths.has(targetPath)) {
      continue;
    }
    await fs.rm(targetPath, { force: true });
    console.log(`Removed stale instruction module: ${targetPath}`);
  }

  await removeEmptyDirectoriesRecursive(instructionsDir);

  return modulesWithMetadata.map((module) => {
    const copiedInstructionPath = projectInstructionPath(standardsRoot, projectRoot, module.instructionPath);
    return {
      ...module,
      copiedInstructionPath
    };
  });
}

export async function removeManagedProjectOutputs(projectRoot, config) {
  return removeManagedProjectOutputsWithOptions(projectRoot, config, {});
}

async function moveToBackup(projectRoot, targetPath, backupRoot) {
  const relativePath = path.relative(projectRoot, targetPath);
  const backupPath = path.join(backupRoot, relativePath);
  await ensureParentDir(backupPath);
  await fs.rename(targetPath, backupPath);
  return backupPath;
}

export async function createBackupRoot(projectRoot) {
  const timestamp = timestampId();
  const backupRoot = path.join(projectRoot, MID_DIR_NAME, BACKUPS_DIR_NAME, timestamp);
  await fs.mkdir(backupRoot, { recursive: true });
  return backupRoot;
}

export async function backupConfigFile(configPath, backupRoot) {
  const backupPath = path.join(backupRoot, 'config');
  await ensureParentDir(backupPath);
  await fs.copyFile(configPath, backupPath);
  return backupPath;
}

export async function removeManagedProjectOutputsWithOptions(projectRoot, config, options = {}) {
  const backupRoot = options.backupRoot ?? null;
  for (const assistant of ['codex', 'claude', 'general']) {
    const targetPath = assistantOutputPath(projectRoot, config, assistant);
    if (!(await isManagedFile(targetPath))) {
      continue;
    }
    if (backupRoot) {
      const backupPath = await moveToBackup(projectRoot, targetPath, backupRoot);
      console.log(`Backed up ${assistantLabel(ASSISTANTS, assistant)} output: ${targetPath} -> ${backupPath}`);
    } else if (await removeIfManaged(targetPath)) {
      console.log(`Removed ${assistantLabel(ASSISTANTS, assistant)} output: ${targetPath}`);
    }
  }

  const cursorDir = assistantOutputPath(projectRoot, config, 'cursor');
  if (await isDirectory(cursorDir)) {
    const entries = await fs.readdir(cursorDir);
    for (const entry of entries.filter((name) => name.startsWith(CURSOR_PREFIX) && name.endsWith('.mdc')).sort()) {
      const targetPath = path.join(cursorDir, entry);
      if (!(await isManagedFile(targetPath))) {
        continue;
      }
      if (backupRoot) {
        const backupPath = await moveToBackup(projectRoot, targetPath, backupRoot);
        console.log(`Backed up Cursor rule: ${targetPath} -> ${backupPath}`);
      } else if (await removeIfManaged(targetPath)) {
        console.log(`Removed Cursor rule: ${targetPath}`);
      }
    }
    await removeEmptyDirectory(cursorDir);
    const cursorParent = path.dirname(cursorDir);
    if (path.basename(cursorParent) === '.cursor') {
      await removeEmptyDirectory(cursorParent);
    }
  }

  const instructionsDir = getInstructionsDir(projectRoot);
  if (await isDirectory(instructionsDir)) {
    if (backupRoot) {
      const backupPath = await moveToBackup(projectRoot, instructionsDir, backupRoot);
      console.log(`Backed up instruction modules: ${instructionsDir} -> ${backupPath}`);
    } else {
      await fs.rm(instructionsDir, { recursive: true, force: true });
      console.log(`Removed instruction modules: ${instructionsDir}`);
    }
  }
}

export async function restoreAdoptedProjectFiles(projectRoot) {
  const entries = await readAdoptedState(projectRoot);
  if (entries.length === 0) {
    return;
  }

  for (const entry of entries) {
    const targetPath = path.join(projectRoot, entry.targetPath);
    const backupPath = path.join(projectRoot, entry.backupPath);

    if (!(await fileExists(backupPath))) {
      continue;
    }

    if (await fileExists(targetPath)) {
      console.warn(`mid: skipped restore for ${targetPath} because a file already exists there.`);
      continue;
    }

    await ensureParentDir(targetPath);
    await fs.rename(backupPath, targetPath);
    console.log(`Restored ${targetPath}`);
  }

  await clearAdoptedState(projectRoot);
}

export async function cleanupMidDirectory(projectRoot) {
  const midDir = path.join(projectRoot, MID_DIR_NAME);
  const backupsDir = path.join(midDir, BACKUPS_DIR_NAME);
  const stateDir = path.join(midDir, STATE_DIR_NAME);
  const adoptedDir = path.join(midDir, ADOPTED_BACKUPS_DIR_NAME);
  const instructionsDir = path.join(midDir, INSTRUCTIONS_DIR_NAME);
  await removeEmptyDirectory(stateDir);
  await removeEmptyDirectory(instructionsDir);
  if (await isDirectory(adoptedDir)) {
    const entries = await fs.readdir(adoptedDir);
    for (const entry of entries.sort()) {
      await removeEmptyDirectory(path.join(adoptedDir, entry));
    }
    await removeEmptyDirectory(adoptedDir);
  }
  if (await isDirectory(backupsDir)) {
    return;
  }
  await removeEmptyDirectory(midDir);
}

function buildRouterParts(outputDir, assistant, modulesWithMetadata) {
  const alwaysApplyModules = modulesWithMetadata.filter((module) => module.meta.alwaysApply);
  const onDemandModules = modulesWithMetadata.filter((module) => !module.meta.alwaysApply);
  const parts = [
    '# Project Instructions',
    '',
    'Start with this file only. Do not load every referenced module by default.',
    '',
    '## Core Rules',
    '',
    '- Load additional instruction modules only when the task clearly matches their triggers.',
    '- Prefer the smallest relevant set of modules for the task.',
    '- Treat the relative paths below as the source of truth for deeper instructions under `.mid/instructions/`.',
    '- When a task does not match a module trigger, do not load that module.'
  ];

  if (alwaysApplyModules.length > 0) {
    parts.push('', '## Always Apply', '');
    for (const module of alwaysApplyModules) {
      parts.push(`- ${module.meta.title}`);
      parts.push(`  Path: ${relativeDisplayPath(outputDir, module.copiedInstructionPath)}`);
      if (module.meta.summary) {
        parts.push(`  Summary: ${module.meta.summary}`);
      }
      if (module.meta.triggers.length > 0) {
        parts.push(`  Use when: ${module.meta.triggers.join(', ')}`);
      }
    }
  }

  if (onDemandModules.length > 0) {
    parts.push('', '## Available Modules', '');
    for (const module of onDemandModules) {
      parts.push(`- ${module.meta.title}`);
      parts.push(`  Path: ${relativeDisplayPath(outputDir, module.copiedInstructionPath)}`);
      if (module.meta.summary) {
        parts.push(`  Summary: ${module.meta.summary}`);
      }
      if (module.meta.triggers.length > 0) {
        parts.push(`  Load when: ${module.meta.triggers.join(', ')}`);
      }
    }
  }

  const selectedFrameworks = modulesWithMetadata.filter((module) => module.group === 'framework').map((module) => module.label);
  const selectedLanguages = modulesWithMetadata.filter((module) => module.group === 'language').map((module) => module.label);
  const selectedShared = modulesWithMetadata
    .filter((module) => module.group === 'general')
    .map((module) => module.label);

  parts.push('', '## Selected Stack', '');
  parts.push(`- Languages: ${selectedLanguages.length > 0 ? selectedLanguages.join(', ') : '(none)'}`);
  parts.push(`- Frameworks: ${selectedFrameworks.length > 0 ? selectedFrameworks.join(', ') : '(none)'}`);
  parts.push(`- Shared modules: ${selectedShared.length > 0 ? selectedShared.join(', ') : '(none)'}`);

  const assistantNote = ASSISTANT_NOTES[assistant];
  if (assistantNote) {
    parts.push('', '## Assistant Notes', '');
    parts.push(`- ${assistantLabel(ASSISTANTS, assistant)}: ${assistantNote}`);
  }

  return parts;
}

async function writeMarkdownOutput(projectRoot, config, assistant, modulesWithMetadata) {
  const targetPath = assistantOutputPath(projectRoot, config, assistant);
  await ensureParentDir(targetPath);
  const outputDir = path.dirname(targetPath);
  const parts = [
    `<!-- ${MANAGED_TOKEN} assistant=${assistant} version=${CONFIG_VERSION} revision=${config.standardsRevision} -->`,
    '',
    `<!-- Generated by mid. Edit the source standards or ${CONFIG_NAME} instead. -->`,
    '',
    ...buildRouterParts(outputDir, assistant, modulesWithMetadata)
  ];

  await fs.writeFile(targetPath, `${parts.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${targetPath}`);
}

async function writeCursorOutputs(projectRoot, config, modulesWithMetadata) {
  const cursorDir = cursorOutputDir(projectRoot, config);
  if ((await fileExists(cursorDir)) && !(await isDirectory(cursorDir))) {
    throw new Error(`Cursor output path must be a directory: ${cursorDir}`);
  }

  await fs.mkdir(cursorDir, { recursive: true });
  const targetPath = cursorRouterPath(projectRoot, config);
  const plannedPaths = new Set([targetPath]);

  const existingEntries = await fs.readdir(cursorDir).catch(() => []);
  for (const entry of existingEntries.filter((name) => name.startsWith(CURSOR_PREFIX) && name.endsWith('.mdc')).sort()) {
    const existingPath = path.join(cursorDir, entry);
    if (plannedPaths.has(existingPath)) {
      continue;
    }
    if (await removeIfManaged(existingPath)) {
      console.log(`Removed stale Cursor rule: ${existingPath}`);
    }
  }

  const body = buildRouterParts(cursorDir, 'cursor', modulesWithMetadata).join('\n');
  const contents = [
    '---',
    `description: ${yamlQuote('Generated Cursor router for mid')}`,
    'alwaysApply: true',
    '---',
    '',
    `<!-- ${MANAGED_TOKEN} assistant=cursor version=${CONFIG_VERSION} revision=${config.standardsRevision} -->`,
    `<!-- Generated by mid. Edit the source standards or ${CONFIG_NAME} instead. -->`,
    '',
    body,
    ''
  ].join('\n');

  await fs.writeFile(targetPath, contents, 'utf8');
  console.log(`Wrote ${targetPath}`);
}

export async function generateOutputs(standardsRoot, projectRoot, config, resolvedModules) {
  await cleanupDeselectOutputs(projectRoot, config);
  const modulesWithMetadata = await Promise.all(
    resolvedModules.map((module) => loadModuleMetadata(standardsRoot, module))
  );
  const copiedModules = await syncInstructionModules(standardsRoot, projectRoot, modulesWithMetadata);

  for (const assistant of ['codex', 'claude', 'general']) {
    if (!config.assistants.includes(assistant)) {
      continue;
    }
    await writeMarkdownOutput(projectRoot, config, assistant, copiedModules);
  }

  if (config.assistants.includes('cursor')) {
    await writeCursorOutputs(projectRoot, config, copiedModules);
  }
}
