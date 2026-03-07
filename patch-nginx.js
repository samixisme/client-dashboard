// Cleanup and patch custom_rules.conf
const fs = require('fs');
const path = '/etc/nginx/conf.d/custom_rules.conf';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove ANY existing /api/ and /admin/api/ blocks globally to clean slate
const lines = content.split('\n');
const cleanLines = [];
let skipMode = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('location /api/ {') || line.includes('location /admin/api/ {')) {
    skipMode = true;
    // Also remove the preceding comment if it exists
    if (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].includes('API reverse proxy')) {
      cleanLines.pop();
    }
  }
  
  if (!skipMode) {
    cleanLines.push(line);
  }
  
  if (skipMode && line.trim() === '}') {
    skipMode = false; // end of location block
  }
}

// 2. Now find the client.samixism.com block and inject
let insertIndex = -1;
const clientBlockStart = cleanLines.findIndex(line => line.includes('server_name client.samixism.com;'));

if (clientBlockStart === -1) {
  console.log('ERROR: Could not find client.samixism.com block');
  process.exit(1);
}

for (let i = clientBlockStart; i < cleanLines.length; i++) {
  if (cleanLines[i].trim() === 'include common_https.conf;') {
    insertIndex = i;
    break;
  }
}

if (insertIndex === -1) {
  console.log('ERROR: Could not find include common_https.conf in client.samixism.com block');
  process.exit(1);
}

const locationBlocks = [
  '',
  '    # API reverse proxy to Express on port 3001',
  '    location /api/ {',
  '        proxy_set_header Host $host;',
  '        proxy_set_header X-Real-IP $remote_addr;',
  '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
  '        proxy_set_header X-Forwarded-Proto https;',
  '        proxy_set_header X-Forwarded-SSL on;',
  '        proxy_pass http://127.0.0.1:3001;',
  '        client_max_body_size 210m;',
  '        proxy_read_timeout 300s;',
  '        proxy_send_timeout 300s;',
  '        proxy_connect_timeout 60s;',
  '    }',
  '',
  '    # Admin API reverse proxy',
  '    location /admin/api/ {',
  '        proxy_set_header Host $host;',
  '        proxy_set_header X-Real-IP $remote_addr;',
  '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
  '        proxy_set_header X-Forwarded-Proto https;',
  '        proxy_set_header X-Forwarded-SSL on;',
  '        proxy_pass http://127.0.0.1:3001;',
  '    }',
  '',
  '    # Frontend catch-all (must be last)',
];

cleanLines.splice(insertIndex, 0, ...locationBlocks);
fs.writeFileSync(path, cleanLines.join('\n'));
console.log('NGINX_CLEANED_AND_PATCHED_OK');
