const fs = require('fs');
const { execSync } = require('child_process');

const prs = JSON.parse(fs.readFileSync('all_prs.json', 'utf8'));
const ghPath = '"C:\\Program Files\\GitHub CLI\\gh.exe"';

function determineLabel(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('security') || lowerTitle.includes('xss') || lowerTitle.includes('🔒') || lowerTitle.includes('🛡️')) {
    return 'security';
  }
  if (lowerTitle.includes('performance') || lowerTitle.includes('optimize') || lowerTitle.includes('⚡')) {
    return 'performance';
  }
  if (lowerTitle.includes('test') || lowerTitle.includes('🧪')) {
    return 'testing';
  }
  if (lowerTitle.includes('ui') || lowerTitle.includes('palette') || lowerTitle.includes('🎨') || lowerTitle.includes('aria')) {
    return 'ui/ux';
  }
  if (lowerTitle.includes('refactor') || lowerTitle.includes('🧹') || lowerTitle.includes('code health')) {
    return 'refactor';
  }
  if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
    return 'bug';
  }
  if (lowerTitle.includes('chore')) {
    return 'chore';
  }
  return 'enhancement';
}

console.log(`Processing ${prs.length} PRs in total...`);

// We want to target PRs #2 through #33.
const targetPRs = prs.filter(pr => pr.number >= 2 && pr.number <= 33);
targetPRs.sort((a,b) => a.number - b.number);

for (const pr of targetPRs) {
  console.log(`\n--- PR #${pr.number}: ${pr.title} ---`);
  
  // 1. Label the 3 new ones if they aren't labeled yet. Let's just always apply it.
  const label = determineLabel(pr.title);
  try {
    execSync(`${ghPath} label create "${label}" --force`, { stdio: 'ignore' });
  } catch(e) {}
  try {
    execSync(`${ghPath} pr edit ${pr.number} --add-label "${label}"`, { stdio: 'ignore' });
  } catch(e) {}

  // 2. If it's CLOSED (not MERGED, not OPEN), reopen it first so we can merge it.
  if (pr.state === 'CLOSED') {
    try {
      console.log(`  Reopening closed PR...`);
      execSync(`${ghPath} pr reopen ${pr.number}`, { stdio: 'pipe' });
    } catch(e) {
      console.log(`  Failed to reopen: ${e.message}`);
    }
  }

  // Refetch status just to check if it's mergeable or already merged.
  // Actually, we can just try to squash merge it right now.
  try {
    console.log(`  Merging PR...`);
    execSync(`${ghPath} pr merge ${pr.number} --squash --delete-branch`, { stdio: 'pipe' });
    console.log(`  ✅ Merged! Branch deleted.`);
  } catch (e) {
      let emsg = e.stdout ? e.stdout.toString() : e.message;
      let errstr = e.stderr ? e.stderr.toString() : "";
      
      if (emsg.includes('already merged') || errstr.includes('already merged')) {
         console.log(`  ✅ Already merged.`);
         // try deleting branch anyway
         try { execSync(`git push origin --delete ${pr.headRefName}`, { stdio: 'ignore' }); } catch(err){}
      } else {
         console.log(`  ❌ Merge failed: ${errstr}`);
      }
  }
}
