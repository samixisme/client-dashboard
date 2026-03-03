const fs = require('fs');
let content = fs.readFileSync('components/admin/StructuredEditor.tsx', 'utf8');
content = content.replace(/key=\{\(item\.id as string\) \|\| String\(index\)\}/, 'key={((item as Record<string, unknown>).id as string) || String(index)}');
content = content.replace(/itemData=\{item\}/, 'itemData={item as Record<string, unknown>}');
fs.writeFileSync('components/admin/StructuredEditor.tsx', content);
