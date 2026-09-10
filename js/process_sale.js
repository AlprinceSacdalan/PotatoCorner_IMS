document.getElementById('welcomeMsg').textContent = currentUser.full_name;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let menuItemsCache = [];
let flavorsCache = [];       
let flavorSizesCache = {};   
let currentModalItem = null;
let cart = [];
let nextLineId = 1;


const IMG_BASE = '/PotatoCorner_IMS/assets/images/';


const MIX_COMPONENT_LIMITS = { Large: 2, Mega: 2, Tera: 3 };

function getItemImage(item) {
    if (!item.size_name) return IMG_BASE + 'pc_logo.png';
    let suffix = '';
    if (item.name.includes('Chicken Pops')) suffix = '_ChickenPop';
    else if (item.name.includes('Loopy')) suffix = '_Loopy';
    else if (item.name.includes('Mix')) suffix = '_MixMax';
    return `${IMG_BASE}${item.size_name}${suffix}.jpg`;
}

function getFallbackImage(item) {
    return item.size_name ? `${IMG_BASE}${item.size_name}.jpg` : IMG_BASE + 'pc_logo.png';
}

async function loadMenuItems() {
    const response = await fetch(`${API_BASE}/menu/get_menu.php`);
    const result = await response.json();
    if (!result.success) return;
    menuItemsCache = result.data.filter(item => item.status === 'available');
    renderMenuGrid(menuItemsCache);
}

async function loadFlavors() {
    const response = await fetch(`${API_BASE}/flavors/get_flavors.php`);
    const result = await response.json();
    if (result.success) flavorsCache = result.data;
}

async function loadFlavorSizes() {
    const response = await fetch(`${API_BASE}/flavors/get_flavor_sizes.php`);
    const result = await response.json();
    if (result.success) flavorSizesCache = result.data;
}

function flavorNameById(id) {
    const f = flavorsCache.find(fl => Number(fl.material_id) === Number(id));
    return f ? f.name : 'Unknown flavor';
}

