/**
 * ============================================================================
 * TokenCost Calculator - Refactored JavaScript
 * Reduced duplication, improved maintainability, generic item handlers
 * ============================================================================
 */

/**
 * Item Type Configuration - defines behavior for each item type
 */
const ITEM_TYPES = {
    coupon: {
        storageKey: 'tokencost_coupons',
        containerSelector: '#couponsContainer',
        clearBtnSelector: '#clearAllBtn',
        editFn: null  // Will be assigned in setupItemType
    },
    purchase: {
        storageKey: 'tokencost_purchases',
        containerSelector: '#purchasesContainer',
        clearBtnSelector: '#clearAllPurchasesBtn',
        editFn: null  // Will be assigned in setupItemType
    }
};

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Coupon-specific setup
    setupModeToggle();
    setupCheckboxListeners();

    // Generic setup for both item types
    setupItemType('coupon', '#addCouponBtn', collectCouponData, clearForm, handleEditCoupon);
    setupItemType('purchase', '#addPurchaseBtn', collectPurchaseData, clearPurchaseForm, handleEditPurchase);

    // Purchase reward display listeners
    setupPurchaseRewardListeners();

    // Calculation setup
    setupCalculation();

    // Initial display
    displayItems('coupon');
    displayItems('purchase');
});

/**
 * ============================================================================
 * GENERIC ITEM HANDLERS - Works for any item type (coupon, purchase)
 * ============================================================================
 */

/**
 * Setup event listeners for an item type
 */
function setupItemType(type, addBtnSelector, collectFn, clearFn, editFn) {
    // Store editFn in ITEM_TYPES so it's accessible in displayItems
    ITEM_TYPES[type].editFn = editFn;

    const addBtn = document.querySelector(addBtnSelector);
    const clearBtn = document.querySelector(ITEM_TYPES[type].clearBtnSelector);

    if (addBtn) {
        addBtn.addEventListener('click', () => handleAddItem(type, collectFn, clearFn));
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => handleClearAllItems(type));
    }
}

/**
 * Get all items of a specific type from localStorage
 */
function getItems(type) {
    const stored = localStorage.getItem(ITEM_TYPES[type].storageKey);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save items of a specific type to localStorage
 */
function saveItems(type, items) {
    localStorage.setItem(ITEM_TYPES[type].storageKey, JSON.stringify(items));
}

/**
 * Handle adding an item (coupon or purchase)
 */
function handleAddItem(type, collectFn, clearFn) {
    const maxItems = 10; // Limit to 10 items per type
    let items = getItems(type);
    
    if (items.length >= maxItems) {
        const itemName = type.charAt(0).toUpperCase() + type.slice(1);
        alert(`Maximum of ${maxItems} ${itemName}s allowed. Please delete some before adding more.`);
        return;
    }
    
    const itemData = collectFn();
    if (!itemData) return;

    items.push(itemData);
    saveItems(type, items);

    clearFn();
    displayItems(type);

    console.log(`${type} added:`, itemData);
}

/**
 * Handle clearing all items of a type
 */
function getTypeLabel(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function generateItemId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function handleClearAllItems(type) {
    const itemName = getTypeLabel(type);
    if (confirm(`Are you sure you want to delete all ${itemName}s?`)) {
        saveItems(type, []);
        displayItems(type);
    }
}

/**
 * Display all items of a specific type
 */
function displayItems(type) {
    const container = document.querySelector(ITEM_TYPES[type].containerSelector);
    const items = getItems(type);

    if (items.length === 0) {
        const itemName = getTypeLabel(type);
        container.innerHTML = `<p class="empty_message">No ${itemName}s added yet. Add your first ${type} to get started!</p>`;
        return;
    }

    container.innerHTML = items.map(item => createItemCard(type, item)).join('');

    // Attach event listeners to buttons
    items.forEach(item => {
        const editBtn = document.getElementById(`edit_${type}_${item.id}`);
        const duplicateBtn = document.getElementById(`duplicate_${type}_${item.id}`);
        const deleteBtn = document.getElementById(`delete_${type}_${item.id}`);

        if (editBtn) editBtn.addEventListener('click', () => ITEM_TYPES[type].editFn(item));
        if (duplicateBtn) duplicateBtn.addEventListener('click', () => duplicateItem(type, item.id));
        if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteItem(type, item.id));
    });
}

/**
 * Delete a specific item
 */
function handleDeleteItem(type, itemId) {
    let items = getItems(type);
    items = items.filter(item => item.id !== itemId);
    saveItems(type, items);
    displayItems(type);
}

/**
 * ============================================================================
 * COUPON-SPECIFIC HANDLERS
 * ============================================================================
 */

/**
 * Setup discount mode toggle (% OFF vs HKD OFF)
 */
function setupModeToggle() {
    const modeRadios = document.querySelectorAll('input[name="coupon_mode"]');

    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateCouponInputMode(e.target.value);
        });
    });

    updateCouponInputMode('percent');
}

