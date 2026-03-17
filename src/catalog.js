import fs from 'node:fs/promises';
import path from 'node:path';
import { readModuleAttributes, resolveModuleFiles } from './module-metadata.js';

function titleize(value) {
  return value
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function requiredIdFor(relativePath) {
  const normalized = relativePath
    .replace(/^mid\/core\/required\//, '')
    .replace(/\.md$/, '')
    .replace(/\//g, '.');

  return `required.${normalized}`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function discoverRequiredModules(standardsRoot) {
  const requiredRoot = path.join(standardsRoot, 'mid', 'core', 'required');
  try {
    const entries = await fs.readdir(requiredRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => {
        const relativePath = path.posix.join('mid/core/required', entry.name);
        return {
          id: requiredIdFor(relativePath),
          label: titleize(path.basename(entry.name, '.md')),
          group: 'required',
          path: relativePath,
          language: '',
          requires: []
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function discoverGeneralModules(standardsRoot, relativeRoot, prefix) {
  const rootPath = path.join(standardsRoot, relativeRoot);
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const modules = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const relativePath = path.posix.join(relativeRoot, entry.name);
      const { sourcePath, metadataPath } = resolveModuleFiles(standardsRoot, relativePath);
      if (!(await pathExists(sourcePath)) || !(await pathExists(metadataPath))) {
        continue;
      }

      const attributes = await readModuleAttributes(metadataPath);
      modules.push({
        id: `${prefix}.${entry.name.toLowerCase()}`,
        label: attributes.title || titleize(entry.name),
        group: 'general',
        path: relativePath,
        language: '',
        requires: []
      });
    }

    return modules.sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function discoverLanguageModules(standardsRoot) {
  const languagesRoot = path.join(standardsRoot, 'mid', 'languages');
  try {
    const entries = await fs.readdir(languagesRoot, { withFileTypes: true });
    const modules = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const languageName = entry.name.toLowerCase();
      const languageRoot = path.posix.join('mid/languages', entry.name);
      const basePath = path.posix.join(languageRoot, 'base.instructions.md');
      const baseMetadataPath = path.posix.join(languageRoot, 'base.metadata.json');

      if (await pathExists(path.join(standardsRoot, basePath))) {
        const attributes = await readModuleAttributes(path.join(standardsRoot, baseMetadataPath));
        modules.push({
          id: `language.${languageName}`,
          label: attributes.title || titleize(languageName),
          group: 'language',
          path: basePath,
          language: '',
          requires: []
        });
      }

      const frameworksRoot = path.join(standardsRoot, languageRoot, 'frameworks');
      if (!(await pathExists(frameworksRoot))) {
        continue;
      }

      const frameworkEntries = await fs.readdir(frameworksRoot, { withFileTypes: true });
      for (const frameworkEntry of frameworkEntries) {
        if (!frameworkEntry.isDirectory()) {
          continue;
        }

        const frameworkPath = path.posix.join(languageRoot, 'frameworks', frameworkEntry.name);
        const { sourcePath, metadataPath } = resolveModuleFiles(standardsRoot, frameworkPath);
        if (!(await pathExists(sourcePath)) || !(await pathExists(metadataPath))) {
          continue;
        }

        const attributes = await readModuleAttributes(metadataPath);
        modules.push({
          id: `framework.${languageName}.${frameworkEntry.name.toLowerCase()}`,
          label: attributes.title || titleize(frameworkEntry.name),
          group: 'framework',
          path: frameworkPath,
          language: `language.${languageName}`,
          requires: [`language.${languageName}`]
        });
      }
    }

    return modules.sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function loadCatalog(standardsRoot) {
  const modules = [
    ...(await discoverRequiredModules(standardsRoot)),
    ...(await discoverGeneralModules(standardsRoot, 'mid/core/optional', 'core.optional')),
    ...(await discoverGeneralModules(standardsRoot, 'mid/patterns', 'pattern')),
    ...(await discoverGeneralModules(standardsRoot, 'mid/workflows', 'workflow')),
    ...(await discoverLanguageModules(standardsRoot))
  ];

  return modules;
}

export function validateCatalog(modules) {
  const validGroups = new Set(['required', 'general', 'language', 'framework']);
  const byId = new Map(modules.map((module) => [module.id, module]));

  for (const module of modules) {
    if (!validGroups.has(module.group)) {
      throw new Error(`Module ${module.id} has invalid group ${module.group}`);
    }

    if (module.group === 'framework' && !module.language) {
      throw new Error(`Framework module ${module.id} is missing a language id.`);
    }

    if (module.language && !byId.has(module.language)) {
      throw new Error(`Module ${module.id} references missing language ${module.language}`);
    }

    for (const dependency of module.requires) {
      if (!byId.has(dependency)) {
        throw new Error(`Module ${module.id} depends on missing module ${dependency}`);
      }
    }
  }
}

export function collectModules(modules, group, selectedLanguages = []) {
  return modules.filter((module) => {
    if (module.group !== group) {
      return false;
    }

    if (group !== 'framework') {
      return true;
    }

    return selectedLanguages.length > 0 && selectedLanguages.includes(module.language);
  });
}

export function resolveModuleIds(modules, config) {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const visited = new Set();

  function visit(id) {
    if (!id || visited.has(id)) {
      return;
    }

    const module = byId.get(id);
    if (!module) {
      throw new Error(`Selected module is missing from manifest: ${id}`);
    }

    visited.add(id);
    for (const dependency of module.requires) {
      visit(dependency);
    }
  }

  const requested = [
    ...modules.filter((module) => module.group === 'required').map((module) => module.id),
    ...config.general,
    ...config.languages,
    ...config.frameworks
  ];

  for (const id of requested) {
    visit(id);
  }

  return modules.filter((module) => visited.has(module.id));
}
