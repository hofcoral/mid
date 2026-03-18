import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadCatalog, resolveModuleIds, validateCatalog } from './catalog.js';
import { createDefaultConfig, getConfigPath, loadConfig, saveConfig, validateConfigSelection } from './config.js';
import {
  adoptExistingFile,
  backupConfigFile,
  createBackupRoot,
  generateOutputs,
  removeManagedProjectOutputs,
  removeManagedProjectOutputsWithOptions,
  restoreAdoptedProjectFiles
} from './generator.js';

const standardsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

test('catalog loads and resolves framework dependencies', async () => {
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);

  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.frameworks = ['framework.typescript.nextjs'];

  const resolved = resolveModuleIds(modules, config).map((module) => module.id);
  assert.equal(resolved.length, 2);
  assert.ok(resolved.includes('language.typescript'));
  assert.ok(resolved.includes('framework.typescript.nextjs'));
});

test('catalog is inferred from mid/ content', async () => {
  const modules = await loadCatalog(standardsRoot);
  const ids = modules.map((module) => module.id);

  assert.ok(ids.includes('core.git'));
  assert.ok(ids.includes('pattern.dry'));
  assert.ok(ids.includes('language.javascript'));
  assert.ok(ids.includes('language.python'));
  assert.ok(ids.includes('language.typescript'));
  assert.ok(ids.includes('framework.typescript.nestjs'));
});

test('config round-trips through .mid/config format', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-config-'));
  const config = createDefaultConfig();
  config.assistants = ['codex', 'cursor'];
  config.general = ['core.git'];
  config.languages = ['language.typescript'];
  config.frameworks = ['framework.typescript.react'];
  config.standardsRevision = 'abc123';

  await saveConfig(projectRoot, config);
  const { config: loaded } = await loadConfig(projectRoot);

  assert.ok(loaded);
  assert.deepEqual(loaded.assistants, config.assistants);
  assert.deepEqual(loaded.general, config.general);
  assert.deepEqual(loaded.languages, config.languages);
  assert.deepEqual(loaded.frameworks, config.frameworks);
  assert.equal(loaded.standardsRevision, 'abc123');
  await fs.access(getConfigPath(projectRoot));
});

test('config validation removes invalid entries in warn mode', async () => {
  const modules = await loadCatalog(standardsRoot);
  const config = createDefaultConfig();
  config.assistants = ['codex', 'unknown'];
  config.general = ['core.optional.git', 'framework.typescript.nextjs'];

  const issues = validateConfigSelection(config, modules, false);

  assert.ok(issues.length > 0);
  assert.deepEqual(config.assistants, ['codex']);
  assert.deepEqual(config.general, ['core.git']);
});

