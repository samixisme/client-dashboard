import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const nm = 'C:/Users/Sami/client-dashboard/node_modules';

function isESM(pkgDir) {
  try {
    const pj = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
    if (pj.type === 'module') return true;
    if (pj.module) return true;
    const exportsStr = JSON.stringify(pj.exports || {});
    if (exportsStr.includes('"import"')) return true;
    return false;
  } catch { return false; }
}

function getVersion(pkgDir) {
  try { return JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version; } catch { return '?'; }
}

// Find which package's dist files import 'debug'
// The error is in create-tokenizer.js — find what that belongs to
const bsRoot = join(nm, '@blocksuite');
const results = [];

function walkForImport(dir, pkg, target) {
  if (!existsSync(dir)) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walkForImport(full, pkg, target);
    } else if (e.endsWith('.js') || e.endsWith('.mjs')) {
      try {
        const src = readFileSync(full, 'utf8');
        const q1 = `'${target}'`;
        const q2 = `"${target}"`;
        if (src.includes(q1) || src.includes(q2)) {
          results.push(`  ${pkg}/${e}`);
        }
      } catch {}
    }
  }
}

// Check @blocksuite/* dist files for 'debug' imports
const bsPkgs = existsSync(bsRoot) ? readdirSync(bsRoot) : [];
for (const pkg of bsPkgs) {
  walkForImport(join(bsRoot, pkg, 'dist'), `@blocksuite/${pkg}`, 'debug');
}

// Also check top-level packages that might import debug
const topPkgs = ['micromark', 'micromark-util-symbol', 'micromark-factory-space', 'remark', 'mdast', 'unified', 'vfile-message'];
for (const pkg of topPkgs) {
  walkForImport(join(nm, pkg), pkg, 'debug');
}

console.log(`\n=== Files importing 'debug' ===`);
if (results.length === 0) console.log('  (none found in @blocksuite or remark chain)');
results.forEach(r => console.log(r));

// Now check a broad set of likely-CJS packages installed
// that are deps of markdown/remark/micromark chains
const candidatePkgs = [
  'debug', 'ms', 'micromark', 'micromark-core-commonmark',
  'micromark-extension-gfm', 'micromark-extension-gfm-autolink-literal',
  'micromark-extension-gfm-footnote', 'micromark-extension-gfm-strikethrough',
  'micromark-extension-gfm-table', 'micromark-extension-gfm-tagfilter',
  'micromark-extension-gfm-task-list-item',
  'micromark-util-combine-extensions', 'micromark-util-chunked',
  'micromark-util-character', 'micromark-util-classify-character',
  'micromark-util-decode-string', 'micromark-util-decode-numeric-character-reference',
  'micromark-util-encode', 'micromark-util-events-to-acorn',
  'micromark-util-html-tag-name', 'micromark-util-normalize-identifier',
  'micromark-util-resolve-all', 'micromark-util-sanitize-uri',
  'micromark-util-subtokenize', 'micromark-util-symbol', 'micromark-util-types',
  'create-tokenizer',
  'vfile', 'vfile-message', 'unist-util-stringify-position',
  'remark', 'remark-parse', 'remark-stringify',
  'mdast-util-from-markdown', 'mdast-util-to-markdown',
  'mdast-util-gfm', 'mdast-util-gfm-autolink-literal',
  'mdast-util-gfm-footnote', 'mdast-util-gfm-strikethrough',
  'mdast-util-gfm-table', 'mdast-util-gfm-task-list-item',
  'mdast-util-phrasing-content', 'mdast-util-to-string',
  'markdown-table', 'ccount', 'decode-named-character-reference',
  'character-entities', 'zwitch', 'longest-streak',
  'bail', 'devlop', 'is-plain-obj', 'trough', 'extend', 'unified',
];

console.log('\n=== CJS check for markdown/debug chain ===');
const needsInclude = [];
for (const pkg of candidatePkgs) {
  const pkgDir = join(nm, pkg);
  if (!existsSync(pkgDir)) continue;
  const esm = isESM(pkgDir);
  const ver = getVersion(pkgDir);
  if (!esm) {
    needsInclude.push(pkg);
    console.log(`CJS  ${pkg}@${ver} => NEEDS include`);
  } else {
    console.log(`ESM  ${pkg}@${ver}`);
  }
}

console.log('\n=== FINAL: All CJS packages needing optimizeDeps.include ===');
const existing = ['lodash.chunk','lodash.clonedeep','lodash.ismatch','lodash.merge','lodash.mergewith','lz-string','simple-xml-to-json','extend'];
const combined = [...new Set([...existing, ...needsInclude])];
console.log(JSON.stringify(combined, null, 2));
