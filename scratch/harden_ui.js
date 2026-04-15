const fs = require('fs');
const path = require('path');

const spinnerCss = `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .spinner-svg { width: 1.25rem; height: 1.25rem; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    </style>`;

const spinnerSvg = `<svg class="animate-spin spinner-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

function hardenFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Add CSS globally if not present
    if (!content.includes('.animate-spin {')) {
        content = content.replace('</style>', spinnerCss);
        changed = true;
    }

    for (let rule of replacements) {
        if (content.match(rule.search)) {
            content = content.replace(rule.search, rule.replace);
            changed = true;
        } else {
            console.warn(`Warning: Could not find match for rule in ${filePath}`, rule.name);
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

const rootDir = path.join(__dirname, '..');

// 1. stock_in.html
hardenFile(path.join(rootDir, 'stock_in.html'), [
    {
        name: 'crateOkBtn',
        search: /const count = parseInt\(document\.getElementById\('crate-count'\)\.value\);\s+const hasR =/m,
        replace: `const count = parseInt(document.getElementById('crate-count').value);\n            if (isNaN(count) || count <= 0) {\n                alert('Please enter a valid amount greater than 0.');\n                return;\n            }\n            const hasR =`
    },
    {
        name: 'finalOkBtn',
        search: /finalOkBtn\.addEventListener\('click', async \(\) => \{\s+const grossWeight = parseFloat\(weightInput\.value\);\s+if \(isNaN\(grossWeight\) \|\| !selectedCategory \|\| !selectedContainer\) \{\s+showNotification\('Please fill in all fields: Weight, Category, and Container\.', 'error'\);\s+return;\s+\}\s+finalOkBtn\.disabled = true;\s+finalOkBtn\.textContent = "Processing\.\.\.";/m,
        replace: `finalOkBtn.addEventListener('click', async () => {\n            if (finalOkBtn.disabled) return;\n            const grossWeight = parseFloat(weightInput.value);\n            if (isNaN(grossWeight) || grossWeight <= 0 || !selectedCategory || !selectedContainer) {\n                showNotification('Please fill in all fields (Weight > 0), Category, and Container.', 'error');\n                return;\n            }\n\n            finalOkBtn.disabled = true;\n            finalOkBtn.innerHTML = \`${spinnerSvg}<span>Processing...</span>\`;`
    }
]);

