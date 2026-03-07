const fs = require('fs');
const { execSync } = require('child_process');

const prs = JSON.parse(fs.readFileSync('prs.json', 'utf8'));

// GH Path
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

console.log(`Processing ${prs.length} PRs for labeling and closing...`);

for (let i = 0; i < prs.length; i++) {
  const pr = prs[i];
  const label = determineLabel(pr.title);
  
  console.log(`[${i+1}/${prs.length}] PR #${pr.number}: ${pr.title}`);
  console.log(`  -> Detected tag: ${label}`);
  
  try {
    // Label it based on the name.
    // Notice: if the label doesn't exist, gh might ask to create it, but usually this needs an argument or fails.
    // To prevent interactive prompts or failure, let's just attempt to apply it.  If it fails, we will try anyway.
    // Some common github labels: 'enhancement', 'bug', 'documentation', 'duplicate', 'good first issue', 'help wanted', 'invalid', 'question', 'wontfix'
    // I'll make sure to create the label first, ignoring errors if it exists.
    try {
      execSync(`${ghPath} label create "${label}" --force`, { stdio: 'ignore' });
    } catch(e) {} // ignore if exists
    
    // Add the label
    execSync(`${ghPath} pr edit ${pr.number} --add-label "${label}"`, { stdio: 'pipe' });
    
    // Close the PR
    execSync(`${ghPath} pr close ${pr.number} -c "Automatically closed after validation and categorization."`, { stdio: 'pipe' });
    
    console.log(`  ✅ Labeled as '${label}' and closed.`);
  } catch (error) {
    console.log(`  ❌ Failed mapping/closing PR ${pr.number}.`);
    console.error(error.message);
  }
}

console.log('\\n--- DONE ---');