test('markdown outputs are router-style and reference module paths', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-output-'));
  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.general = ['core.git'];
  config.languages = ['language.typescript'];
  config.frameworks = ['framework.typescript.nextjs'];
  config.standardsRevision = 'abc123';

  const resolved = resolveModuleIds(modules, config);
  await generateOutputs(standardsRoot, projectRoot, config, resolved);

  const output = await fs.readFile(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  assert.match(output, /# Project Instructions/);
  assert.match(output, /## Always Apply/);
  assert.match(output, /## Available Modules/);
  assert.match(output, /Path: \.\/\.mid\/instructions\/core\/git\/instructions\.md/);
  assert.match(output, /Path: \.\/\.mid\/instructions\/languages\/typescript\/base\.instructions\.md/);
  assert.doesNotMatch(output, /## Branches/);

  await fs.access(path.join(projectRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md'));
  await fs.access(path.join(projectRoot, '.mid', 'instructions', 'languages', 'typescript', 'base.instructions.md'));
});

test('kill cleanup removes managed outputs', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-kill-'));
  const config = createDefaultConfig();
  config.assistants = ['codex', 'cursor'];
  config.general = ['core.git'];
  config.standardsRevision = 'abc123';

  const resolved = resolveModuleIds(modules, config);
  await generateOutputs(standardsRoot, projectRoot, config, resolved);
  await removeManagedProjectOutputs(projectRoot, config);

  await assert.rejects(fs.access(path.join(projectRoot, 'AGENTS.md')));
  await assert.rejects(fs.access(path.join(projectRoot, '.cursor', 'rules', 'mid-router.mdc')));
  await assert.rejects(fs.access(path.join(projectRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md')));
});

test('kill backup preserves managed outputs and config under .mid/backups', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-kill-backup-'));
  const config = createDefaultConfig();
  config.assistants = ['codex', 'cursor'];
  config.general = ['core.git'];
  config.standardsRevision = 'abc123';

  await saveConfig(projectRoot, config);
  const resolved = resolveModuleIds(modules, config);
  await generateOutputs(standardsRoot, projectRoot, config, resolved);

  const backupRoot = await createBackupRoot(projectRoot);
  await backupConfigFile(getConfigPath(projectRoot), backupRoot);
  await removeManagedProjectOutputsWithOptions(projectRoot, config, { backupRoot });

  await fs.access(path.join(backupRoot, 'config'));
  await fs.access(path.join(backupRoot, 'AGENTS.md'));
  await fs.access(path.join(backupRoot, '.cursor', 'rules', 'mid-router.mdc'));
  await fs.access(path.join(backupRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md'));
});

test('cursor output is a single router rule that points to .mid instructions', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-cursor-'));
  const config = createDefaultConfig();
  config.assistants = ['cursor'];
  config.general = ['core.git'];
  config.languages = ['language.typescript'];
  config.frameworks = ['framework.typescript.nestjs'];
  config.standardsRevision = 'abc123';

  const resolved = resolveModuleIds(modules, config);
  await generateOutputs(standardsRoot, projectRoot, config, resolved);

  const output = await fs.readFile(path.join(projectRoot, '.cursor', 'rules', 'mid-router.mdc'), 'utf8');
  assert.match(output, /alwaysApply: true/);
  assert.match(output, /# Project Instructions/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/core\/git\/instructions\.md/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/languages\/typescript\/base\.instructions\.md/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/languages\/typescript\/frameworks\/nestjs\/instructions\.md/);
  assert.doesNotMatch(output, /mid-20-/);
});

test('adopted unmanaged files are stored under .mid and restored on kill', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-adopted-restore-'));
  const originalPath = path.join(projectRoot, 'AGENTS.md');

  await fs.writeFile(originalPath, 'original unmanaged content\n', 'utf8');
  const backupPath = await adoptExistingFile(projectRoot, originalPath);

  await assert.rejects(fs.access(originalPath));
  await fs.access(backupPath);
  assert.match(backupPath, /\.mid\/adopted\//);

  await fs.writeFile(originalPath, '<!-- mid:managed -->\nmanaged replacement\n', 'utf8');
  await fs.rm(originalPath, { force: true });

  await restoreAdoptedProjectFiles(projectRoot);

  const restored = await fs.readFile(originalPath, 'utf8');
  assert.equal(restored, 'original unmanaged content\n');
  await assert.rejects(fs.access(backupPath));
});

test('bin/mid supports help, sync, and confirmed kill through the real CLI entrypoint', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-cli-'));
  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.general = ['core.git'];
  config.standardsRevision = 'abc123';

  await saveConfig(projectRoot, config);

  const cliPath = path.join(standardsRoot, 'bin', 'mid');
  const env = {
    ...process.env,
    MID_PROJECT_ROOT: projectRoot
  };

  const help = await execFileAsync(process.execPath, [cliPath, '--help'], { cwd: standardsRoot, env });
  assert.match(help.stdout, /Usage: mid/);
  assert.match(help.stdout, /mid sync/);
  assert.match(help.stdout, /mid kill/);
  assert.match(help.stdout, /--yes/);

  const sync = await execFileAsync(process.execPath, [cliPath, 'sync'], { cwd: standardsRoot, env });
  assert.match(sync.stdout, /Saved /);

  const output = await fs.readFile(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  assert.match(output, /# Project Instructions/);
  assert.match(output, /## Assistant Notes/);

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, 'kill'], { cwd: standardsRoot, env }),
    (error) => {
      assert.match(error.stderr, /requires confirmation/i);
      return true;
    }
  );

  await fs.access(path.join(projectRoot, 'AGENTS.md'));
  await fs.access(path.join(projectRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md'));
  await fs.access(getConfigPath(projectRoot));

  const kill = await execFileAsync(process.execPath, [cliPath, 'kill', '--yes'], { cwd: standardsRoot, env });
  assert.match(kill.stdout, /Removed /);

  await assert.rejects(fs.access(path.join(projectRoot, 'AGENTS.md')));
  await assert.rejects(fs.access(path.join(projectRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md')));
  await assert.rejects(fs.access(getConfigPath(projectRoot)));
});
