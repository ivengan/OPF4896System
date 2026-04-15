const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'report.html');

let content = fs.readFileSync(file, 'utf8');

// 1. Add .print-no-scroll to print CSS
if (!content.includes('.print-no-scroll')) {
    content = content.replace('.no-print { display: none !important; }', '.no-print { display: none !important; }\n            .print-no-scroll { max-height: none !important; overflow: visible !important; }');
}

// 2. Hide Drop-Off block in print
let searchStr = `<!-- Drop Off Call List -->
                <div class="bg-white rounded-xl shadow-md overflow-hidden border border-red-100 print-break-inside lg:col-span-1 border-t-4 border-t-red-500">`;
let replaceStr = `<!-- Drop Off Call List -->
                <div class="bg-white rounded-xl shadow-md overflow-hidden border border-red-100 print-break-inside lg:col-span-1 border-t-4 border-t-red-500 no-print">`;
content = content.replace(searchStr, replaceStr);

// 3. Add print-no-scroll to scrolling lists
content = content.replace(/class="divide-y divide-gray-100 max-h-80 overflow-y-auto"/g, 'class="divide-y divide-gray-100 max-h-80 overflow-y-auto print-no-scroll"');

// 4. Update UI labels
content = content.replace(/\(All-Time\)/g, '(Last 30 Days)');

// 5. Query optimizations
let querySearch = `                // Fetch All Core Data Simultaneously
                const [stockSnap, ordersSnap, customersSnap] = await Promise.all([
                    db.collection('stock_entries').get(),
                    db.collection('orders').get(),
                    db.collection('customers').get() 
                ]);`;
                
let queryReplace = `                // Fetch All Core Data Simultaneously
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const [stockSnap, ordersSnap, customersSnap] = await Promise.all([
                    db.collection('stock_entries').where('timestamp', '>=', thirtyDaysAgo).get(),
                    db.collection('orders').where('timestamp', '>=', thirtyDaysAgo).get(),
                    db.collection('customers').get() 
                ]);`;
content = content.replace(querySearch, queryReplace);

// 6. Fix NaN math error
content = content.replace(/let pWeight = parseFloat\(p\.totalWeight\) \|\| \(parseFloat\(p\.dispatchedQty\)\*0\);/g, 'let pWeight = parseFloat(p.totalWeight) || 0;');

fs.writeFileSync(file, content);
console.log("report.html fixed");
