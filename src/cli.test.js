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
import { applyRecommendation, formatRecommendationSummary, hasMeaningfulSelection, recommendSelection } from './recommend.js';

const standardsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

test('catalog loads and resolves framework dependencies', async () => {
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);

  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.frameworks = ['framework.typescript.nextjs'];

  const resolved = resolveModuleIds(modules, config).map((module) => module.id);
  assert.equal(resolved.length, 3);
  assert.ok(resolved.includes('language.typescript'));
  assert.ok(resolved.includes('framework.typescript.nextjs'));
  assert.ok(resolved.includes('domain.frontend'));
});

test('catalog auto-includes deduped domain modules from framework tags', async () => {
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);

  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.general = ['core.git'];
  config.frameworks = ['framework.typescript.nestjs'];
  config.domains = ['domain.backend'];

  const resolved = resolveModuleIds(modules, config).map((module) => module.id);
  assert.equal(resolved.filter((id) => id === 'domain.backend').length, 1);
  assert.ok(resolved.includes('language.typescript'));
  assert.ok(resolved.includes('framework.typescript.nestjs'));
  assert.ok(resolved.includes('domain.backend'));
});

test('catalog dedupes frontend domain auto-inclusion across multiple tagged frameworks', async () => {
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);

  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.frameworks = ['framework.typescript.react', 'framework.typescript.nextjs'];

  const resolved = resolveModuleIds(modules, config).map((module) => module.id);
  assert.equal(resolved.filter((id) => id === 'domain.frontend').length, 1);
  assert.ok(resolved.includes('language.typescript'));
  assert.ok(resolved.includes('framework.typescript.react'));
  assert.ok(resolved.includes('framework.typescript.nextjs'));
  assert.ok(resolved.includes('domain.frontend'));
});

test('catalog is inferred from mid/ content', async () => {
  const modules = await loadCatalog(standardsRoot);
  const ids = modules.map((module) => module.id);

  assert.ok(ids.includes('core.git'));
  assert.ok(ids.includes('domain.backend'));
  assert.ok(ids.includes('domain.frontend'));
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
  config.domains = ['domain.backend'];
  config.patterns = ['pattern.dry', 'pattern.strategy'];
  config.languages = ['language.typescript'];
  config.frameworks = ['framework.typescript.react'];
  config.standardsRevision = 'abc123';

  await saveConfig(projectRoot, config);
  const { config: loaded } = await loadConfig(projectRoot);

  assert.ok(loaded);
  assert.deepEqual(loaded.assistants, config.assistants);
  assert.deepEqual(loaded.general, config.general);
  assert.deepEqual(loaded.domains, config.domains);
  assert.deepEqual(loaded.patterns, config.patterns);
  assert.deepEqual(loaded.languages, config.languages);
  assert.deepEqual(loaded.frameworks, config.frameworks);
  assert.equal(loaded.standardsRevision, 'abc123');
  await fs.access(getConfigPath(projectRoot));
});

test('config validation removes invalid entries in warn mode', async () => {
  const modules = await loadCatalog(standardsRoot);
  const config = createDefaultConfig();
  config.assistants = ['codex', 'unknown'];
  config.general = ['core.optional.git', 'pattern.strategy', 'framework.typescript.nextjs'];
  config.domains = ['domain.fake', 'domain.backend'];
  config.patterns = ['pattern.fake'];

  const issues = validateConfigSelection(config, modules, false);

  assert.ok(issues.length > 0);
  assert.deepEqual(config.assistants, ['codex']);
  assert.deepEqual(config.general, ['core.git']);
  assert.deepEqual(config.domains, ['domain.backend']);
  assert.deepEqual(config.patterns, ['pattern.strategy']);
});

test('repo recommendation detects a Next.js frontend repo conservatively', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-recommend-next-'));

  await fs.writeFile(path.join(projectRoot, 'package.json'), JSON.stringify({
    dependencies: {
      next: '^15.0.0',
      react: '^19.0.0',
      typescript: '^5.0.0',
      husky: '^9.0.0',
      eslint: '^9.0.0'
    }
  }, null, 2));
  await fs.writeFile(path.join(projectRoot, 'tsconfig.json'), '{}\n');
  await fs.mkdir(path.join(projectRoot, '.git'));
  await fs.mkdir(path.join(projectRoot, '.husky'));
  await fs.writeFile(path.join(projectRoot, '.husky', 'pre-commit'), 'npm test\n');
  await fs.mkdir(path.join(projectRoot, 'app'));
  await fs.writeFile(path.join(projectRoot, 'app', 'page.tsx'), 'export default function Page() { return null; }\n');

  const recommendation = await recommendSelection(projectRoot, modules);

  assert.deepEqual(recommendation.languages, ['language.typescript']);
  assert.deepEqual(recommendation.frameworks, ['framework.typescript.nextjs']);
  assert.deepEqual(recommendation.domains, ['domain.frontend']);
  assert.deepEqual(recommendation.general, ['core.git', 'core.husky', 'core.lint']);
  assert.deepEqual(recommendation.patterns, []);
});

