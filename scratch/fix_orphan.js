const fs = require('fs');
const path = 'c:/Projects/OPF4896System/broiler_dsptch.html';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Lines 888-910 (0-indexed: 887-909) are the orphan block
// Line 888 starts with: "        // 3. Dispatch Add Modal"
// Line 912 starts with: "        // 3. Dispatch Add Modal" (the real one)
// We remove lines 888-911 (0-indexed: 887-910)

const removeFrom = 887; // line 888 (0-indexed)
const removeTo = 910;   // line 911 (0-indexed, exclusive)

console.log('Removing lines:');
for (let i = removeFrom; i < removeTo; i++) {
    console.log(`  ${i+1}: ${lines[i]}`);
}

const fixed = [...lines.slice(0, removeFrom), ...lines.slice(removeTo)].join('\n');
fs.writeFileSync(path, fixed, 'utf8');
console.log(`\nSUCCESS: Removed ${removeTo - removeFrom} lines. File now has ${fixed.split('\n').length} lines.`);
