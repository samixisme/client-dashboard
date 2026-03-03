const fs = require('fs');
let content = fs.readFileSync('pages/DashboardPage.tsx', 'utf8');

// 1. change getRelativeTime parameter type
content = content.replace(
  /const getRelativeTime = \(timestamp: string\) => \{/,
  "const getRelativeTime = (timestamp: string | import('../types').FirebaseTimestamp) => {"
);

// 2. change getRelativeTime body:
content = content.replace(
  /const date = new Date\(timestamp\);/,
  "const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date((typeof timestamp === 'object' && 'seconds' in timestamp ? timestamp.seconds : 0) * 1000);"
);

fs.writeFileSync('pages/DashboardPage.tsx', content);
