const fs = require('fs');
let content = fs.readFileSync('api/social.ts', 'utf8');

content = content.replace(
  "const response = await axios(axiosConfig);",
  "// Ensure redirect URLs are validated to prevent SSRF bypass\n        axiosConfig.beforeRedirect = (options: Record<string, any>) => {\n            const redirectUrlValidation = validateUrl(options.href);\n            if (!redirectUrlValidation.isValid) {\n                throw new Error(`SSRF Prevention: Redirect to invalid URL blocked (${redirectUrlValidation.error})`);\n            }\n        };\n\n        const response = await axios(axiosConfig);"
);

content = "import { validateUrl } from './urlValidator';\n" + content;
fs.writeFileSync('api/social.ts', content);
