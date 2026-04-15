const fs = require('fs');
const path = require('path');

const dir = 'c:/Projects/OPF4896System';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let count = 0;

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('const db = firebase.firestore();') && !content.includes('enablePersistence')) {
        content = content.replace(
            'const db = firebase.firestore();',
            "const db = firebase.firestore();\n        db.enablePersistence({ synchronizeTabs: true }).catch(err => console.log('Offline persistence error:', err.code));"
        );
        fs.writeFileSync(fullPath, content, 'utf8');
        count++;
        console.log(`Injected into ${file}`);
    }
}

console.log(`Total files updated: ${count}`);
