const fs = require('fs');
const { execSync } = require('child_process');

const prs = JSON.parse(fs.readFileSync('prs.json', 'utf8'));
const failedPRs = [];
const passedPRs = [];

try { execSync('git stash'); } catch (e) {}

for (let i = 0; i < prs.length; i++) {
  const pr = prs[i];
  const branch = pr.headRefName;
  console.log(`\n[${i+1}/${prs.length}] Testing PR ${pr.number} (Branch: ${branch})...`);
  
  try {
    execSync(`git fetch origin ${branch}`, { stdio: 'ignore' });
    execSync(`git checkout ${branch}`, { stdio: 'ignore' });
    
    console.log(`  Validating (build)...`);
    execSync(`npm run build`, { stdio: 'pipe' });
    
    console.log(`✅ PR ${pr.number} PASSED.`);
    passedPRs.push(pr.number);
  } catch (error) {
    console.log(`❌ PR ${pr.number} FAILED.`);
    let errorLog = error.stdout ? error.stdout.toString() : "";
    let errorErr = error.stderr ? error.stderr.toString() : "";
    let combined = errorLog + "\n" + errorErr;
    if (combined.trim() === "") combined = error.message;
    
    failedPRs.push({ number: pr.number, branch, error: combined.substring(0, 1000) });
  }
}

execSync('git checkout main', { stdio: 'ignore' });
fs.writeFileSync('test_results.json', JSON.stringify({ passed: passedPRs, failed: failedPRs }, null, 2));
console.log('\n--- FINISHED ---');
console.log(`Passed: ${passedPRs.length}, Failed: ${failedPRs.length}`);
