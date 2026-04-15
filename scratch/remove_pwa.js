const fs = require('fs');
const path = require('path');

const dir = 'c:\\Projects\\OPF4896System';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Look for the injected script
        if (content.includes('<script src="pwa-install.js" defer></script>')) {
            content = content.replace(/[ \t]*<script src="pwa-install.js" defer><\/script>\r?\n?/g, '');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Removed pwa-install.js from ' + file);
        }
    }
});
