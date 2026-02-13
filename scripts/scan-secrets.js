#!/usr/bin/env node

/**
 * Pre-commit secret scanning script
 * Scans staged files for common secret patterns to prevent accidental commits
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Secret patterns to detect
const SECRET_PATTERNS = [
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'HIGH'
  },
  {
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'HIGH'
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /[0-9a-zA-Z/+]{40}/g,
    // Only flag if near AWS context
    contextRequired: ['aws', 'secret', 'access_key'],
    severity: 'MEDIUM'
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'CRITICAL'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48,}/g,
    severity: 'HIGH'
  },
  {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'HIGH'
  },
  {
    name: 'GitHub OAuth Access Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'HIGH'
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: 'HIGH'
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Firebase Service Account',
    pattern: /"type"\s*:\s*"service_account"/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Generic API Key Assignment',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
    severity: 'MEDIUM'
  }
];

// Files/patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /\.min\.js$/,
  /\.map$/,
  /dist\//,
  /build\//,
  /\.env\.example$/,
  /scan-secrets\.js$/, // Don't scan self
  /SECURITY\.md$/ // Documentation may reference patterns
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  const findings = [];

  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
      return findings;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');

    for (const { name, pattern, severity, contextRequired } of SECRET_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // If context is required, check for it
        if (contextRequired) {
          const surroundingText = content.substring(
            Math.max(0, match.index - 100),
            Math.min(content.length, match.index + match[0].length + 100)
          ).toLowerCase();

          const hasContext = contextRequired.some(ctx =>
            surroundingText.includes(ctx.toLowerCase())
          );

          if (!hasContext) continue;
        }

        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Get the matched value (redacted for display)
        const matchedValue = match[0];
        const redactedValue = matchedValue.length > 10
          ? matchedValue.substring(0, 6) + '...' + matchedValue.substring(matchedValue.length - 4)
          : matchedValue.substring(0, 3) + '***';

        findings.push({
          file: filePath,
          line: lineNumber,
          type: name,
          severity,
          value: redactedValue
        });
      }
    }
  } catch (error) {
    // Silently skip files that can't be read (binary files, etc.)
  }

  return findings;
}

function main() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const allFindings = [];

  for (const file of stagedFiles) {
    if (shouldSkipFile(file)) continue;

    const findings = scanFile(file);
    allFindings.push(...findings);
  }

  if (allFindings.length > 0) {
    console.error('\n🚨 POTENTIAL SECRETS DETECTED IN STAGED FILES\n');
    console.error('The following potential secrets were found:\n');

    // Group by severity
    const critical = allFindings.filter(f => f.severity === 'CRITICAL');
    const high = allFindings.filter(f => f.severity === 'HIGH');
    const medium = allFindings.filter(f => f.severity === 'MEDIUM');

    const printFindings = (findings, label) => {
      if (findings.length === 0) return;
      console.error(`${label}:`);
      for (const f of findings) {
        console.error(`  ${f.file}:${f.line} - ${f.type} (${f.value})`);
      }
      console.error('');
    };

    printFindings(critical, '🔴 CRITICAL');
    printFindings(high, '🟠 HIGH');
    printFindings(medium, '🟡 MEDIUM');

    console.error('To fix:');
    console.error('  1. Remove the secrets from the files');
    console.error('  2. Use environment variables instead (see .env.example)');
    console.error('  3. If this is a false positive, add the pattern to SKIP_PATTERNS in scripts/scan-secrets.js\n');

    process.exit(1);
  }

  process.exit(0);
}

main();
