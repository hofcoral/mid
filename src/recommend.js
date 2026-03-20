import fs from 'node:fs/promises';
import path from 'node:path';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function pathExists(targetPath) {
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

async function readJsonIfExists(targetPath) {
  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function readTextIfExists(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

async function directoryHasEntries(projectRoot, relativePath) {
  const targetPath = path.join(projectRoot, relativePath);
  if (!(await isDirectory(targetPath))) {
    return false;
  }

  const entries = await fs.readdir(targetPath);
  return entries.length > 0;
}

function createScorecard() {
  return new Map();
}

function addScore(scorecard, id, score, reason) {
  const current = scorecard.get(id) ?? { score: 0, reasons: [] };
  current.score += score;
  if (reason && !current.reasons.includes(reason)) {
    current.reasons.push(reason);
  }
  scorecard.set(id, current);
}

function selectedFromScorecard(scorecard, threshold) {
  return [...scorecard.entries()]
    .filter(([, value]) => value.score >= threshold)
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
    .map(([id]) => id);
}

function collectReasons(scorecards, selectedIds) {
  return selectedIds.map((id) => ({
    id,
    reasons: unique(
      scorecards
        .map((scorecard) => scorecard.get(id)?.reasons ?? [])
        .flat()
    )
  }));
}

function hasDependency(packageJson, dependencyName) {
  if (!packageJson || typeof packageJson !== 'object') {
    return false;
  }

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (packageJson[field] && dependencyName in packageJson[field]) {
      return true;
    }
  }

  return false;
}

function moduleExists(modules, id) {
  return modules.some((module) => module.id === id);
}

function chooseTypeScriptFramework(modules, frameworkIds) {
  const available = frameworkIds.filter((id) => moduleExists(modules, id));
  if (available.includes('framework.typescript.nextjs')) {
    return ['framework.typescript.nextjs'];
  }
  if (available.includes('framework.typescript.nestjs')) {
    return ['framework.typescript.nestjs'];
  }
  if (available.includes('framework.typescript.vite')) {
    return ['framework.typescript.vite'];
  }
  if (available.includes('framework.typescript.react')) {
    return ['framework.typescript.react'];
  }
  return [];
}

export async function scanProjectSignals(projectRoot) {
  const [
    packageJson,
    tsconfig,
    pyprojectText,
    requirementsText,
    nextConfigJs,
    nextConfigMjs,
    nextConfigTs,
    viteConfigJs,
    viteConfigTs,
    eslintConfigJs,
    eslintConfigCjs,
    eslintConfigMjs,
    eslintConfigJson,
    gitDirExists,
    huskyDirHasEntries,
    appDirHasEntries,
    pagesDirHasEntries,
    componentsDirHasEntries,
    srcComponentsDirHasEntries,
    apiDirHasEntries,
    srcApiDirHasEntries,
    serverDirHasEntries,
    controllersDirHasEntries,
    routesDirHasEntries
  ] = await Promise.all([
    readJsonIfExists(path.join(projectRoot, 'package.json')),
    readJsonIfExists(path.join(projectRoot, 'tsconfig.json')),
    readTextIfExists(path.join(projectRoot, 'pyproject.toml')),
    readTextIfExists(path.join(projectRoot, 'requirements.txt')),
    pathExists(path.join(projectRoot, 'next.config.js')),
    pathExists(path.join(projectRoot, 'next.config.mjs')),
    pathExists(path.join(projectRoot, 'next.config.ts')),
    pathExists(path.join(projectRoot, 'vite.config.js')),
    pathExists(path.join(projectRoot, 'vite.config.ts')),
    pathExists(path.join(projectRoot, '.eslintrc.js')),
    pathExists(path.join(projectRoot, '.eslintrc.cjs')),
    pathExists(path.join(projectRoot, '.eslintrc.mjs')),
    pathExists(path.join(projectRoot, '.eslintrc.json')),
    isDirectory(path.join(projectRoot, '.git')),
    directoryHasEntries(projectRoot, '.husky'),
    directoryHasEntries(projectRoot, 'app'),
    directoryHasEntries(projectRoot, 'pages'),
    directoryHasEntries(projectRoot, 'components'),
    directoryHasEntries(projectRoot, path.join('src', 'components')),
    directoryHasEntries(projectRoot, 'api'),
    directoryHasEntries(projectRoot, path.join('src', 'api')),
    directoryHasEntries(projectRoot, 'server'),
    directoryHasEntries(projectRoot, 'controllers'),
    directoryHasEntries(projectRoot, 'routes')
  ]);

  return {
    packageJson,
    tsconfig,
    pyprojectText,
    requirementsText,
    nextConfigExists: nextConfigJs || nextConfigMjs || nextConfigTs,
    viteConfigExists: viteConfigJs || viteConfigTs,
    eslintConfigExists: eslintConfigJs || eslintConfigCjs || eslintConfigMjs || eslintConfigJson,
    gitDirExists,
    huskyDirHasEntries,
    appDirHasEntries,
    pagesDirHasEntries,
    componentsDirHasEntries,
    srcComponentsDirHasEntries,
    apiDirHasEntries,
    srcApiDirHasEntries,
    serverDirHasEntries,
    controllersDirHasEntries,
    routesDirHasEntries
  };
}

export async function recommendSelection(projectRoot, modules) {
  const signals = await scanProjectSignals(projectRoot);
  const languages = createScorecard();
  const frameworks = createScorecard();
  const domains = createScorecard();
  const general = createScorecard();

  if (signals.gitDirExists && moduleExists(modules, 'core.git')) {
    addScore(general, 'core.git', 10, 'Found a .git directory.');
  }

  if (
    (signals.huskyDirHasEntries || hasDependency(signals.packageJson, 'husky'))
    && moduleExists(modules, 'core.husky')
  ) {
    addScore(general, 'core.husky', 8, signals.huskyDirHasEntries ? 'Found a populated .husky directory.' : 'Found `husky` in package.json.');
  }

  if (
    (signals.eslintConfigExists
      || hasDependency(signals.packageJson, 'eslint')
      || hasDependency(signals.packageJson, '@typescript-eslint/eslint-plugin')
      || hasDependency(signals.packageJson, '@typescript-eslint/parser'))
    && moduleExists(modules, 'core.lint')
  ) {
    addScore(general, 'core.lint', 7, signals.eslintConfigExists ? 'Found ESLint config files.' : 'Found lint dependencies in package.json.');
  }

  if ((signals.tsconfig || hasDependency(signals.packageJson, 'typescript')) && moduleExists(modules, 'language.typescript')) {
    addScore(languages, 'language.typescript', 10, signals.tsconfig ? 'Found tsconfig.json.' : 'Found `typescript` in package.json.');
  }

  if (
    (
      hasDependency(signals.packageJson, 'react')
      || hasDependency(signals.packageJson, 'next')
      || hasDependency(signals.packageJson, 'vite')
    )
    && moduleExists(modules, 'language.typescript')
    && !signals.tsconfig
  ) {
    addScore(languages, 'language.typescript', 5, 'Found TS-first frontend dependencies in package.json.');
  }

  if (
    (signals.pyprojectText.includes('[project]') || signals.pyprojectText.includes('[tool.poetry]') || signals.requirementsText.trim() !== '')
    && moduleExists(modules, 'language.python')
  ) {
    addScore(
      languages,
      'language.python',
      10,
      signals.requirementsText.trim() !== '' ? 'Found requirements.txt.' : 'Found Python project metadata in pyproject.toml.'
    );
  }

  if ((hasDependency(signals.packageJson, 'next') || signals.nextConfigExists) && moduleExists(modules, 'framework.typescript.nextjs')) {
    addScore(
      frameworks,
      'framework.typescript.nextjs',
      12,
      hasDependency(signals.packageJson, 'next') ? 'Found `next` in package.json.' : 'Found next.config.*.'
    );
  }

  if (
    (hasDependency(signals.packageJson, '@nestjs/core') || hasDependency(signals.packageJson, '@nestjs/common'))
    && moduleExists(modules, 'framework.typescript.nestjs')
  ) {
    addScore(frameworks, 'framework.typescript.nestjs', 12, 'Found NestJS dependencies in package.json.');
  }

  if ((hasDependency(signals.packageJson, 'vite') || signals.viteConfigExists) && moduleExists(modules, 'framework.typescript.vite')) {
    addScore(
      frameworks,
      'framework.typescript.vite',
      10,
      hasDependency(signals.packageJson, 'vite') ? 'Found `vite` in package.json.' : 'Found vite.config.*.'
    );
  }

  if (
    hasDependency(signals.packageJson, 'react')
    && moduleExists(modules, 'framework.typescript.react')
  ) {
    addScore(frameworks, 'framework.typescript.react', 6, 'Found `react` in package.json.');
  }

  if (
    (
      signals.appDirHasEntries
      || signals.pagesDirHasEntries
      || signals.componentsDirHasEntries
      || signals.srcComponentsDirHasEntries
      || hasDependency(signals.packageJson, 'react')
      || hasDependency(signals.packageJson, 'next')
    )
    && moduleExists(modules, 'domain.frontend')
  ) {
    const reasons = [];
    if (signals.appDirHasEntries) reasons.push('Found an `app/` directory.');
    if (signals.pagesDirHasEntries) reasons.push('Found a `pages/` directory.');
    if (signals.componentsDirHasEntries || signals.srcComponentsDirHasEntries) reasons.push('Found component directories.');
    if (reasons.length === 0) {
      reasons.push('Found frontend dependencies in package.json.');
    }
    for (const reason of reasons) {
      addScore(domains, 'domain.frontend', 4, reason);
    }
  }

  if (
    (
      signals.apiDirHasEntries
      || signals.srcApiDirHasEntries
      || signals.serverDirHasEntries
      || signals.controllersDirHasEntries
      || signals.routesDirHasEntries
      || hasDependency(signals.packageJson, '@nestjs/core')
      || hasDependency(signals.packageJson, 'express')
      || hasDependency(signals.packageJson, 'fastify')
    )
    && moduleExists(modules, 'domain.backend')
  ) {
    const reasons = [];
    if (signals.apiDirHasEntries || signals.srcApiDirHasEntries) reasons.push('Found API directories.');
    if (signals.serverDirHasEntries) reasons.push('Found a `server/` directory.');
    if (signals.controllersDirHasEntries) reasons.push('Found a `controllers/` directory.');
    if (signals.routesDirHasEntries) reasons.push('Found a `routes/` directory.');
    if (reasons.length === 0) {
      reasons.push('Found backend dependencies in package.json.');
    }
    for (const reason of reasons) {
      addScore(domains, 'domain.backend', 4, reason);
    }
  }

  const recommendedLanguages = selectedFromScorecard(languages, 8);
  const recommendedFrameworks = chooseTypeScriptFramework(modules, selectedFromScorecard(frameworks, 6));
  const recommendedDomains = selectedFromScorecard(domains, 4);
  const recommendedGeneral = selectedFromScorecard(general, 6);

  const reasons = [
    ...collectReasons([languages], recommendedLanguages),
    ...collectReasons([frameworks], recommendedFrameworks),
    ...collectReasons([domains], recommendedDomains),
    ...collectReasons([general], recommendedGeneral)
  ];

  return {
    languages: recommendedLanguages,
    frameworks: recommendedFrameworks,
    domains: recommendedDomains,
    general: recommendedGeneral,
    patterns: [],
    assistants: [],
    reasons
  };
}

export function hasMeaningfulSelection(config) {
  return [
    config.assistants,
    config.general,
    config.domains,
    config.patterns,
    config.languages,
    config.frameworks
  ].some((values) => Array.isArray(values) && values.length > 0);
}

export function applyRecommendation(config, recommendation) {
  for (const key of ['general', 'domains', 'patterns', 'languages', 'frameworks']) {
    if (Array.isArray(config[key]) && config[key].length === 0) {
      config[key] = [...(recommendation[key] ?? [])];
    }
  }
  return config;
}

export function formatRecommendationSummary(recommendation, modules) {
  const moduleLabels = new Map(modules.map((module) => [module.id, module.label]));
  const lines = [];

  for (const entry of recommendation.reasons) {
    const label = moduleLabels.get(entry.id);
    if (!label || entry.reasons.length === 0) {
      continue;
    }
    lines.push(`- ${label}: ${entry.reasons.join(' ')}`);
  }

  return lines;
}