/**
 * Update coupon input based on selected mode
 */
function updateCouponInputMode(mode) {
    const input = document.getElementById('couponAmount');
    const label = document.getElementById('couponAmount_label');

    if (mode === 'percent') {
        label.textContent = 'Discount (% off):';
        input.min = '1';
        input.max = '99';
        input.step = '1';
        input.placeholder = 'Discount percentage';
    } else if (mode === 'hkd') {
        label.textContent = 'Discount (HKD):';
        input.min = '1';
        input.max = '';
        input.step = '1';
        input.placeholder = 'Discount amount';
    }

    input.value = '';
}

/**
 * Setup listeners for all conditional checkboxes
 */
function setupCheckboxListeners() {
    const conditionalCheckboxes = [
        { checkbox: 'couponLimit_toggle', group: 'couponLimit_group' },
        { checkbox: 'couponRequirement_toggle', group: 'couponRequirement_type' },
        { checkbox: 'minimumSpend_toggle', group: 'minimumSpend_group' },
    ];

    conditionalCheckboxes.forEach(({ checkbox, group }) => {
        const checkboxElement = document.getElementById(checkbox);
        const groupElement = document.getElementById(group);

        if (checkboxElement && groupElement) {
            groupElement.classList.toggle('visible', checkboxElement.checked);

            checkboxElement.addEventListener('change', () => {
                groupElement.classList.toggle('visible', checkboxElement.checked);

                if (!checkboxElement.checked) {
                    const inputs = groupElement.querySelectorAll('input[type="number"]');
                    inputs.forEach(input => input.value = '');

                    const radios = groupElement.querySelectorAll('input[type="radio"]');
                    if (radios.length > 0) {
                        radios[0].checked = true;
                    }
                }
            });
        }
    });
}

/**
 * Collect coupon data from form
 */
function collectCouponData() {
    const mode = document.querySelector('input[name="coupon_mode"]:checked').value;
    const discountAmount = document.getElementById('couponAmount').value;
    const discountCap = document.getElementById('couponLimit').value;
    const couponRequirement = document.getElementById('couponRequirement').value;
    const minimumSpend = document.getElementById('minimumSpend').value;

    const discountNum = parseFloat(discountAmount);

    if (!discountAmount) {
        alert('Please enter a discount amount');
        return null;
    }

    if (mode === 'percent') {
        if (discountNum <= 0 || discountNum >= 100) {
            alert('Discount must be greater than 0% and less than 100%');
            return null;
        }
    } else if (mode === 'hkd') {
        if (discountNum <= 0) {
            alert('Discount amount must be greater than 0');
            return null;
        }
    }

    if (document.getElementById('couponLimit_toggle').checked) {
        const discountCapNum = parseFloat(discountCap);
        if (!discountCap || discountCapNum <= 0) {
            alert('Discount cap must be greater than 0');
            return null;
        }
    }

    if (document.getElementById('couponRequirement_toggle').checked) {
        const couponReqNum = parseFloat(couponRequirement);
        if (!couponRequirement || couponReqNum <= 0) {
            alert('Minimum spend requirement must be greater than 0');
            return null;
        }
    }

    if (document.getElementById('minimumSpend_toggle').checked) {
        const minimumSpendNum = parseFloat(minimumSpend);
        if (!minimumSpend || minimumSpendNum <= 0) {
            alert('Minimum charge must be greater than 0');
            return null;
        }
    }

    return {
        id: generateItemId(),
        mode: mode,
        discountAmount: discountNum,
        discountCap: document.getElementById('couponLimit_toggle').checked
            ? parseFloat(discountCap)
            : null,
        minimumSpend: document.getElementById('couponRequirement_toggle').checked
            ? {
                type: document.querySelector('input[name="requirement_type"]:checked').value,
                amount: parseFloat(couponRequirement)
            }
            : null,
        storeMinimumCharge: document.getElementById('minimumSpend_toggle').checked
            ? parseFloat(minimumSpend)
            : null,
    };
}

