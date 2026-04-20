const fs = require('fs');

// Patch api/linkMetaRoutes.ts
let content1 = fs.readFileSync('api/linkMetaRoutes.ts', 'utf8');
content1 = content1.replace(
  "responseType: 'text',",
  "responseType: 'text',\n      beforeRedirect: (options: Record<string, any>) => {\n        const redirectUrlValidation = validateUrl(options.href);\n        if (!redirectUrlValidation.isValid) {\n          throw new Error(`SSRF Prevention: Redirect to invalid URL blocked (${redirectUrlValidation.error})`);\n        }\n      },"
);
fs.writeFileSync('api/linkMetaRoutes.ts', content1);

// Patch api/proxy.ts
let content2 = fs.readFileSync('api/proxy.ts', 'utf8');
content2 = content2.replace(
  "timeout: 30000, // 30 second timeout",
  "timeout: 30000, // 30 second timeout\n      beforeRedirect: (options: Record<string, any>) => {\n        const redirectUrlValidation = validateUrl(options.href);\n        if (!redirectUrlValidation.isValid) {\n          throw new Error(`SSRF Prevention: Redirect to invalid URL blocked (${redirectUrlValidation.error})`);\n        }\n      },"
);
fs.writeFileSync('api/proxy.ts', content2);