function renderMenuGrid(items) {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        const imgSrc = getItemImage(item);
        const fallbackSrc = getFallbackImage(item);
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="menu-card-img"
                 onerror="this.onerror=null;this.src='${fallbackSrc}';">
            <div class="menu-card-name">${item.name}</div>
            <span class="menu-price">₱${item.price}</span>
        `;
        card.addEventListener('click', () => openItemModal(item));
        grid.appendChild(card);
    });
}

document.getElementById('searchInput').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderMenuGrid(menuItemsCache.filter(item => item.name.toLowerCase().includes(term)));
});

// Flavor / Mix & Max modal 

function renderFlavorSlots(prefix, maxFlavors) {
    let html = '';
    for (let i = 0; i < maxFlavors; i++) {
        html += `
            <select class="flavor-select ${prefix}-flavor-select" data-slot="${i}">
                <option value="">No Flavor</option>
                ${flavorsCache.map(f => `<option value="${f.material_id}">${f.name}</option>`).join('')}
            </select>
        `;
    }
    html += `
        <label class="extra-flavor-label">
            <input type="checkbox" class="${prefix}-extra-checkbox"> Extra flavor (+half tbsp)
        </label>
    `;
    return html;
}

function collectFlavors(prefix) {
    const selects = document.querySelectorAll(`.${prefix}-flavor-select`);
    const chosen = [];
    selects.forEach(sel => {
        if (sel.value) chosen.push(parseInt(sel.value, 10));
    });
    return chosen;
}

function renderMixComponentBlock(type, idx, maxFlavors) {
    return `
        <div class="mix-component-block" data-idx="${idx}">
            <label class="component-include-label">
                <input type="checkbox" class="comp-include-checkbox" data-idx="${idx}"> <strong>${type}</strong>
            </label>
            <div class="component-flavor-section hidden" id="compFlavorSection${idx}">
                ${renderFlavorSlots('comp' + idx, maxFlavors)}
            </div>
        </div>
    `;
}

function attachMixCheckboxHandlers(maxComponents) {
    const checkboxes = document.querySelectorAll('.comp-include-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const idx = cb.dataset.idx;
            document.getElementById(`compFlavorSection${idx}`).classList.toggle('hidden', !cb.checked);

            const checkedCount = document.querySelectorAll('.comp-include-checkbox:checked').length;
            checkboxes.forEach(other => {
                if (!other.checked) other.disabled = checkedCount >= maxComponents;
            });
            document.getElementById('flavorModalError').textContent = '';
        });
    });
}

async function openItemModal(item) {
    currentModalItem = item;
    document.getElementById('flavorModalTitle').textContent = item.name;
    document.getElementById('flavorModalError').textContent = '';
    const body = document.getElementById('flavorModalBody');
    body.innerHTML = 'Loading...';
    delete body.dataset.snackTypes;
    delete body.dataset.maxComponents;

    const sizeInfo = flavorSizesCache[item.size_name];
    if (!sizeInfo) {
        body.innerHTML = `<p class="error-text">No flavor size info found for "${item.size_name}".</p>`;
        document.getElementById('flavorModal').classList.remove('hidden');
        return;
    }

    const isMix = item.name.includes('Mix');

    if (!isMix) {
        body.innerHTML = renderFlavorSlots('item', sizeInfo.max_flavors);
    } else {
        try {
            const res = await fetch(`${API_BASE}/menu/get_mix_recipe.php?menu_id=${item.menu_id}`);
            const result = await res.json();
            const snackTypes = result.success ? result.data : [];
            const maxComponents = MIX_COMPONENT_LIMITS[item.size_name] || snackTypes.length;

            if (snackTypes.length === 0) {
                body.innerHTML = `<p class="error-text">No mix_recipe components found for this item.</p>`;
            } else {
                body.innerHTML =
                    `<p class="mix-instructions">Choose exactly ${maxComponents} of ${snackTypes.length} snack types.</p>` +
                    snackTypes.map((type, idx) => renderMixComponentBlock(type, idx, 1)).join('');
                attachMixCheckboxHandlers(maxComponents);
            }
            body.dataset.snackTypes = JSON.stringify(snackTypes);
            body.dataset.maxComponents = String(maxComponents);
        } catch (err) {
            body.innerHTML = `<p class="error-text">Could not load mix components.</p>`;
        }
    }

    document.getElementById('flavorModal').classList.remove('hidden');
}

document.getElementById('flavorModalCancel').addEventListener('click', () => {
    document.getElementById('flavorModal').classList.add('hidden');
});

document.getElementById('flavorModalConfirm').addEventListener('click', () => {
    const item = currentModalItem;
    if (!item) return;

    const isMix = item.name.includes('Mix');
    const body = document.getElementById('flavorModalBody');

    if (!isMix) {
        const flavors = collectFlavors('item');
        const isExtraEl = document.querySelector('.item-extra-checkbox');
        const isExtra = isExtraEl ? isExtraEl.checked : false;
        addItemToCart(item, { flavors, is_extra_flavor: isExtra });
    } else {
        const snackTypes = JSON.parse(body.dataset.snackTypes || '[]');
        const maxComponents = parseInt(body.dataset.maxComponents || '0', 10);
        if (snackTypes.length === 0) return; // nothing to add, error already shown

        const checkedIdxs = Array.from(document.querySelectorAll('.comp-include-checkbox:checked'))
            .map(cb => cb.dataset.idx);

        if (checkedIdxs.length !== maxComponents) {
            document.getElementById('flavorModalError').textContent =
                `Please choose exactly ${maxComponents} snack types.`;
            return;
        }

        const components = checkedIdxs.map(idx => {
            const extraEl = document.querySelector(`.comp${idx}-extra-checkbox`);
            return {
                snack_type: snackTypes[idx],
                flavors: collectFlavors('comp' + idx),
                is_extra_flavor: extraEl ? extraEl.checked : false
            };
        });
        addItemToCart(item, { components });
    }

    document.getElementById('flavorModal').classList.add('hidden');
});

//Cart 

function addItemToCart(item, config) {
    const signature = JSON.stringify({ menu_id: item.menu_id, ...config });
    const existing = cart.find(c => c.signature === signature);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            lineId: nextLineId++,
            signature,
            menu_id: item.menu_id,
            name: item.name,
            price: item.price,
            size_name: item.size_name,
            quantity: 1,
            ...config
        });
    }
    renderOrderSummary();
}

function removeFromCart(lineId) {
    cart = cart.filter(c => c.lineId !== lineId);
    renderOrderSummary();
}

function describeCartLine(item) {
    if (item.components) {
        return item.components.map(c => {
            const names = c.flavors.length ? c.flavors.map(flavorNameById).join(', ') : 'No Flavor';
            return `${c.snack_type}: ${names}${c.is_extra_flavor ? ' +extra' : ''}`;
        }).join(' | ');
    }
    if (item.flavors) {
        const names = item.flavors.length ? item.flavors.map(flavorNameById).join(', ') : 'No Flavor';
        return `${names}${item.is_extra_flavor ? ' +extra' : ''}`;
    }
    return '';
}

function renderOrderSummary() {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        list.innerHTML += `
            <div class="order-line">
                <div>
                    <div>${item.quantity}x ${item.name}</div>
                    <div class="order-line-detail">${describeCartLine(item)}</div>
                </div>
                <span>₱${subtotal.toFixed(2)}
                    <button class="remove-btn" onclick="removeFromCart(${item.lineId})">×</button>
                </span>
            </div>
        `;
    });

    document.getElementById('orderTotal').textContent = `₱${total.toFixed(2)}`;
}

Promise.all([loadMenuItems(), loadFlavors(), loadFlavorSizes()]);

document.getElementById('confirmSaleBtn').addEventListener('click', async function() {
    const msg = document.getElementById('saleMsg');
    msg.textContent = '';

    if (cart.length === 0) {
        msg.textContent = 'Add at least one item to the order.';
        return;
    }

    const items = cart.map(c => {
        const base = { menu_id: c.menu_id, quantity: c.quantity };
        if (c.components) {
            base.components = c.components;
        } else {
            base.flavors = c.flavors;
            base.is_extra_flavor = c.is_extra_flavor;
        }
        return base;
    });

    try {
        const response = await fetch(`${API_BASE}/transactions/process_sale.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, items })
        });
        const result = await response.json();

        if (result.success) {
            alert(`Sale confirmed! Total: ₱${result.data.total_amount}`);
            cart = [];
            renderOrderSummary();
        } else {
            msg.textContent = result.message;
        }
    } catch (err) {
        msg.textContent = 'Could not connect to server. Check your connection.';
    }
});