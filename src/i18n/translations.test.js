import fs from 'fs';
import path from 'path';
import fr from './locales/fr.json';

// Every English text passed to tx() (or `tr`, its alias in Wallet.js) needs a
// French entry in fr.json "text"; otherwise French viewers see English.
const SRC = path.join(__dirname, '..');

const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'mockData' ? [] : sourceFiles(full);
  return /\.js$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
});

/** The first argument of each tx( … ) call, up to its top-level comma or closing paren. */
function firstArguments(code) {
  const args = [];
  const re = /\b(?:tx|tr)\(/g;
  while (re.exec(code)) {
    let depth = 0; let quote = null; let i = re.lastIndex; let out = '';
    for (; i < code.length; i += 1) {
      const c = code[i];
      if (quote) {
        out += c;
        if (c === '\\') { out += code[i + 1]; i += 1; } else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
      if (c === '(' || c === '{' || c === '[') depth += 1;
      if (c === ')' || c === '}' || c === ']') { if (depth === 0) break; depth -= 1; }
      if (c === ',' && depth === 0) break;
      out += c;
    }
    args.push(out);
  }
  return args;
}

// Strings in the argument, minus values that are only compared (e.g. `type === 'Series' ? 'A' : 'B'`).
const literals = (arg) => [...arg
  .replace(/(?:===|!==)\s*(['"])(?:\\.|(?!\1).)*\1/g, '')
  .matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\(.)/g, '$1'));

test('every tx() text has a French translation', () => {
  const missing = [];
  sourceFiles(SRC).forEach((file) => {
    firstArguments(fs.readFileSync(file, 'utf8')).forEach((arg) => {
      literals(arg).forEach((text) => {
        if (!(text in fr.text)) missing.push(`${path.relative(SRC, file)}: ${text}`);
      });
    });
  });
  expect(missing).toEqual([]);
});
