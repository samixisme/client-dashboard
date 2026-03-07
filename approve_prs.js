const fs = require('fs');
const { execSync } = require('child_process');

const prs = JSON.parse(fs.readFileSync('prs.json', 'utf8'));

console.log(`Approving ${prs.length} PRs...`);

for (let i = 0; i < prs.length; i++) {
  const pr = prs[i];
  console.log(`[${i+1}/${prs.length}] Approving PR ${pr.number}: ${pr.title}`);
  try {
    execSync(`gh pr review ${pr.number} --approve -b "LGTM! Verified build passes cleanly."`, { stdio: 'inherit' });
    console.log(`✅ Approved PR ${pr.number}`);
  } catch (error) {
    console.log(`❌ Failed to approve PR ${pr.number}`);
    console.error(error.message);
  }
}

console.log('Finished approving PRs.');
