const fs = require('fs');
let content = fs.readFileSync('api/paymenterRoutes.ts', 'utf8');

content = content.replace(
  "const res = await fetch(`${PAYMENTER_URL}/api/v1/admin${endpoint}`, {",
  "const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), 15000);\n\n  try {\n    const res = await fetch(`${PAYMENTER_URL}/api/v1/admin${endpoint}`, {\n      signal: controller.signal as any,"
);

content = content.replace(
  "  if (!res.ok) {\n    const text = await res.text().catch(() => res.statusText);\n    throw new Error(`Paymenter API ${res.status}: ${text}`);\n  }\n\n  return res.json() as Promise<T>;\n}",
  "  if (!res.ok) {\n      const text = await res.text().catch(() => res.statusText);\n      throw new Error(`Paymenter API ${res.status}: ${text}`);\n    }\n\n    return (await res.json()) as Promise<T>;\n  } finally {\n    clearTimeout(timeout);\n  }\n}"
);

fs.writeFileSync('api/paymenterRoutes.ts', content);
