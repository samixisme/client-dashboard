const fs = require('fs');

function findNestedComponents(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            findNestedComponents(dir + '/' + file.name);
        } else if (file.name.endsWith('.tsx')) {
            const content = fs.readFileSync(dir + '/' + file.name, 'utf8');
            const lines = content.split('\n');
            let indentTracker = [];
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (line.match(/const [A-Z][a-zA-Z0-9]*.*=>/)) {
                    const spaces = line.search(/\S/);
                    if (spaces > 0) {
                       console.log(`Nested Component detected in ${dir}/${file.name}:${i+1} => ${line.trim()}`);
                    }
                }
            }
        }
    }
}

findNestedComponents('pages');