/**
 * Clear coupon form to initial state
 */
function clearForm() {
    document.getElementById('mode_percent').checked = true;
    document.getElementById('couponAmount').value = '';
    document.getElementById('couponLimit').value = '';
    document.getElementById('couponRequirement').value = '';
    document.getElementById('minimumSpend').value = '';
    document.getElementById('req_type_original').checked = true;

    document.getElementById('couponLimit_toggle').checked = false;
    document.getElementById('couponRequirement_toggle').checked = false;
    document.getElementById('minimumSpend_toggle').checked = false;

    document.getElementById('couponLimit_group').classList.remove('visible');
    document.getElementById('couponRequirement_type').classList.remove('visible');
    document.getElementById('minimumSpend_group').classList.remove('visible');

    updateCouponInputMode('percent');
}

/**
 * Handle Edit Coupon
 */
function handleEditCoupon(coupon) {
    document.querySelector('input[name="coupon_mode"][value="' + coupon.mode + '"]').checked = true;
    updateCouponInputMode(coupon.mode);

    document.getElementById('couponAmount').value = coupon.discountAmount;

    if (coupon.discountCap !== null) {
        document.getElementById('couponLimit_toggle').checked = true;
        document.getElementById('couponLimit').value = coupon.discountCap;
        document.getElementById('couponLimit_group').classList.add('visible');
    }

    if (coupon.minimumSpend) {
        document.getElementById('couponRequirement_toggle').checked = true;
        document.querySelector('input[name="requirement_type"][value="' + coupon.minimumSpend.type + '"]').checked = true;
        document.getElementById('couponRequirement').value = coupon.minimumSpend.amount;
        document.getElementById('couponRequirement_type').classList.add('visible');
    }

    if (coupon.storeMinimumCharge !== null) {
        document.getElementById('minimumSpend_toggle').checked = true;
        document.getElementById('minimumSpend').value = coupon.storeMinimumCharge;
        document.getElementById('minimumSpend_group').classList.add('visible');
    }

    handleDeleteItem('coupon', coupon.id);
    document.querySelector('form').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Create HTML for a coupon card
 */
function createCouponCard(coupon) {
    const discountLabel = coupon.mode === 'percent' ? '%' : 'HKD';

    return `
        <div class="item_card item_card--coupon">
            <div class="item_card_content">
                <div class="item_card_header">Discount: ${coupon.discountAmount}${discountLabel}</div>
                ${coupon.discountCap !== null ? `<div class="item_card_detail"><strong>Cap:</strong> HKD ${coupon.discountCap}</div>` : ''}
                ${coupon.minimumSpend ? `<div class="item_card_detail"><strong>Min Spend:</strong> HKD ${coupon.minimumSpend.amount} (${coupon.minimumSpend.type})</div>` : ''}
                ${coupon.storeMinimumCharge !== null ? `<div class="item_card_detail"><strong>Store Min:</strong> HKD ${coupon.storeMinimumCharge}</div>` : ''}
            </div>
            <div class="item_card_actions">
                <button class="edit_button" id="edit_coupon_${coupon.id}">Edit</button>
                <button class="duplicate_button" id="duplicate_coupon_${coupon.id}">Duplicate</button>
                <button class="delete_button" id="delete_coupon_${coupon.id}">Delete</button>
            </div>
        </div>
    `;
}

/**
 * ============================================================================
 * PURCHASE-SPECIFIC HANDLERS
 * ============================================================================
 */

/**
 * Setup Purchase Reward input listeners
 */
function setupPurchaseRewardListeners() {
    const tokensInput = document.getElementById('purchaseTokens');
    const otherResourcesInput = document.getElementById('purchaseOtherResources');

    if (tokensInput) {
        tokensInput.addEventListener('input', updateTotalRewardDisplay);
    }

    if (otherResourcesInput) {
        otherResourcesInput.addEventListener('input', updateTotalRewardDisplay);
    }
}

/**
 * Update total reward display
 */
function updateTotalRewardDisplay() {
    const tokensValue = parseFloat(document.getElementById('purchaseTokens').value) || 0;
    const otherResourcesValue = parseFloat(document.getElementById('purchaseOtherResources').value) || 0;
    const totalReward = tokensValue + otherResourcesValue;

    document.getElementById('totalRewardValue').textContent = totalReward;
}

/**
 * Collect purchase data from form
 */
function collectPurchaseData() {
    const price = document.getElementById('purchasePrice').value;
    const description = document.getElementById('purchaseDescription').value;
    const tokens = document.getElementById('purchaseTokens').value;
    const otherResources = document.getElementById('purchaseOtherResources').value;

    const priceNum = parseFloat(price) || 0;
    const tokensNum = parseFloat(tokens) || 0;
    const otherResourcesNum = parseFloat(otherResources) || 0;

    if (!price || priceNum <= 0) {
        alert('Price must be greater than 0');
        return null;
    }

    if (description.length > 50) {
        alert('Description must not exceed 50 characters');
        return null;
    }

    if (tokensNum <= 0 && otherResourcesNum <= 0) {
        alert('Please enter at least one reward value (Tokens or Other Resources must be greater than 0)');
        return null;
    }

    return {
        id: generateItemId(),
        price: priceNum,
        description: description || '',
        tokens: tokensNum,
        otherResources: otherResourcesNum,
        totalReward: tokensNum + otherResourcesNum,
    };
}

/**
 * Clear purchase form
 */
function clearPurchaseForm() {
    document.getElementById('purchasePrice').value = '';
    document.getElementById('purchaseDescription').value = '';
    document.getElementById('purchaseTokens').value = '';
    document.getElementById('purchaseOtherResources').value = '';
    updateTotalRewardDisplay();
}

/**
 * Handle Edit Purchase
 */
function handleEditPurchase(purchase) {
    document.getElementById('purchasePrice').value = purchase.price;
    document.getElementById('purchaseDescription').value = purchase.description;
    document.getElementById('purchaseTokens').value = purchase.tokens;
    document.getElementById('purchaseOtherResources').value = purchase.otherResources;

    updateTotalRewardDisplay();

    handleDeleteItem('purchase', purchase.id);
    document.querySelector('.input_purchase').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Create HTML for a purchase card
 */
function createPurchaseCard(purchase) {
    const safeDescription = escapeHtml(purchase.description);

    return `
        <div class="item_card item_card--purchase">
            <div class="item_card_content">
                <div class="item_card_header">
                    ${safeDescription ? `${safeDescription} - ` : ''}HKD ${purchase.price}
                </div>
                <div class="item_card_detail"><strong>Total Reward:</strong> ${purchase.totalReward} tokens</div>
                ${purchase.tokens > 0 ? `<div class="item_card_detail"><strong>Tokens:</strong> ${purchase.tokens}</div>` : ''}
                ${purchase.otherResources > 0 ? `<div class="item_card_detail"><strong>Other Resources:</strong> ${purchase.otherResources}</div>` : ''}
            </div>
            <div class="item_card_actions">
                <button class="edit_button" id="edit_purchase_${purchase.id}">Edit</button>
                <button class="duplicate_button" id="duplicate_purchase_${purchase.id}">Duplicate</button>
                <button class="delete_button" id="delete_purchase_${purchase.id}">Delete</button>
            </div>
        </div>
    `;
}

/**
 * Duplicate a stored item by type and ID
 */
function duplicateItem(type, itemId) {
    const items = getItems(type);
    const maxItems = 10;
    if (items.length >= maxItems) {
        const itemName = getTypeLabel(type);
        alert(`Maximum of ${maxItems} ${itemName}s allowed. Please delete some before duplicating more.`);
        return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const duplicated = JSON.parse(JSON.stringify(item));
    duplicated.id = generateItemId();
    items.push(duplicated);
    saveItems(type, items);
    displayItems(type);
}

/**
 * ============================================================================
 * CALCULATION LOGIC
 * ============================================================================
 */

/**
 * Setup calculation event listeners
 */
function setupCalculation() {
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', handleCalculate);
    }
}

/**
 * Handle calculate button click
 */
function handleCalculate() {
    const purchases = getItems('purchase');
    const coupons = getItems('coupon');

    if (purchases.length === 0) {
        alert('Please add at least one purchase option');
        return;
    }

    const combinations = calculateAllCombinations(purchases, coupons);

    displayResults(combinations);
}

/**
 * Calculate all possible combinations of purchases and coupons
 */
function calculateAllCombinations(purchases, coupons) {
    // If no coupons, best for each is no-coupon case.
    const baseCombos = purchases.map(purchase => calculateCombination(purchase, null));
    if (coupons.length === 0) return baseCombos;

    const p = purchases.length;
    const c = coupons.length;
    const n = p + c; // square matrix dimension including dummy rows/cols

    const costMatrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Build matrix: row 0..p-1 for purchases, col 0..c-1 for coupons, col c..n-1 for no-coupon options
    for (let i = 0; i < p; i++) {
        for (let j = 0; j < c; j++) {
            const combo = calculateCombination(purchases[i], coupons[j]);
            costMatrix[i][j] = combo.applicable ? combo.finalPrice : 1e6;
        }
        // No-coupon columns (dummy) are fixed to no-coupon price
        for (let j = c; j < n; j++) {
            costMatrix[i][j] = baseCombos[i].finalPrice;
        }
    }

    // Dummy rows (p..n-1) keep zeros (no impact)

    const { assignment } = hungarian(costMatrix);

    const results = [];

    for (let i = 0; i < p; i++) {
        const col = assignment[i];
        if (col !== -1 && col < c) {
            results.push(calculateCombination(purchases[i], coupons[col]));
        } else {
            results.push(baseCombos[i]);
        }
    }

    return results;
}

function hungarian(cost) {
    const n = cost.length;
    const u = Array(n + 1).fill(0);
    const v = Array(n + 1).fill(0);
    const p = Array(n + 1).fill(0);
    const way = Array(n + 1).fill(0);

    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0;
        const minv = Array(n + 1).fill(Infinity);
        const used = Array(n + 1).fill(false);

        while (true) {
            used[j0] = true;
            const i0 = p[j0];
            let delta = Infinity;
            let j1 = 0;

            for (let j = 1; j <= n; j++) {
                if (!used[j]) {
                    const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) {
                        minv[j] = cur;
                        way[j] = j0;
                    }
                    if (minv[j] < delta) {
                        delta = minv[j];
                        j1 = j;
                    }
                }
            }

            for (let j = 0; j <= n; j++) {
                if (used[j]) {
                    u[p[j]] += delta;
                    v[j] -= delta;
                } else {
                    minv[j] -= delta;
                }
            }

            j0 = j1;
            if (p[j0] === 0) break;
        }

        while (true) {
            const j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
            if (j0 === 0) break;
        }
    }

    const assignment = Array(n).fill(-1);
    for (let j = 1; j <= n; j++) {
        if (p[j] > 0 && p[j] <= n) {
            assignment[p[j] - 1] = j - 1;
        }
    }

    return { assignment };
}

