const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'd_o.html');

let content = fs.readFileSync(file, 'utf8');

// The file currently has 
// </body>
// </html>dy>
// </html>
// at the bottom due to the fuzzy matcher. Let's fix that.

content = content.replace(/<\/body>\s*<\/html>dy>\s*<\/html>(\s*)$/, '</body>\n</html>$1');

// Also fix the double Trigger WhatsApp API:
// }                // 6. Trigger WhatsApp API if Enabled and URL generated
content = content.replace(/\}\s*(\/\/\s*6\.\s*Trigger WhatsApp API)/g, '}\n\n                $1');

fs.writeFileSync(file, content);
console.log("Fixed");
