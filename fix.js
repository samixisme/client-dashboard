const fs = require('fs');
let content = fs.readFileSync('api/adminBoardsRoutes.ts', 'utf8');
content = content.replace(/db\.collection\('stages'\)\.doc\(stage\.id\)/g, "db.collection('stages').doc(id)");
fs.writeFileSync('api/adminBoardsRoutes.ts', content);
