// Reads content/ from disk in the same shape the app gets from import.meta.glob.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadContent } from '../src/content/load.ts';

export const CONTENT_DIR = join(import.meta.dirname, '..', 'content');

export function readContentFiles(dir = CONTENT_DIR): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    const rel = relative(dir, full).split(sep).join('/');
    if (rel.startsWith('assets/')) continue;
    if (!/\.(ya?ml|py)$/.test(rel) && !/^characters\/[^/]+\.md$/.test(rel)) continue;
    files[rel] = readFileSync(full, 'utf8');
  }
  return files;
}

/** Loads content and exits with a report if there are errors. */
export function loadOrDie() {
  const { content, issues } = loadContent(readContentFiles());
  const errors = issues.filter((i) => i.level === 'error');
  for (const i of issues) console.log(`${i.level === 'error' ? '✗' : '⚠'} content/${i.file}: ${i.message}`);
  if (errors.length) {
    console.error(`\n${errors.length} ошибок в контенте`);
    process.exit(1);
  }
  return content;
}
