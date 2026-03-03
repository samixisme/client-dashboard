const fs = require('fs');
let content = fs.readFileSync('pages/FeedbackMockupScreensSelectionPage.tsx', 'utf8');
content = content.replace(
  "((image as MockupImage).version || 'v1')",
  "String((image as MockupImage).version || 'v1')"
);
fs.writeFileSync('pages/FeedbackMockupScreensSelectionPage.tsx', content);
