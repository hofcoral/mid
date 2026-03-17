#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadCatalog, resolveModuleIds, validateCatalog } from './catalog.js';
import { createDefaultConfig, getConfigPath, loadConfig, saveConfig, validateConfigSelection } from './config.js';
import { CONFIG_NAME, CONFIG_RELATIVE_PATH } from './constants.js';
import {
  backupConfigFile,
  cleanupMidDirectory,
  createBackupRoot,
  ensureSyncSafe,
  generateOutputs,
  removeManagedProjectOutputsWithOptions,
  restoreAdoptedProjectFiles,
  resolveInteractiveConflicts,
  validateTargetCollisions
} from './generator.js';
import { interactiveConfig } from './interactive.js';
import { getGitRevision, joinIds } from './utils.js';

function resolveStandardsRoot() {
  if (process.env.MID_HOME) {
    return path.resolve(process.env.MID_HOME);
  }

  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

function getProjectRoot() {
  return process.env.MID_PROJECT_ROOT ? path.resolve(process.env.MID_PROJECT_ROOT) : process.cwd();
}

async function loadState(projectRoot) {
  const { config, warning } = await loadConfig(projectRoot);
  if (warning) {
    console.warn(`mid: ${warning}`);
  }
  return config ?? createDefaultConfig();
}

async function interactiveRun(standardsRoot, projectRoot, modules) {
  const config = await loadState(projectRoot);
  validateConfigSelection(config, modules, false);
  await interactiveConfig(modules, config);
  await validateTargetCollisions(projectRoot, config);
  const resolvedModules = resolveModuleIds(modules, config);
  await resolveInteractiveConflicts(projectRoot, config, resolvedModules);
  await validateTargetCollisions(projectRoot, config);
  config.standardsRevision = await getGitRevision(standardsRoot);
  const configPath = await saveConfig(projectRoot, config);
  console.log(`Saved ${configPath}`);
  await generateOutputs(standardsRoot, projectRoot, config, resolvedModules);
}

async function syncRun(standardsRoot, projectRoot, modules) {
  const { config } = await loadConfig(projectRoot);
  if (!config) {
    throw new Error(`Missing ${CONFIG_NAME} in ${projectRoot}`);
  }

  validateConfigSelection(config, modules, true);
  await validateTargetCollisions(projectRoot, config);
  const resolvedModules = resolveModuleIds(modules, config);
  await ensureSyncSafe(projectRoot, config, resolvedModules);
  config.standardsRevision = await getGitRevision(standardsRoot);
  const configPath = await saveConfig(projectRoot, config);
  console.log(`Saved ${configPath}`);
  await generateOutputs(standardsRoot, projectRoot, config, resolvedModules);
}

async function doctorRun(standardsRoot, projectRoot, modules) {
  console.log(`standards_root: ${standardsRoot}`);
  console.log(`content_root: ${path.join(standardsRoot, 'mid')}`);
  console.log(`revision: ${await getGitRevision(standardsRoot)}`);
  console.log(`modules: ${modules.length}`);
  console.log(`project_root: ${projectRoot}`);

  const { config } = await loadConfig(projectRoot);
  if (!config) {
    console.log(`config: missing (${path.join(projectRoot, CONFIG_RELATIVE_PATH)})`);
    return;
  }

  try {
    validateConfigSelection(config, modules, true);
    const resolvedModules = resolveModuleIds(modules, config);
    console.log(`config: valid (${path.join(projectRoot, CONFIG_RELATIVE_PATH)})`);
    console.log(`assistants: ${joinIds(config.assistants)}`);
    console.log(`resolved_modules: ${joinIds(resolvedModules.map((module) => module.id))}`);
  } catch {
    console.log(`config: invalid (${path.join(projectRoot, CONFIG_RELATIVE_PATH)})`);
  }
}

async function killRun(projectRoot, options) {
  const { config, warning } = await loadConfig(projectRoot);
  if (warning) {
    console.warn(`mid: ${warning}`);
  }
  if (!config) {
    throw new Error(`Missing ${CONFIG_RELATIVE_PATH} in ${projectRoot}`);
  }

  const configPath = getConfigPath(projectRoot);
  let backupRoot = null;
  if (options.backup) {
    backupRoot = await createBackupRoot(projectRoot);
    const backupPath = await backupConfigFile(configPath, backupRoot);
    console.log(`Backed up config: ${configPath} -> ${backupPath}`);
  }

  await removeManagedProjectOutputsWithOptions(projectRoot, config, { backupRoot });
  await restoreAdoptedProjectFiles(projectRoot);
  await fs.rm(configPath, { force: true });
  console.log(`Removed ${configPath}`);
  await cleanupMidDirectory(projectRoot);
}

function printUsage() {
  console.log(`
Usage: mid [command] [flags]

Commands:
  mid           run the interactive selector
  mid sync      regenerate outputs from .mid/config
  mid doctor    show standards metadata and config status
  mid kill      delete managed outputs and .mid/config

Flags:
  -b, --backup  (kill only) snapshot generated files under .mid/backups/<timestamp> before cleanup
  -h, --help    show this help text
`);
}

async function main() {
  const rawCommand = process.argv[2] ?? '';
  const flags = new Set(process.argv.slice(3));
  const helpRequested = rawCommand === 'help' || rawCommand === '--help' || rawCommand === '-h' || flags.has('--help') || flags.has('-h');
  if (helpRequested) {
    printUsage();
    return;
  }
  const command = rawCommand;
  if (!['', 'sync', 'doctor', 'kill'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  const standardsRoot = resolveStandardsRoot();
  const projectRoot = getProjectRoot();
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);

  if (command === 'sync') {
    await syncRun(standardsRoot, projectRoot, modules);
    return;
  }

  if (command === 'doctor') {
    await doctorRun(standardsRoot, projectRoot, modules);
    return;
  }

  if (command === 'kill') {
    await killRun(projectRoot, { backup: flags.has('--backup') || flags.has('-b') });
    return;
  }

  await interactiveRun(standardsRoot, projectRoot, modules);
}

main().catch((error) => {
  console.error(`mid: ${error.message}`);
  process.exitCode = 1;
});
