const fs = require('fs');
let content = fs.readFileSync('pages/FeedbackWebsiteDetailPage.tsx', 'utf8');
content = content.replace(
  "createdAt: { seconds: 0, nanoseconds: 0 }",
  "createdAt: { seconds: 0, nanoseconds: 0 }, assetUrl: '', createdBy: ''"
);
fs.writeFileSync('pages/FeedbackWebsiteDetailPage.tsx', content);