/**
 * Calculate the result for a specific purchase-coupon combination
 */
function calculateCombination(purchase, coupon) {
    let finalPrice = purchase.price;
    let discountAmount = 0;
    
    if (coupon) {
        // First, calculate potential discount
        let potentialDiscount = 0;
        if (coupon.mode === 'percent') {
            potentialDiscount = finalPrice * (coupon.discountAmount / 100);
        } else if (coupon.mode === 'hkd') {
            potentialDiscount = coupon.discountAmount;
        }
        
        // Apply discount cap if applicable
        if (coupon.discountCap !== null && potentialDiscount > coupon.discountCap) {
            potentialDiscount = coupon.discountCap;
        }
        
        const potentialFinalPrice = finalPrice - potentialDiscount;
        
        // Check minimum spend requirement
        let spendCheckPassed = true;
        if (coupon.minimumSpend) {
            const spendAmount = coupon.minimumSpend.type === 'original' ? finalPrice : potentialFinalPrice;
            if (spendAmount < coupon.minimumSpend.amount) {
                spendCheckPassed = false;
            }
        }
        
        if (!spendCheckPassed) {
            // Coupon cannot be applied
            const tokensPerHKD = finalPrice > 0 ? purchase.totalReward / finalPrice : null;
            return {
                purchase: purchase,
                coupon: coupon,
                finalPrice: finalPrice,
                discountAmount: 0,
                tokensPerHKD: tokensPerHKD,
                applicable: false
            };
        }
        
        // Apply the discount
        discountAmount = potentialDiscount;
        finalPrice = potentialFinalPrice;
        
        // Ensure final price is not below store minimum charge
        if (coupon.storeMinimumCharge !== null && finalPrice < coupon.storeMinimumCharge) {
            finalPrice = coupon.storeMinimumCharge;
            discountAmount = purchase.price - finalPrice;
        }

        // Prevent impossible negative totals when fixed discount exceeds price.
        if (finalPrice < 0) {
            finalPrice = 0;
            discountAmount = purchase.price;
        }
    }

    const tokensPerHKD = finalPrice > 0 ? purchase.totalReward / finalPrice : null;
    return {
        purchase: purchase,
        coupon: coupon,
        finalPrice: finalPrice,
        discountAmount: discountAmount,
        tokensPerHKD: tokensPerHKD,
        applicable: true
    };
}

