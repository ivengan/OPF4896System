const fs = require('fs');
const path = 'c:/Projects/OPF4896System/broiler_dsptch.html';
let content = fs.readFileSync(path, 'utf8');

// The file is currently broken. We need to replace the mangled initialize/processOrders section.
// Find and fix the broken block from "async function initialize()" to "renderDispatchList();\n        }\n"

const brokenBlock = /async function initialize\(\) \{[\s\S]*?renderDispatchList\(\);\s*\}/;

const fixedBlock = `async function initialize() {
            try {
                const settingsDoc = await db.collection('config').doc('pricing').get();
                if (settingsDoc.exists) pricingSettings = { ...pricingSettings, ...settingsDoc.data() };

                const customersSnapshot = await db.collection('customers').get();
                const dl = document.getElementById('customer-list-dl');
                customersSnapshot.docs.forEach(doc => {
                    const d = doc.data();
                    customerMap[d.displayName] = { 
                        lorry: d.lorry || 'Unassigned',
                        description: d.description || '',
                        searchName: d.displayName
                    };
                    dl.innerHTML += \`<option value="\${d.displayName}"></option>\`;
                });

                // Set up real-time listener for ALL pending broiler orders (no date filter)
                setupOrderListener();

            } catch (error) {
                console.error("Init Error:", error);
                dispatchListDiv.innerHTML = \`<p class="text-center text-red-500">Error loading data: \${error.message}</p>\`;
            }
        }

        function setupOrderListener() {
            if (activeUnsubscribe) activeUnsubscribe();

            dispatchListDiv.innerHTML = \`<p class="p-4 text-center text-gray-500">Loading broiler orders...</p>\`;

            activeUnsubscribe = db.collection('orders')
                .where('productType', '==', 'broiler')
                .where('status', '==', 'pending')
                .onSnapshot(snapshot => {
                    processOrders(snapshot.docs);
                }, err => {
                    console.error("Snapshot Error:", err);
                    dispatchListDiv.innerHTML = \`<p class="text-center text-red-500">Error: \${err.message}</p>\`;
                });
        }

        function processOrders(docs) {
            allOrders = [];
            docs.forEach(doc => {
                const data = doc.data();
                const custName = data.customerName;
                const custInfo = customerMap[custName] || { lorry: 'Unassigned', description: '' };
                
                const activeLorry = data.assignedLorry || custInfo.lorry;

                if (data.broilers && Array.isArray(data.broilers)) {
                    data.broilers.forEach((item, index) => {
                        let displayName = item.description;
                        if (displayName === 'Wholesale' || displayName === 'MSRP') {
                            displayName = 'Broiler';
                        }

                        allOrders.push({
                            orderId: doc.id,
                            broilerIndex: index,
                            customerName: custName,
                            customerDesc: custInfo.description,
                            lorry: activeLorry,
                            customerRemark: data.customerRemark || '',
                            itemName: displayName, 
                            itemRemark: item.remark || '',
                            orderedQty: item.qty,
                            dispatchedQty: item.dispatchedQty || 0,
                            totalWeight: item.totalWeight || 0,
                            history: item.history || [], 
                            isInvoiced: item.isInvoiced || false, 
                            originalDoc: data 
                        });
                    });
                }
            });
            renderDispatchList();
        }`;

const result = content.replace(brokenBlock, fixedBlock);

if (result === content) {
    console.log('ERROR: Pattern not matched, no replacement made.');
    // Print the current content around the broken area for debugging
    const idx = content.indexOf('async function initialize()');
    console.log('Current content around initialize:', content.substring(idx, idx + 800));
} else {
    fs.writeFileSync(path, result, 'utf8');
    console.log('SUCCESS: File fixed.');
}
