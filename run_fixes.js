const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // 1. Add missing CSS for back button and min-h-16
    if (!content.includes('.whitespace-nowrap')) {
        content = content.replace('</style>', '        .whitespace-nowrap { white-space: nowrap; }\n        .inline-flex { display: inline-flex; }\n        .min-h-16 { min-height: 4rem; }\n    </style>');
    }
    
    // 2. Reduce header size from text-2xl to text-xl for h1/h2
    content = content.replace(/<(h[12])([^>]*)class="([^"]*)"([^>]*)>/gi, (match, tag, before, cls, after) => {
        let newCls = cls.replace(/\btext-2xl\b/g, 'text-xl');
        return `<${tag}${before}class="${newCls}"${after}>`;
    });

    // 3. Remove fixed height h-16 from header flex containers and replace with min-h-16 py-2 to prevent cropping
    content = content.replace(/class="([^"]*)\bh-16\b([^"]*)"/g, (match, p1, p2) => {
        return `class="${p1}min-h-16 py-2${p2}"`;
    });

    // 4. Ensure header sizes in CSS are appropriate (just in case they don't have text-xl)
    if (!content.includes('.text-xl{')) {
        content = content.replace('</style>', '        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }\n    </style>');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        modifiedCount++;
    }
});

console.log('Layouts fixed in ' + modifiedCount + ' files.');
