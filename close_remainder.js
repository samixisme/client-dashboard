const { execSync } = require('child_process');

const ghPath = '"C:\\Program Files\\GitHub CLI\\gh.exe"';

const prsToClose = [
  { num: 28, reason: "Duplicate of PR 22 unifying document download buttons." },
  { num: 29, reason: "Duplicate of PR 15 which already prevented XSS in sidebar search." },
  { num: 33, reason: "Duplicate of PR 31 which already implemented Firebase event sync for social posts." }
];

for (const pr of prsToClose) {
  try {
    execSync(`${ghPath} pr close ${pr.num} -c "Closing as redundant: ${pr.reason}"`, { stdio: 'inherit' });
    console.log(`Closed PR ${pr.num}`);
  } catch(e) {
    console.log(`Could not close PR ${pr.num}`);
  }
}

console.log("Cleaning up old remote branches...");
const prs = JSON.parse(require('fs').readFileSync('all_prs.json', 'utf8'));
for (const pr of prs) {
  if (pr.number >= 2 && pr.number <= 33) {
    try {
      execSync(`git push origin --delete ${pr.headRefName}`, { stdio: 'ignore' });
      console.log(`Deleted branch ${pr.headRefName}`);
    } catch(e) {}
  }
}
