#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, validateCatalog } from './catalog.js';
import { loadModuleMetadata } from './module-metadata.js';

function resolveStandardsRoot() {
  if (process.env.MID_HOME) {
    return path.resolve(process.env.MID_HOME);
  }
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

async function main() {
  const standardsRoot = resolveStandardsRoot();
  const modules = await loadCatalog(standardsRoot);
  validateCatalog(modules);
  for (const module of modules) {
    await loadModuleMetadata(standardsRoot, module);
  }
  console.log(`Validated ${modules.length} modules`);
}

main().catch((error) => {
  console.error(`mid: validate-content failed: ${error.message}`);
  process.exitCode = 1;
});
