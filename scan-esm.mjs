import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const nm = 'C:/Users/Sami/client-dashboard/node_modules';

// unified's direct deps — these are the next candidates for CJS issues
const toCheck = ['unified', 'bail', 'devlop', 'is-plain-obj', 'trough', 'vfile', 'extend'];

for (const pkg of toCheck) {
  const pkgDir = join(nm, pkg);
  if (!existsSync(pkgDir)) { console.log(`${pkg}: NOT INSTALLED\n`); continue; }

  const pj = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

  const hasTypeModule = pj.type === 'module';
  const hasModuleField = !!pj.module;
  const exportsStr = JSON.stringify(pj.exports || {});
  const hasImportCondition = exportsStr.includes('"import"');
  const isESM = hasTypeModule || hasModuleField || hasImportCondition;

  console.log(`${pkg}:`);
  console.log(`  version: ${pj.version}`);
  console.log(`  type: ${pj.type || '(none)'}`);
  console.log(`  module: ${pj.module || '(none)'}`);
  console.log(`  exports has "import": ${hasImportCondition}`);
  console.log(`  => ${isESM ? 'ESM - safe' : 'CJS - NEEDS optimizeDeps.include'}`);
  console.log();
}
