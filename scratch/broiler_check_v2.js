
        const firebaseConfig = {
            apiKey: "AIzaSyBQAKliT1QN8H-FOuNzvUGArbyQfM_U5MA",
            authDomain: "opf4896system.firebaseapp.com",
            projectId: "opf4896system",
            storageBucket: "opf4896system.appspot.com",
            messagingSenderId: "150864121707",
            appId: "1:150864121707:web:b3161a86514c1d86dd062e"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        db.enablePersistence({ synchronizeTabs: true }).catch(err => console.log('Offline persistence error:', err.code));

        // Globals
        let allOrders = []; 
        let customerMap = {}; 
        let pricingSettings = { tare_crate: 1.8, tare_basket: 8.7, tare_barrel: 5.0, tare_r: 4.7 };
        let currentModalTarget = null;
        let itemToDelete = null; 
        let isDeletingAll = false;
        let currentEditCustomerOrder = null; 
        let currentEditItemOrder = null; // Target for Item Remark edit
        
        // Deduction Globals
        let deductedItem = null;
        let deductedQty = 0;
        let deductedWeight = 0;

        // DOM Elements
        const dispatchListDiv = document.getElementById('dispatch-list');
        const sortSelect = document.getElementById('sort-select');
        const dispatchModal = document.getElementById('dispatch-modal');
        const editModal = document.getElementById('edit-modal');
        const assignChoiceModal = document.getElementById('assign-choice-modal');
        const customerSelectModal = document.getElementById('customer-select-modal');
        const verifyModal = document.getElementById('verify-modal');
        const insufficientModal = document.getElementById('insufficient-modal');
        const editCustomerModal = document.getElementById('edit-customer-modal');
        const editItemModal = document.getElementById('edit-item-modal');
        const notificationArea = document.getElementById('notification-area');
        
        function showNotification(message, type) {
             notificationArea.innerHTML = `<div class="px-4 py-2 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">${message}</div>`;
            setTimeout(() => { notificationArea.innerHTML = ''; }, 3000);
        }

        let activeUnsubscribe = null;

        // --- Initial Load ---
        async function initialize() {
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
                    dl.innerHTML += `<option value="${d.displayName}"></option>`;
                });

                // Set up real-time listener for ALL pending broiler orders (no date filter)
                setupOrderListener();

            } catch (error) {
                console.error("Init Error:", error);
                dispatchListDiv.innerHTML = `<p class="text-center text-red-500">Error loading data: ${error.message}</p>`;
            }
        }

        function setupOrderListener() {
            if (activeUnsubscribe) activeUnsubscribe();

            dispatchListDiv.innerHTML = `<p class="p-4 text-center text-gray-500">Loading broiler orders...</p>`;

            activeUnsubscribe = db.collection('orders')
                .where('productType', '==', 'broiler')
                .where('status', '==', 'pending')
                .onSnapshot(snapshot => {
                    processOrders(snapshot.docs);
                }, err => {
                    console.error("Snapshot Error:", err);
                    dispatchListDiv.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
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
        }

        function renderDispatchList() {
            const mode = sortSelect.value;
            dispatchListDiv.innerHTML = '';

            if (allOrders.length === 0) {
                dispatchListDiv.innerHTML = '<p class="text-center text-gray-500">No pending orders found.</p>';
                return;
            }

            let sortedItems = [...allOrders];

            if (mode === 'driver') {
                sortedItems = sortedItems.filter(i => !i.isInvoiced); 

                const grouped = {};
                sortedItems.forEach(item => {
                    if (!grouped[item.lorry]) grouped[item.lorry] = [];
                    grouped[item.lorry].push(item);
                });

                const lorries = Object.keys(grouped).sort();

                lorries.forEach(lorry => {
                    grouped[lorry].sort((a, b) => a.customerName.localeCompare(b.customerName));
                    
                    const lorrySection = document.createElement('div');
                    lorrySection.className = 'mb-4';

                    const header = document.createElement('div');
                    header.className = 'flex justify-between items-center text-lg font-bold text-gray-900 bg-gray-200 p-3 rounded-lg sticky top-0 shadow-sm z-10 cursor-pointer select-none';
                    
                    const title = document.createElement('span');
                    title.textContent = lorry;
                    
                    const arrow = document.createElement('svg');
                    arrow.className = 'w-6 h-6 text-gray-600 transition-transform duration-200';
                    arrow.setAttribute('fill', 'none');
                    arrow.setAttribute('stroke', 'currentColor');
                    arrow.setAttribute('viewBox', '0 0 24 24');
                    arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';

                    header.appendChild(title);
                    header.appendChild(arrow);

                    const listGroup = document.createElement('div');
                    listGroup.className = 'space-y-3 mt-2 hidden'; 
                    grouped[lorry].forEach(item => listGroup.appendChild(createOrderItemCard(item)));

                    header.addEventListener('click', () => {
                        listGroup.classList.toggle('hidden');
                        arrow.classList.toggle('rotate-180'); 
                    });

                    lorrySection.appendChild(header);
                    lorrySection.appendChild(listGroup);
                    dispatchListDiv.appendChild(lorrySection);
                });

            } else {
                if (mode === 'dispatched') {
                    sortedItems = sortedItems.filter(i => i.dispatchedQty > 0);
                } else {
                    sortedItems = sortedItems.filter(i => i.dispatchedQty === 0 && !i.isInvoiced);
                }
                sortedItems.sort((a, b) => a.customerName.localeCompare(b.customerName));

                if (sortedItems.length === 0) {
                    dispatchListDiv.innerHTML = '<p class="text-center text-gray-500 mt-4">No items fit this category.</p>';
                    return;
                }
                sortedItems.forEach(item => dispatchListDiv.appendChild(createOrderItemCard(item)));
            }
        }

        function createOrderItemCard(item) {
            const card = document.createElement('div');
            const isCompleted = item.dispatchedQty >= item.orderedQty;
            const isInvoiced = item.isInvoiced;
            
            let statusColor = 'bg-white border-gray-200';
            if (isInvoiced) statusColor = 'bg-gray-100 border-gray-300 opacity-75';
            else if (isCompleted) statusColor = 'bg-green-50 border-green-200';
            else if (item.dispatchedQty > 0) statusColor = 'bg-yellow-50 border-yellow-200';
            
            card.className = `rounded-lg border shadow-sm transition hover:shadow-md ${statusColor} overflow-hidden`;
            
            const content = document.createElement('div');
            content.className = 'p-3 cursor-pointer';
            
            // CUSTOMER NAME
            let custHtml = `<div class="customer-name-target" style="-webkit-touch-callout: none; user-select: none;">`;
            custHtml += `<div class="font-bold text-gray-800 text-base">${item.customerName}`;
            if (item.customerDesc) custHtml += ` <span class="font-normal text-gray-600 text-sm">(${item.customerDesc})</span>`;
            if (item.isInvoiced) custHtml += ` <span class="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded ml-2">INVOICED</span>`;
            if (item.customerRemark) custHtml += `<br><span class="text-xs text-blue-600 italic">Rm: ${item.customerRemark}</span>`;
            custHtml += `</div></div>`;

            // ITEM SECTION
            let itemHtml = `
                <div class="mt-1 flex justify-between items-center border-t border-gray-50 pt-1">
                    <div class="item-name-target flex-1" style="-webkit-touch-callout: none; user-select: none;">
                        <div class="flex items-center gap-1">
                            <span class="font-semibold text-gray-700">${item.itemName}</span>
                            <svg class="arrow-icon w-4 h-4 text-blue-500" onclick="event.stopPropagation(); toggleDetails(this)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        ${item.itemRemark ? `<span class="text-xs text-gray-500 italic block">(${item.itemRemark})</span>` : ''}
                    </div>
                    <div class="text-right">
                        <span class="text-lg font-bold ${isCompleted || isInvoiced ? 'text-green-700' : 'text-gray-800'}">${item.dispatchedQty}</span>
                        <span class="text-gray-500 text-sm">/${item.orderedQty}</span>
                    </div>
                </div>`;
            
            let historyHtml = '';
            if ((item.history && item.history.length > 0) || item.totalWeight > 0) {
                historyHtml = `<div class="history-container">`;
                if (item.totalWeight > 0) {
                    historyHtml += `<div class="font-bold text-blue-800 mb-2 p-2 bg-blue-50 rounded border border-blue-100 italic">Current Dispatched: ${parseFloat(item.totalWeight).toFixed(1)} KG</div>`;
                }
                
                if (item.history && item.history.length > 0) {
                    const h1 = item.history[0]; 
                    const isDeduct = h1.qty < 0;
                    historyHtml += `
                        <div class="history-visible-row ${isDeduct ? 'deduction-text' : ''}">
                            <span class="font-medium">1. ${h1.qty} units - ${parseFloat(h1.net).toFixed(1)} KG ${h1.ayamLama ? '<span class="text-red-500 font-bold">(Lama)</span>' : ''}</span>
                            ${item.history.length > 1 ? `<svg class="arrow-icon ml-auto" onclick="event.stopPropagation(); toggleHistory(this)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>` : ''}
                        </div>`;
                    
                    if (item.history.length > 1) {
                        historyHtml += `<div class="history-hidden border-l-2 border-gray-200 ml-2 pl-2 mt-1 space-y-1">`;
                        for (let i = 1; i < item.history.length; i++) {
                            const h = item.history[i];
                            const deductClass = h.qty < 0 ? 'deduction-text' : '';
                            historyHtml += `<div class="history-item ${deductClass}">${i + 1}. ${h.qty} units - ${parseFloat(h.net).toFixed(1)} KG ${h.ayamLama ? '<span class="text-red-500 font-bold">(Lama)</span>' : ''}</div>`;
                        }
                        historyHtml += `</div>`;
                    }
                }
                historyHtml += `</div>`;
            }
            itemHtml += `<div class="hidden-details mt-2 border-t pt-2 border-gray-100">${historyHtml}</div>`;

            itemHtml += `<div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div class="bg-blue-600 h-1 rounded-full" style="width: ${Math.min(100, (item.dispatchedQty / item.orderedQty) * 100) || 0}%"></div>
                         </div>`;

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
        }

        window.toggleHistory = function(icon) {
            icon.classList.toggle('rotate-180');
            const hiddenDiv = icon.parentElement.nextElementSibling;
            if(hiddenDiv) hiddenDiv.style.display = hiddenDiv.style.display === 'block' ? 'none' : 'block';
        };

        window.toggleDetails = function(icon) {
    icon.classList.toggle('rotate-180');
    const parentRow = icon.closest('.flex.justify-between');
    if (parentRow) {
        const detailsDiv = parentRow.nextElementSibling;
        if (detailsDiv && detailsDiv.classList.contains('hidden-details')) {
            const isHidden = window.getComputedStyle(detailsDiv).display === 'none';
            detailsDiv.style.display = isHidden ? 'block' : 'none';
        }
    }
};

        // --- Modals & Actions ---
        
        // 1. Edit Customer (Driver/Remark)
        function openEditCustomerModal(item) {
            currentEditCustomerOrder = item;
            
            const dropdown = document.getElementById('edit-cust-driver');
            dropdown.value = item.lorry;
            if (dropdown.selectedIndex === -1) dropdown.value = "Unassigned"; 

            document.getElementById('edit-cust-remark').value = item.customerRemark || '';
            document.getElementById('edit-customer-modal').classList.remove('hidden');
        }

        document.getElementById('edit-cust-close-x').addEventListener('click', () => {
            document.getElementById('edit-customer-modal').classList.add('hidden');
        });

        document.getElementById('edit-cust-save-btn').addEventListener('click', async () => {
            const btn = document.getElementById('edit-cust-save-btn');
            if(btn.disabled) return;
            if (!currentEditCustomerOrder) return;
            const newLorry = document.getElementById('edit-cust-driver').value;
            const newRemark = document.getElementById('edit-cust-remark').value.trim();
            btn.disabled = true;
            btn.innerHTML = `<svg class="animate-spin spinner-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Saving...</span>`;

            try {
                await db.collection('orders').doc(currentEditCustomerOrder.orderId).update({
                    assignedLorry: newLorry,
                    customerRemark: newRemark
                });
                showNotification("Order updated.", "success");
                document.getElementById('edit-customer-modal').classList.add('hidden');
            } catch (e) {
                console.error(e);
                alert("Failed to update order details.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Save Changes";
            }
        });

        // 2. Edit Specific Item (Remark)
        function openEditItemModal(item) {
            currentEditItemOrder = item;
            document.getElementById('edit-item-name-display').textContent = item.itemName;
            document.getElementById('edit-item-remark').value = item.itemRemark || '';
            document.getElementById('edit-item-modal').classList.remove('hidden');
        }

        document.getElementById('edit-item-close-x').addEventListener('click', () => {
            document.getElementById('edit-item-modal').classList.add('hidden');
        });

        document.getElementById('edit-item-save-btn').addEventListener('click', async () => {
            const btn = document.getElementById('edit-item-save-btn');
            if (btn.disabled) return;
            if (!currentEditItemOrder) return;
            const newRemark = document.getElementById('edit-item-remark').value.trim();
            btn.disabled = true;
            btn.innerHTML = `<svg class="animate-spin spinner-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Saving...</span>`;

            try {
                const orderRef = db.collection('orders').doc(currentEditItemOrder.orderId);
                const docSnap = await orderRef.get();
                if(docSnap.exists) {
                    const data = docSnap.data();
                    const broilers = data.broilers;
                    broilers[currentEditItemOrder.broilerIndex].remark = newRemark;
                    
                    await orderRef.update({ broilers: broilers });
                    showNotification("Item remark updated.", "success");
                    document.getElementById('edit-item-modal').classList.add('hidden');
                }
            } catch (e) {
                console.error(e);
                alert("Failed to update item remark.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Save Changes";
            }
        });


        // 3. Dispatch Add Modal
        function openDispatchModal(item) {
            currentModalTarget = item;
            document.getElementById('modal-qty').value = ''; 
            document.getElementById('modal-weight').value = ''; 
            document.getElementById('modal-container').value = 'Crate';
            document.getElementById('modal-container-count').value = '1';
            document.getElementById('modal-r').checked = false;
            document.getElementById('modal-ayam-lama').checked = false;
            
            const nettCheckbox = document.getElementById('modal-nett-kg');
            nettCheckbox.checked = false;
            nettCheckbox.dispatchEvent(new Event('change'));
            
            document.getElementById('modal-status-display').textContent = `(${item.dispatchedQty}/${item.orderedQty})`;
            dispatchModal.classList.remove('hidden');
        }

        // 4. Dispatch Deduct (Edit) Modal
        function openEditModal(item) {
            currentModalTarget = item;
            document.getElementById('edit-deduct-qty').value = '';
            document.getElementById('edit-deduct-weight').value = ''; 
            document.getElementById('edit-container').value = 'Crate';
            document.getElementById('edit-container-count').value = '1';
            document.getElementById('edit-r').checked = false;
            editModal.classList.remove('hidden');
        }

        document.getElementById('edit-submit-btn').addEventListener('click', () => {
            const dQty = parseInt(document.getElementById('edit-deduct-qty').value) || 0;
            const grossWeight = parseFloat(document.getElementById('edit-deduct-weight').value) || 0;
            const containerType = document.getElementById('edit-container').value;
            const containerCount = parseInt(document.getElementById('edit-container-count').value) || 1;
            const hasR = document.getElementById('edit-r').checked;

            if(dQty <= 0) return alert("Enter quantity to deduct.");
            if(dQty > currentModalTarget.dispatchedQty) return alert("Cannot deduct more than dispatched quantity.");

            let tare = 0;
            if (containerType === 'Crate') tare = pricingSettings.tare_crate * containerCount;
            if (containerType === 'Basket') tare = pricingSettings.tare_basket * containerCount;
            if (containerType === 'Barrel') tare = pricingSettings.tare_barrel * containerCount;
            if (hasR) tare += pricingSettings.tare_r;
            
            const netDeductWeight = Math.max(0, grossWeight - tare);

            deductedItem = currentModalTarget;
            deductedQty = dQty;
            deductedWeight = netDeductWeight;

            editModal.classList.add('hidden');
            assignChoiceModal.classList.remove('hidden');
        });

        document.getElementById('assign-no-btn').addEventListener('click', async () => {
            await processDeduction(deductedItem, deductedQty, deductedWeight);
            assignChoiceModal.classList.add('hidden');
            showNotification(`Deducted ${deductedQty} units. Returned to stock.`, 'success');
        });

        document.getElementById('assign-yes-btn').addEventListener('click', () => {
            assignChoiceModal.classList.add('hidden');
            document.getElementById('assign-customer-input').value = '';
            customerSelectModal.classList.remove('hidden');
        });

        document.getElementById('confirm-assign-btn').addEventListener('click', async () => {
            const targetCustomer = document.getElementById('assign-customer-input').value.trim();
            if(!targetCustomer) return alert("Select a customer.");

            const btn = document.getElementById('confirm-assign-btn');
            btn.disabled = true; btn.textContent = "Processing...";

            try {
                await processDeduction(deductedItem, deductedQty, deductedWeight);

                const newOrder = {
                    customerName: targetCustomer,
                    productType: 'broiler',
                    status: 'pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    processedText: `Reassigned from ${deductedItem.customerName}`,
                    broilers: [{
                        description: deductedItem.itemName,
                        qty: deductedQty,
                        remark: `Reassigned from ${deductedItem.customerName}`,
                        dispatchedQty: deductedQty, 
                        totalWeight: deductedWeight,
                        lastDispatch: { 
                            grossWeight: deductedWeight, 
                            timestamp: new Date().toISOString() 
                        },
                        history: [{ 
                            qty: deductedQty,
                            net: deductedWeight,
                            timestamp: new Date().toISOString()
                        }]
                    }]
                };

                await db.collection('orders').add(newOrder);
                customerSelectModal.classList.add('hidden');
                showNotification(`Assigned to ${targetCustomer}`, 'success');

            } catch(e) {
                console.error(e);
                alert("Assignment failed.");
            } finally {
                btn.disabled = false; btn.textContent = "Confirm Assignment";
            }
        });

        async function processDeduction(item, qty, weight) {
            const orderRef = db.collection('orders').doc(item.orderId);
            const doc = await orderRef.get();
            if(doc.exists) {
                const broilers = doc.data().broilers;
                const b = broilers[item.broilerIndex];
                
                b.dispatchedQty = Math.max(0, parseInt(b.dispatchedQty) - qty);
                b.totalWeight = Math.max(0, parseFloat(b.totalWeight) - weight);
                
                if(!b.history) b.history = [];
                b.history.push({
                    qty: -qty,
                    net: -weight,
                    type: 'deduction',
                    timestamp: new Date().toISOString()
                });

                await orderRef.update({ broilers: broilers });
            }
        }

        // --- NEW STAFF VERIFICATION (DELETE) ---
        function initiateDelete(item) {
            itemToDelete = item;
            isDeletingAll = false; 
            document.getElementById('verify-phone').value = '';
            document.getElementById('verify-password').value = '';
            verifyModal.classList.remove('hidden');
        }

        document.getElementById('del-all-btn').addEventListener('click', () => {
            if (!confirm("⚠️ DANGER: This will delete ALL pending BROILER orders.\n\nThis action cannot be undone. Proceed?")) return;
            isDeletingAll = true; 
            document.getElementById('verify-phone').value = '';
            document.getElementById('verify-password').value = '';
            verifyModal.classList.remove('hidden');
        });

        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            const phone = document.getElementById('verify-phone').value.trim();
            const pass = document.getElementById('verify-password').value.trim();
            const btn = document.getElementById('confirm-delete-btn');
            
            if (!phone || !pass) return alert("Enter phone number and password.");

            btn.disabled = true;
            btn.textContent = "Verifying...";
            
            try {
                const staffQuery = await db.collection('staff').where('phoneNumber', '==', phone).limit(1).get();
                if (staffQuery.empty) {
                    alert("Unauthorized or user not found.");
                    btn.disabled = false;
                    btn.textContent = "Verify & Delete";
                    return;
                }
                
                const data = staffQuery.docs[0].data();
                const dbPassword = data.password !== undefined ? String(data.password).trim() : 
                                   data.Password !== undefined ? String(data.Password).trim() : null;
                
                if (dbPassword === pass) {
                    if (isDeletingAll) { await performBatchDelete(); } 
                    else { await performDelete(itemToDelete); }
                    verifyModal.classList.add('hidden');
                } else {
                    alert("Incorrect Password.");
                }
            } catch (e) {
                console.error(e);
                alert("Verification failed.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Verify & Delete";
            }
        });

        async function performDelete(item) {
            try {
                const orderRef = db.collection('orders').doc(item.orderId);
                const doc = await orderRef.get();
                if (!doc.exists) return;
                const data = doc.data();
                const updatedBroilers = data.broilers.filter((_, i) => i !== item.broilerIndex);
                if (updatedBroilers.length === 0 && (!data.parts || data.parts.length === 0)) {
                    await orderRef.delete();
                } else {
                    await orderRef.update({ broilers: updatedBroilers });
                }
                showNotification("Item deleted.", "success");
            } catch (e) { showNotification("Failed.", "error"); }
        }

        async function performBatchDelete() {
            try {
                const snapshot = await db.collection('orders').where('status', '==', 'pending').where('productType', '==', 'broiler').get();
                if (snapshot.empty) return showNotification("No orders.", "error");
                const batch = db.batch();
                snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
                await batch.commit();
                showNotification("All Deleted.", "success");
            } catch (e) { showNotification("Error.", "error"); }
            finally { isDeletingAll = false; }
        }

        // Close handlers
        document.getElementById('cancel-verify-btn').addEventListener('click', () => verifyModal.classList.add('hidden'));
        document.getElementById('modal-close-x').addEventListener('click', () => dispatchModal.classList.add('hidden'));
        document.getElementById('edit-close-x').addEventListener('click', () => editModal.classList.add('hidden'));
        document.getElementById('cust-select-close').addEventListener('click', () => customerSelectModal.classList.add('hidden'));

        async function handleInvoice(item) {
            if (item.dispatchedQty < item.orderedQty) {
                if (!confirm(`Warning: Only ${item.dispatchedQty}/${item.orderedQty} dispatched. Complete order?`)) return;
            } else {
                if (!confirm(`Complete dispatch for ${item.customerName}?`)) return;
            }
            try {
                const orderRef = db.collection('orders').doc(item.orderId);
                const doc = await orderRef.get();
                if (doc.exists) {
                    const broilers = doc.data().broilers;
                    if (broilers[item.broilerIndex]) {
                        broilers[item.broilerIndex].isInvoiced = true;
                        await orderRef.update({ broilers: broilers });
                        showNotification('Completed.', 'success');
                    }
                }
            } catch (e) { alert("Error."); }
        }

        // Submit Dispatch
        document.getElementById('modal-submit-btn').addEventListener('click', async () => {
            if (!currentModalTarget) return;
            const btn = document.getElementById('modal-submit-btn');
            const qty = parseInt(document.getElementById('modal-qty').value) || 0;
            const grossWeight = parseFloat(document.getElementById('modal-weight').value) || 0;
            
            const containerType = document.getElementById('modal-container').value;
            const containerCount = parseInt(document.getElementById('modal-container-count').value) || 1;
            const hasR = document.getElementById('modal-r').checked;
            const isAyamLama = document.getElementById('modal-ayam-lama').checked;
            const isNett = document.getElementById('modal-nett-kg').checked;

            if (qty <= 0) { alert("Invalid quantity"); return; }

            btn.disabled = true; btn.textContent = 'Saving...';

            let netWeight = grossWeight;
            if (!isNett) {
                let tare = 0;
                if (containerType === 'Crate') tare = pricingSettings.tare_crate * containerCount;
                if (containerType === 'Basket') tare = pricingSettings.tare_basket * containerCount;
                if (containerType === 'Barrel') tare = pricingSettings.tare_barrel * containerCount;
                if (hasR) tare += pricingSettings.tare_r;
                netWeight = Math.max(0, grossWeight - tare);
            }

            try {
                // --- AYAM LAMA VERIFICATION LOGIC ---
                if (isAyamLama) {
                    let currentStockCount = 0;
                    // Safely fetch both Broiler and Slices from stock_entries
                    const stockSnap = await db.collection('stock_entries').where('category', 'in', ['Broiler', 'Slices']).get();
                    stockSnap.forEach(doc => {
                        const count = parseInt(doc.data().categoryDetails?.count) || 0;
                        currentStockCount += count;
                    });

                    // If stock is insufficient, block submission and show modal
                    if (currentStockCount < qty) {
                        insufficientModal.classList.remove('hidden');
                        btn.disabled = false;
                        btn.textContent = 'Add & Update';
                        return; // Stop execution
                    }
                }

                const orderRef = db.collection('orders').doc(currentModalTarget.orderId);
                const docSnap = await orderRef.get();
                if (docSnap.exists) {
                    const broilers = docSnap.data().broilers;
                    const itemData = broilers[currentModalTarget.broilerIndex];
                    
                    if (itemData) {
                        const existingQty = parseInt(itemData.dispatchedQty) || 0;
                        const existingWeight = parseFloat(itemData.totalWeight) || 0;
                        const newTotalQty = existingQty + qty;

                        const orderedQty = parseInt(itemData.qty) || 0;
                        if (newTotalQty > orderedQty) {
                            if (confirm(`Total dispatched (${newTotalQty}) exceeds order (${orderedQty}). Update order qty?`)) {
                                itemData.qty = newTotalQty;
                            }
                        }

                        itemData.dispatchedQty = newTotalQty;
                        itemData.totalWeight = existingWeight + netWeight;
                        itemData.lastDispatch = { grossWeight, netWeight, containerType, hasR, isAyamLama, timestamp: new Date().toISOString() };
                        
                        if(!itemData.history) itemData.history = [];
                        itemData.history.push({
                            qty: qty,
                            net: netWeight,
                            ayamLama: isAyamLama, // Track in history
                            timestamp: new Date().toISOString()
                        });

                        await orderRef.update({ broilers: broilers });
                        
                        // --- DEDUCT AYAM LAMA FROM STOCK ---
                        if (isAyamLama) {
                            await db.collection('stock_entries').add({
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                grossWeight: 0,
                                tareWeight: 0,
                                netWeight: -netWeight,
                                category: 'Broiler', 
                                categoryDetails: { type: 'Dispatch Deduction (Ayam Lama)', count: -qty },
                                container: 'None',
                                containerDetails: {},
                                remark: `Deducted for Order (ID: ${currentModalTarget.orderId})`
                            });
                        }

                        showNotification('Updated!', 'success');
                        dispatchModal.classList.add('hidden');
                    }
                }
            } catch (e) { 
                console.error(e);
                alert("Failed to update dispatch."); 
            } finally { 
                btn.disabled = false; 
                btn.textContent = 'Add & Update'; 
            }
        });

        document.getElementById('modal-nett-kg').addEventListener('change', (e) => {
            const isNett = e.target.checked;
            const containerSelect = document.getElementById('modal-container');
            const containerCountSelect = document.getElementById('modal-container-count');
            const rCheckbox = document.getElementById('modal-r');
            
            containerSelect.disabled = isNett;
            containerCountSelect.disabled = isNett;
            rCheckbox.disabled = isNett;
            
            if (isNett) {
                containerSelect.classList.add('bg-gray-200', 'opacity-50', 'cursor-not-allowed');
                containerCountSelect.classList.add('bg-gray-200', 'opacity-50', 'cursor-not-allowed');
            } else {
                containerSelect.classList.remove('bg-gray-200', 'opacity-50', 'cursor-not-allowed');
                containerCountSelect.classList.remove('bg-gray-200', 'opacity-50', 'cursor-not-allowed');
            }
        });

        sortSelect.addEventListener('change', renderDispatchList);
        // Scripts run at bottom of body — DOM is already ready, call directly
        initialize();

    
