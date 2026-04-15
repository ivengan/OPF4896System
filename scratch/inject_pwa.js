const fs = require('fs');
const path = require('path');

const dir = 'c:\\Projects\\OPF4896System';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if there is a manifest link
        if (content.includes('manifest.json')) {
            // Check if pwa-install.js is already included
            if (!content.includes('pwa-install.js')) {
                // Find a good place to inject, ideally right before </head> or just after manifest link
                const regex = /(<link[^>]*rel=["']manifest["'][^>]*>)/i;
                if (regex.test(content)) {
                    content = content.replace(regex, `$1\n    <script src="pwa-install.js" defer></script>`);
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log('Injected pwa-install.js into ' + file);
                } else {
                    console.log('Could not find injection point in ' + file);
                }
            } else {
                console.log('Already exists in ' + file);
            }
        }
    }
});