test('repo recommendation detects a NestJS backend repo conservatively', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-recommend-nest-'));

  await fs.writeFile(path.join(projectRoot, 'package.json'), JSON.stringify({
    dependencies: {
      '@nestjs/common': '^11.0.0',
      '@nestjs/core': '^11.0.0',
      typescript: '^5.0.0'
    }
  }, null, 2));
  await fs.writeFile(path.join(projectRoot, 'tsconfig.json'), '{}\n');
  await fs.mkdir(path.join(projectRoot, '.git'));
  await fs.mkdir(path.join(projectRoot, 'src'));
  await fs.mkdir(path.join(projectRoot, 'src', 'api'));
  await fs.writeFile(path.join(projectRoot, 'src', 'api', 'health.controller.ts'), 'export class HealthController {}\n');

  const recommendation = await recommendSelection(projectRoot, modules);

  assert.deepEqual(recommendation.languages, ['language.typescript']);
  assert.deepEqual(recommendation.frameworks, ['framework.typescript.nestjs']);
  assert.deepEqual(recommendation.domains, ['domain.backend']);
  assert.deepEqual(recommendation.general, ['core.git']);
});

test('recommendation is only applied to an effectively empty config', async () => {
  const config = createDefaultConfig();
  const recommendation = {
    assistants: [],
    general: ['core.git'],
    domains: ['domain.frontend'],
    patterns: [],
    languages: ['language.typescript'],
    frameworks: ['framework.typescript.react']
  };

  assert.equal(hasMeaningfulSelection(config), false);
  applyRecommendation(config, recommendation);
  assert.deepEqual(config.general, ['core.git']);
  assert.deepEqual(config.domains, ['domain.frontend']);
  assert.deepEqual(config.languages, ['language.typescript']);
  assert.deepEqual(config.frameworks, ['framework.typescript.react']);

  config.general = ['core.lint'];
  assert.equal(hasMeaningfulSelection(config), true);
  applyRecommendation(config, {
    ...recommendation,
    general: ['core.git', 'core.husky']
  });
  assert.deepEqual(config.general, ['core.lint']);
});

test('recommendation summary formats human-readable reasons', async () => {
  const modules = await loadCatalog(standardsRoot);
  const lines = formatRecommendationSummary({
    reasons: [
      { id: 'language.typescript', reasons: ['Found tsconfig.json.'] },
      { id: 'framework.typescript.nextjs', reasons: ['Found `next` in package.json.'] }
    ]
  }, modules);

  assert.deepEqual(lines, [
    '- TypeScript: Found tsconfig.json.',
    '- Next.js: Found `next` in package.json.'
  ]);
});

test('markdown outputs are router-style and bundle selected patterns into one file', async () => {
  const modules = await loadCatalog(standardsRoot);
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mid-output-'));
  const config = createDefaultConfig();
  config.assistants = ['codex'];
  config.general = ['core.git'];
  config.patterns = ['pattern.dry', 'pattern.strategy'];
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
  assert.match(output, /Path: \.\/\.mid\/instructions\/design-patterns\.md/);
  assert.match(output, /Path: \.\/\.mid\/instructions\/languages\/typescript\/base\.instructions\.md/);
  assert.doesNotMatch(output, /Path: \.\/\.mid\/instructions\/patterns\/dry\/instructions\.md/);
  assert.doesNotMatch(output, /## Branches/);

  await fs.access(path.join(projectRoot, '.mid', 'instructions', 'core', 'git', 'instructions.md'));
  const patternBundle = await fs.readFile(path.join(projectRoot, '.mid', 'instructions', 'design-patterns.md'), 'utf8');
  assert.match(patternBundle, /# Design Patterns/);
  assert.match(patternBundle, /## DRY/);
  assert.match(patternBundle, /## Strategy/);
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
  config.patterns = ['pattern.decorator'];
  config.languages = ['language.typescript'];
  config.frameworks = ['framework.typescript.nestjs'];
  config.standardsRevision = 'abc123';

  const resolved = resolveModuleIds(modules, config);
  await generateOutputs(standardsRoot, projectRoot, config, resolved);

  const output = await fs.readFile(path.join(projectRoot, '.cursor', 'rules', 'mid-router.mdc'), 'utf8');
  assert.match(output, /alwaysApply: true/);
  assert.match(output, /# Project Instructions/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/core\/git\/instructions\.md/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/domains\/backend\/instructions\.md/);
  assert.match(output, /Path: \.\.\/\.\.\/\.mid\/instructions\/design-patterns\.md/);
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
  assert.match(output, /## Selected Stack/);

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
