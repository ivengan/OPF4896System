const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Convert small text to highly readable base sizes
    content = content.replace(/\btext-sm\b/g, 'text-[17px]');
    content = content.replace(/\btext-xs\b/g, 'text-base');

    // 2. Standardize h1 and h2 tags
    content = content.replace(/<(h[12])([^>]*)class="([^"]*)"([^>]*)>/gi, (match, tag, before, cls, after) => {
        let newCls = cls.replace(/\b(text-[^\s]+|font-\w+)\b/g, '').trim();
        newCls = 'text-2xl font-bold text-gray-900 tracking-tight ' + newCls;
        return `<${tag}${before}class="${newCls.trim()}"${after}>`;
    });

    // 3. Ensure body tags have the standard typographic foundation
    content = content.replace(/<body([^>]*)class="([^"]*)"/i, (match, before, cls) => {
        if (!cls.includes('font-sans')) cls += ' font-sans';
        if (!cls.includes('text-gray-800') && !cls.includes('text-gray-900')) {
            cls = cls.replace(/\btext-gray-\d+\b/g, '') + ' text-gray-800';
        }
        if (!cls.includes('text-[17px]') && !cls.includes('text-base')) {
            cls += ' text-[17px] leading-relaxed';
        }
        // Force replace body bg if it's not present just in case (optional, we'll leave bg alone if it exists)
        return `<body${before}class="${cls.trim()}"`;
    });

    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
});
