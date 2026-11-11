import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';

export function parseNoteSource(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('프런트매터가 없습니다');
  return parse(match[1]) ?? {};
}

export function readNoteSources(root = '.') {
  function walk(dir) {
    return readdirSync(dir).sort().flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      if (!name.endsWith('.md')) return [];
      const file = relative(root, path);
      try { return [{ file, data: parseNoteSource(readFileSync(path, 'utf8')) }]; }
      catch (error) { throw new Error(`${file}: ${error.message}`); }
    });
  }
  return walk(join(root, 'src/content/notes'));
}