// 2. chiller_stck.html
hardenFile(path.join(rootDir, 'chiller_stck.html'), [
    {
        name: 'editConfirmBtn',
        search: /document\.getElementById\('edit-confirm-btn'\)\.addEventListener\('click', async \(\) => \{\s+const weightInput = parseFloat\(document\.getElementById\('edit-weight'\)\.value\);\s+const typeInput = document\.getElementById\('edit-category'\)\.value;\s+const qtyInput = parseInt\(document\.getElementById\('edit-qty'\)\.value\) \|\| 0;\s+const containerInput = document\.getElementById\('edit-container'\)\.value;\s+if \(isNaN\(weightInput\)\) return alert\("Please enter a valid gross weight\."\);\s+const btn = document\.getElementById\('edit-confirm-btn'\);\s+btn\.disabled = true; btn\.textContent = 'Updating\.\.\.';/m,
        replace: `document.getElementById('edit-confirm-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('edit-confirm-btn');\n            if (btn.disabled) return;\n            const weightInput = parseFloat(document.getElementById('edit-weight').value);\n            const typeInput = document.getElementById('edit-category').value;\n            const qtyInput = parseInt(document.getElementById('edit-qty').value);\n            const containerInput = document.getElementById('edit-container').value;\n\n            if (isNaN(weightInput) || weightInput <= 0) return alert("Please enter a valid gross weight > 0.");\n            if (isNaN(qtyInput) || qtyInput < 0) return alert("Please enter a valid quantity.");\n\n            btn.disabled = true; btn.innerHTML = \`${spinnerSvg}<span>Updating...</span>\`;`
    }
]);

// 3. parts_lembik.html
hardenFile(path.join(rootDir, 'parts_lembik.html'), [
    {
        name: 'modalSubmitBtn',
        search: /document\.getElementById\('modal-submit-btn'\)\.onclick = async \(\) => \{\s+const qty = parseFloat\(document\.getElementById\('modal-dispatch-amount'\)\.value\) \|\| 0;\s+if \(qty <= 0\) return;\s+const btn = document\.getElementById\('modal-submit-btn'\);\s+btn\.disabled = true; btn\.textContent = 'Saving\.\.\.';/m,
        replace: `document.getElementById('modal-submit-btn').onclick = async () => {\n            const btn = document.getElementById('modal-submit-btn');\n            if (btn.disabled) return;\n            const qty = parseFloat(document.getElementById('modal-dispatch-amount').value);\n            if (isNaN(qty) || qty <= 0) {\n                alert('Please enter a valid amount greater than 0.');\n                return;\n            }\n            btn.disabled = true; btn.innerHTML = \`${spinnerSvg}<span>Saving...</span>\`;`
    },
    {
        name: 'editItemSaveBtn',
        search: /document\.getElementById\('edit-item-save-btn'\)\.addEventListener\('click', async \(\) => \{\s+if \(!currentEditItemOrder\) return;\s+const newRemark = document\.getElementById\('edit-item-remark'\)\.value\.trim\(\);\s+const btn = document\.getElementById\('edit-item-save-btn'\);\s+btn\.disabled = true; btn\.textContent = "Saving\.\.\.";/m,
        replace: `document.getElementById('edit-item-save-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('edit-item-save-btn');\n            if (btn.disabled) return;\n            if (!currentEditItemOrder) return;\n            const newRemark = document.getElementById('edit-item-remark').value.trim();\n            btn.disabled = true; btn.innerHTML = \`${spinnerSvg}<span>Saving...</span>\`;`
    }
]);

// 4. broiler_dsptch.html
hardenFile(path.join(rootDir, 'broiler_dsptch.html'), [
    {
        name: 'modalSubmitBtn',
        search: /document\.getElementById\('modal-submit-btn'\)\.addEventListener\('click', async \(\) => \{\s+if \(!currentModalTarget\) return;\s+const addQty = parseInt\(document\.getElementById\('modal-qty'\)\.value\) \|\| 0;\s+const weight = parseFloat\(document\.getElementById\('modal-weight'\)\.value\) \|\| 0;/m,
        replace: `document.getElementById('modal-submit-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('modal-submit-btn');\n            if (btn.disabled) return;\n            if (!currentModalTarget) return;\n            const addQty = parseInt(document.getElementById('modal-qty').value);\n            const weight = parseFloat(document.getElementById('modal-weight').value);\n            if(isNaN(addQty) || isNaN(weight) || addQty <= 0 || weight <= 0) {\n                alert("Please enter a valid positive quantity and weight.");\n                return;\n            }`
    },
    {
        name: 'modalSubmitBtnSpinner',
        search: /const btn = document\.getElementById\('modal-submit-btn'\);\s+btn\.disabled = true; btn\.textContent = "Add & Update";/m,
        replace: `btn.disabled = true; btn.innerHTML = \`${spinnerSvg}<span>Updating...</span>\`;`
    },
    {
        name: 'editSubmitBtn',
        search: /document\.getElementById\('edit-submit-btn'\)\.addEventListener\('click', async \(\) => \{\s+if \(!currentModalTarget\) return;\s+const deductQtyStr = document\.getElementById\('edit-deduct-qty'\)\.value;\s+const deductWeightStr = document\.getElementById\('edit-deduct-weight'\)\.value;\s+const isR = document\.getElementById\('edit-r'\)\.checked;\s+if \(!deductQtyStr \|\| !deductWeightStr\) \{\s+alert\("Please enter both quantity and weight to deduct\."\);\s+return;\s+\}\s+let dQty = parseInt\(deductQtyStr\);\s+let dWeight = parseFloat\(deductWeightStr\);/m,
        replace: `document.getElementById('edit-submit-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('edit-submit-btn');\n            if(btn.disabled) return;\n            if (!currentModalTarget) return;\n            const deductQtyStr = document.getElementById('edit-deduct-qty').value;\n            const deductWeightStr = document.getElementById('edit-deduct-weight').value;\n            const isR = document.getElementById('edit-r').checked;\n            let dQty = parseInt(deductQtyStr);\n            let dWeight = parseFloat(deductWeightStr);\n            if (isNaN(dQty) || isNaN(dWeight) || dQty <= 0 || dWeight <= 0) {\n                alert("Please enter a valid positive quantity and weight to deduct.");\n                return;\n            }`
    },
    {
        name: 'editSubmitBtnSpinner',
        search: /const btn = document\.getElementById\('edit-submit-btn'\);\s+btn\.disabled = true; btn\.textContent = "Update & Deduct";/m,
        replace: `btn.disabled = true; btn.innerHTML = \`${spinnerSvg}<span>Updating...</span>\`;`
    },
    {
        name: 'editItemSaveBtnBroiler',
        search: /document\.getElementById\('edit-item-save-btn'\)\.addEventListener\('click', async \(\) => \{\s+if \(!currentEditItemOrder\) return;\s+const newRemark = document\.getElementById\('edit-item-remark'\)\.value\.trim\(\);\s+const btn = document\.getElementById\('edit-item-save-btn'\);\s+btn\.disabled = true;\s+btn\.textContent = "Saving\.\.\.";/m,
        replace: `document.getElementById('edit-item-save-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('edit-item-save-btn');\n            if (btn.disabled) return;\n            if (!currentEditItemOrder) return;\n            const newRemark = document.getElementById('edit-item-remark').value.trim();\n            btn.disabled = true;\n            btn.innerHTML = \`${spinnerSvg}<span>Saving...</span>\`;`
    },
    {
        name: 'editCustSaveBtnBroiler',
        search: /document\.getElementById\('edit-cust-save-btn'\)\.addEventListener\('click', async \(\) => \{\s+if \(!currentEditCustomerOrder\) return;\s+const newLorry = document\.getElementById\('edit-cust-driver'\)\.value;\s+const newRemark = document\.getElementById\('edit-cust-remark'\)\.value\.trim\(\);\s+const btn = document\.getElementById\('edit-cust-save-btn'\);\s+btn\.disabled = true;\s+btn\.textContent = "Saving\.\.\.";/m,
        replace: `document.getElementById('edit-cust-save-btn').addEventListener('click', async () => {\n            const btn = document.getElementById('edit-cust-save-btn');\n            if(btn.disabled) return;\n            if (!currentEditCustomerOrder) return;\n            const newLorry = document.getElementById('edit-cust-driver').value;\n            const newRemark = document.getElementById('edit-cust-remark').value.trim();\n            btn.disabled = true;\n            btn.innerHTML = \`${spinnerSvg}<span>Saving...</span>\`;`
    }
]);

// 5. d_o.html
hardenFile(path.join(rootDir, 'd_o.html'), [
    {
        name: 'confirmPrintBtn',
        search: /document\.getElementById\('confirm-print-btn'\)\.addEventListener\('click', async \(e\) => \{\s+if \(!pendingPrintTrip\) return;\s+const btn = e\.target;\s+btn\.disabled = true;\s+btn\.textContent = "Processing D\/O\.\.\.";/m,
        replace: `document.getElementById('confirm-print-btn').addEventListener('click', async (e) => {\n            const btn = e.target;\n            if (btn.disabled) return;\n            if (!pendingPrintTrip) return;\n\n            btn.disabled = true;\n            document.getElementById('cancel-print-btn').disabled = true;\n            btn.innerHTML = \`${spinnerSvg}<span>Processing D/O...</span>\`;`
    },
    {
        name: 'finallyBlockDO',
        search: /\} finally \{\s+printModal\.classList\.add\('hidden'\);\s+pendingPrintTrip = null;\s+btn\.disabled = false;\s+btn\.textContent = "Depart & Process";\s+\}/m,
        replace: `} finally {\n                printModal.classList.add('hidden');\n                pendingPrintTrip = null;\n                btn.disabled = false;\n                document.getElementById('cancel-print-btn').disabled = false;\n                btn.textContent = "Depart & Process";\n            }`
    }
]);

console.log("Done");