/**
 * Display calculation results
 */
function displayResults(combinations) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsList = document.getElementById('resultsList');
    const resultsTotal = document.getElementById('resultsTotal');
    
    if (combinations.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    resultsList.innerHTML = combinations.map(combo => createResultCard(combo)).join('');

    const finalPrice = combinations.reduce((sum, combo) => sum + combo.finalPrice, 0);
    resultsTotal.textContent = `Final Price: HKD ${finalPrice.toFixed(2)}`;

    resultsContainer.style.display = 'block';
}

/**
 * Create HTML for a result card
 */
function createResultCard(combo) {
    const purchaseLabel = combo.purchase.description
        ? escapeHtml(combo.purchase.description)
        : `${Math.round(combo.purchase.totalReward)} Pack`;
    const couponDesc = combo.coupon ? 
        `${combo.coupon.discountAmount}${combo.coupon.mode === 'percent' ? '%' : ' HKD'} OFF${combo.coupon.discountCap ? ` (max ${combo.coupon.discountCap} HKD)` : ''}` : 
        'No Coupon';
    const tokensPerHKDText = combo.tokensPerHKD === null ? 'N/A (free)' : combo.tokensPerHKD.toFixed(4);
    const freeBadge = combo.finalPrice === 0 ? '<span class="free_badge">FREE PURCHASE</span>' : '';
    
    const applicableText = combo.applicable ? '' : ' (Not Applicable)';
    
    return `
        <div class="result_card ${combo.applicable ? '' : 'not-applicable'}">
            <div class="result_content">
                <div class="result_header">
                    <strong>${purchaseLabel}</strong> + ${couponDesc}${applicableText} ${freeBadge}
                </div>
                <div class="result_details">
                    <div><span>Final Price:</span> <span>HKD ${combo.finalPrice.toFixed(2)}</span></div>
                    <div><span>Discount:</span> <span>HKD ${combo.discountAmount.toFixed(2)}</span></div>
                    <div><span>Tokens per HKD:</span> <span>${tokensPerHKDText}</span></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * ============================================================================
 * GENERIC CARD FACTORY - Creates appropriate card based on type
 * ============================================================================
 */

/**
 * Create item card (coupon or purchase)
 */
function createItemCard(type, item) {
    if (type === 'coupon') {
        return createCouponCard(item);
    } else if (type === 'purchase') {
        return createPurchaseCard(item);
    }
}

