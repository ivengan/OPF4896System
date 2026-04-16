const fs = require('fs');
const path = 'c:/Projects/OPF4896System/broiler_dsptch.html';
let content = fs.readFileSync(path, 'utf8');

// Fix toggleDetails
const oldToggle = /window\.toggleDetails = function\(icon\) \{[\s\S]*?\};/;
const newToggle = `window.toggleDetails = function(icon) {
    icon.classList.toggle('rotate-180');
    const parentRow = icon.closest('.flex.justify-between');
    if (parentRow) {
        const detailsDiv = parentRow.nextElementSibling;
        if (detailsDiv && detailsDiv.classList.contains('hidden-details')) {
            const isHidden = window.getComputedStyle(detailsDiv).display === 'none';
            detailsDiv.style.display = isHidden ? 'block' : 'none';
        }
    }
};`;
content = content.replace(oldToggle, newToggle);

// Fix createOrderItemCard
// Using a simpler approach: finding the start and end of the function
const startFunc = content.indexOf('function createOrderItemCard(item) {');
const endMarker = 'return card;\n            }\n        }'; // Try to find a unique end
// Actually let's just use regex for the whole function
const functionRegex = /function createOrderItemCard\(item\) \{[\s\S]*?return card;[\s\S]*?\}/;

const newFunction = `function createOrderItemCard(item) {
            const card = document.createElement('div');
            const isCompleted = item.dispatchedQty >= item.orderedQty;
            const isInvoiced = item.isInvoiced;
            
            let statusColor = 'bg-white border-gray-200';
            if (isInvoiced) statusColor = 'bg-gray-100 border-gray-300 opacity-75';
            else if (isCompleted) statusColor = 'bg-green-50 border-green-200';
            else if (item.dispatchedQty > 0) statusColor = 'bg-yellow-50 border-yellow-200';
            
            card.className = \`rounded-lg border shadow-sm transition hover:shadow-md \${statusColor} overflow-hidden\`;
            
            const content = document.createElement('div');
            content.className = 'p-3 cursor-pointer';
            
            // CUSTOMER NAME
            let custHtml = \`<div class="customer-name-target" style="-webkit-touch-callout: none; user-select: none;">\`;
            custHtml += \`<div class="font-bold text-gray-800 text-base">\${item.customerName}\`;
            if (item.customerDesc) custHtml += \` <span class="font-normal text-gray-600 text-sm">(\${item.customerDesc})</span>\`;
            if (item.isInvoiced) custHtml += \` <span class="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded ml-2">INVOICED</span>\`;
            if (item.customerRemark) custHtml += \`<br><span class="text-xs text-blue-600 italic">Rm: \${item.customerRemark}</span>\`;
            custHtml += \`</div></div>\`;

            // ITEM SECTION
            let itemHtml = \`
                <div class="mt-1 flex justify-between items-center border-t border-gray-50 pt-1">
                    <div class="item-name-target flex-1" style="-webkit-touch-callout: none; user-select: none;">
                        <div class="flex items-center gap-1">
                            <span class="font-semibold text-gray-700">\${item.itemName}</span>
                            <svg class="arrow-icon w-4 h-4 text-blue-500" onclick="event.stopPropagation(); toggleDetails(this)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        \${item.itemRemark ? \`<span class="text-xs text-gray-500 italic block">(\${item.itemRemark})</span>\` : ''}
                    </div>
                    <div class="text-right">
                        <span class="text-lg font-bold \${isCompleted || isInvoiced ? 'text-green-700' : 'text-gray-800' gambling}>\${item.dispatchedQty}</span>
                        <span class="text-gray-500 text-sm">/\${item.orderedQty}</span>
                    </div>
                </div>\`;
            
            let historyHtml = '';
            if ((item.history && item.history.length > 0) || item.totalWeight > 0) {
                historyHtml = \`<div class="history-container">\`;
                if (item.totalWeight > 0) {
                    historyHtml += \`<div class="font-bold text-blue-800 mb-2 p-2 bg-blue-50 rounded border border-blue-100 italic">Current Dispatched: \${parseFloat(item.totalWeight).toFixed(1)} KG</div>\`;
                }
                
                if (item.history && item.history.length > 0) {
                    const h1 = item.history[0]; 
                    const isDeduct = h1.qty < 0;
                    historyHtml += \`
                        <div class="history-visible-row \${isDeduct ? 'deduction-text' : ''}">
                            <span class="font-medium">1. \${h1.qty} units - \${parseFloat(h1.net).toFixed(1)} KG \${h1.ayamLama ? '<span class="text-red-500 font-bold">(Lama)</span>' : ''}</span>
                            \${item.history.length > 1 ? \`<svg class="arrow-icon ml-auto" onclick="event.stopPropagation(); toggleHistory(this)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>\` : ''}
                        </div>\`;
                    
                    if (item.history.length > 1) {
                        historyHtml += \`<div class="history-hidden border-l-2 border-gray-200 ml-2 pl-2 mt-1 space-y-1">\`;
                        for (let i = 1; i < item.history.length; i++) {
                            const h = item.history[i];
                            const deductClass = h.qty < 0 ? 'deduction-text' : '';
                            historyHtml += \`<div class="history-item \${deductClass}">\${i + 1}. \${h.qty} units - \${parseFloat(h.net).toFixed(1)} KG \${h.ayamLama ? '<span class="text-red-500 font-bold">(Lama)</span>' : ''}</div>\`;
                        }
                        historyHtml += \`</div>\`;
                    }
                }
                historyHtml += \`</div>\`;
            }
            itemHtml += \`<div class="hidden-details mt-2 border-t pt-2 border-gray-100">\${historyHtml}</div>\`;

            itemHtml += \`<div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div class="bg-blue-600 h-1 rounded-full" style="width: \${Math.min(100, (item.dispatchedQty / item.orderedQty) * 100) || 0}%\"></div>
                         </div>\`;

            content.innerHTML = custHtml + itemHtml;
            
            let custPressTimer;
            const custTarget = content.querySelector('.customer-name-target');
            const handleCustStart = (e) => {
                content.dataset.longPressCust = 'false';
                custPressTimer = window.setTimeout(() => {
                    content.dataset.longPressCust = 'true';
                    openEditCustomerModal(item);
                }, 600); 
            };
            const handleCustEnd = () => { clearTimeout(custPressTimer); };
            custTarget.addEventListener('mousedown', handleCustStart);
            custTarget.addEventListener('touchstart', handleCustStart, {passive: true});
            custTarget.addEventListener('mouseup', handleCustEnd);
            custTarget.addEventListener('mouseleave', handleCustEnd);
            custTarget.addEventListener('touchend', handleCustEnd);
            custTarget.addEventListener('touchmove', handleCustEnd);
            custTarget.addEventListener('touchcancel', handleCustEnd);

            let itemPressTimer;
            const itemTarget = content.querySelector('.item-name-target');
            const handleItemStart = (e) => {
                content.dataset.longPressItem = 'false';
                itemPressTimer = window.setTimeout(() => {
                    content.dataset.longPressItem = 'true';
                    openEditItemModal(item);
                }, 600); 
            };
            const handleItemEnd = () => { clearTimeout(itemPressTimer); };
            itemTarget.addEventListener('mousedown', handleItemStart);
            itemTarget.addEventListener('touchstart', handleItemStart, {passive: true});
            itemTarget.addEventListener('mouseup', handleItemEnd);
            itemTarget.addEventListener('mouseleave', handleItemEnd);
            itemTarget.addEventListener('touchend', handleItemEnd);
            itemTarget.addEventListener('touchmove', handleItemEnd);
            itemTarget.addEventListener('touchcancel', handleItemEnd);

            if(!isInvoiced) {
                content.addEventListener('click', (e) => {
                    if (content.dataset.longPressCust === 'true' || content.dataset.longPressItem === 'true') {
                        content.dataset.longPressCust = 'false'; content.dataset.longPressItem = 'false'; 
                        return; 
                    }
                    openDispatchModal(item);
                });
            }
            
            const footer = document.createElement('div');
            footer.className = 'flex justify-between items-center p-2 bg-gray-50 border-t border-gray-200';
            
            const delBtn = document.createElement('button');
            delBtn.className = 'px-2 py-1 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold shadow-sm hover:bg-red-50 transition disabled:opacity-50';
            delBtn.textContent = 'DEL';
            if (isInvoiced) delBtn.disabled = true;
            delBtn.addEventListener('click', (e) => { e.stopPropagation(); initiateDelete(item); });

            const submitBtn = document.createElement('button');
            submitBtn.className = 'px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-600 transition disabled:opacity-50';
            submitBtn.textContent = isInvoiced ? 'Invoiced' : 'Submit';
            if (isInvoiced) submitBtn.disabled = true;
            submitBtn.addEventListener('click', (e) => { e.stopPropagation(); handleInvoice(item); });

            footer.appendChild(delBtn);
            if (item.dispatchedQty > 0 && !isInvoiced) {
                const editBtn = document.createElement('button');
                editBtn.className = 'px-2 py-1 bg-white text-yellow-600 border border-yellow-200 rounded-lg text-xs font-bold shadow-sm hover:bg-yellow-50 transition';
                editBtn.textContent = 'EDIT';
                editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(item); });
                footer.appendChild(editBtn);
            }
            footer.appendChild(submitBtn);
            card.appendChild(content);
            card.appendChild(footer);
            return card;
        }`;

content = content.replace(functionRegex, newFunction);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully fixed broiler_dsptch.html');
