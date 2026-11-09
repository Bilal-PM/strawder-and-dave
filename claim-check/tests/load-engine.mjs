// Loads the analysis engine straight out of index.html so tests always run the shipped code.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const src = html.slice(html.indexOf('/*ENGINE-START*/'), html.indexOf('/*ENGINE-END*/'));
new Function(src)();
export const ClaimCheck = globalThis.ClaimCheck;
export function exampleFromHtml(name) {
  const m = html.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  return m ? m[1] : '';
}
