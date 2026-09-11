document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let selectedMenuId = null;
let editingMenuId = null; 
let materialsCache = [];

async function loadMenuItems() {
    const response = await fetch(`${API_BASE}/menu/get_menu.php`);
    const result = await response.json();
    if (!result.success) return;

    const list = document.getElementById('menuItemList');
    list.innerHTML = '';
    result.data.forEach(item => {
        const isAvailable = item.status === 'available';

        const row = document.createElement('div');
        row.className = 'menu-item-row menu-item-row-managed' + (isAvailable ? '' : ' unavailable');
        row.dataset.menuId = item.menu_id;

        row.innerHTML = `
            <span class="menu-item-row-label">${item.name} — ₱${item.price}
                ${isAvailable ? '' : '<span class="status-badge-unavailable">Unavailable</span>'}
            </span>
            <span class="menu-item-row-actions">
                <button class="row-icon-btn" data-action="edit" title="Edit">✎</button>
                <button class="row-icon-btn" data-action="toggle" title="${isAvailable ? 'Mark unavailable' : 'Mark available'}">${isAvailable ? '●' : '○'}</button>
            </span>
        `;

        row.querySelector('.menu-item-row-label').addEventListener('click', () => selectMenuItem(item.menu_id, item.name));
        row.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(item);
        });
        row.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenuStatus(item);
        });

        list.appendChild(row);
    });
}

async function toggleMenuStatus(item) {
    const isAvailable = item.status === 'available';
    const confirmMsg = isAvailable
        ? `Mark "${item.name}" as unavailable? It will disappear from the Process Sale menu.`
        : `Mark "${item.name}" as available again?`;
    if (!confirm(confirmMsg)) return;

    const response = await fetch(`${API_BASE}/menu/toggle_menu_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: item.menu_id })
    });
    const result = await response.json();
    if (result.success) {
        loadMenuItems();
    } else {
        alert(result.message);
    }
}

function openEditModal(item) {
    editingMenuId = item.menu_id;
    document.getElementById('menuItemModalTitle').textContent = 'Edit menu item';
    document.getElementById('saveNewItemBtn').textContent = 'Update item';
    document.getElementById('newItemName').value = item.name;
    document.getElementById('newItemPrice').value = item.price;
    document.getElementById('menuItemModalError').textContent = '';
    document.getElementById('addMenuItemModal').classList.remove('hidden');
}

function openAddModal() {
    editingMenuId = null;
    document.getElementById('menuItemModalTitle').textContent = 'Add menu item';
    document.getElementById('saveNewItemBtn').textContent = 'Save item';
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemPrice').value = '';
    document.getElementById('menuItemModalError').textContent = '';
    document.getElementById('addMenuItemModal').classList.remove('hidden');
}

function closeMenuItemModal() {
    document.getElementById('addMenuItemModal').classList.add('hidden');
    editingMenuId = null;
}

async function loadRawMaterialsForDropdown() {
    const response = await fetch(`${API_BASE}/inventory/get_inventory.php`);
    const result = await response.json();
    if (!result.success) return;

    materialsCache = result.data;
    const select = document.getElementById('ingredientSelect');
    select.innerHTML = '<option value="">Select ingredient</option>';
    materialsCache.forEach(m => {
        select.innerHTML += `<option value="${m.material_id}">${m.name} (${m.unit})</option>`;
    });
}

async function selectMenuItem(menuId, menuName) {
    selectedMenuId = menuId;
    document.getElementById('recipeTitle').textContent = `Recipe — ${menuName}`;
    document.getElementById('recipeTable').style.display = 'table';
    document.getElementById('addIngredientForm').style.display = 'flex';

    document.querySelectorAll('.menu-item-row').forEach(r => r.classList.remove('selected'));
    document.querySelector(`.menu-item-row[data-menu-id="${menuId}"]`).classList.add('selected');

    await loadRecipe(menuId);
}

async function loadRecipe(menuId) {
    const response = await fetch(`${API_BASE}/menu/get_recipe.php?menu_id=${menuId}`);
    const result = await response.json();
    if (!result.success) return;

    const tbody = document.getElementById('recipeBody');
    tbody.innerHTML = '';
    result.data.forEach(ing => {
        const tr = document.createElement('tr');
        tr.dataset.recipeId = ing.recipe_id;
        tr.innerHTML = `
            <td>${ing.name}</td>
            <td class="recipe-qty-cell">
                <span class="recipe-qty-display">${ing.quantity_required} ${ing.unit}</span>
            </td>
            <td class="recipe-row-actions">
                <button class="row-icon-btn" data-action="edit" title="Edit quantity">✎</button>
                <button class="row-icon-btn" data-action="delete" title="Remove ingredient">🗑</button>
            </td>
        `;
        tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEditRecipeRow(tr, ing));
        tr.querySelector('[data-action="delete"]').addEventListener('click', () => deleteRecipeRow(ing.recipe_id, ing.name));
        tbody.appendChild(tr);
    });
}

function startEditRecipeRow(tr, ing) {
    const qtyCell = tr.querySelector('.recipe-qty-cell');
    qtyCell.innerHTML = `
        <input type="number" step="0.01" class="recipe-qty-input" value="${ing.quantity_required}">
        <span class="recipe-qty-unit">${ing.unit}</span>
    `;

    const actionsCell = tr.querySelector('.recipe-row-actions');
    actionsCell.innerHTML = `
        <button class="row-icon-btn" data-action="save" title="Save">✓</button>
        <button class="row-icon-btn" data-action="cancel" title="Cancel">✕</button>
    `;

    actionsCell.querySelector('[data-action="save"]').addEventListener('click', () => saveRecipeRow(tr, ing));
    actionsCell.querySelector('[data-action="cancel"]').addEventListener('click', () => loadRecipe(selectedMenuId));

    tr.querySelector('.recipe-qty-input').focus();
}

async function saveRecipeRow(tr, ing) {
    const newQty = tr.querySelector('.recipe-qty-input').value;
    const msg = document.getElementById('recipeMsg');
    msg.textContent = '';

    if (!newQty || Number(newQty) <= 0) {
        msg.textContent = 'Enter a valid quantity.';
        return;
    }

    const response = await fetch(`${API_BASE}/menu/save_recipe.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: ing.recipe_id, quantity_required: newQty })
    });
    const result = await response.json();

    if (result.success) {
        loadRecipe(selectedMenuId);
    } else {
        msg.textContent = result.message;
    }
}

async function deleteRecipeRow(recipeId, ingredientName) {
    if (!confirm(`Remove "${ingredientName}" from this recipe?`)) return;

    const response = await fetch(`${API_BASE}/menu/delete_recipe_item.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId })
    });
    const result = await response.json();

    if (result.success) {
        loadRecipe(selectedMenuId);
    } else {
        document.getElementById('recipeMsg').textContent = result.message;
    }
}

document.getElementById('addIngredientBtn').addEventListener('click', async function() {
    const material_id = document.getElementById('ingredientSelect').value;
    const quantity_required = document.getElementById('ingredientQty').value;
    const msg = document.getElementById('recipeMsg');
    msg.textContent = '';

    if (!material_id || !quantity_required) {
        msg.textContent = 'Select an ingredient and enter a quantity.';
        return;
    }

    const response = await fetch(`${API_BASE}/menu/save_recipe.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: selectedMenuId, material_id, quantity_required })
    });
    const result = await response.json();

    if (result.success) {
        document.getElementById('ingredientQty').value = '';
        loadRecipe(selectedMenuId);
    } else {
        msg.textContent = result.message;
    }
});

document.getElementById('addMenuItemBtn').addEventListener('click', openAddModal);
document.getElementById('cancelMenuItemBtn').addEventListener('click', closeMenuItemModal);

document.getElementById('saveNewItemBtn').addEventListener('click', async function() {
    const name = document.getElementById('newItemName').value.trim();
    const price = document.getElementById('newItemPrice').value;
    const errorEl = document.getElementById('menuItemModalError');
    errorEl.textContent = '';

    if (!name || !price) {
        errorEl.textContent = 'Item name and price are required.';
        return;
    }

    const payload = { name, price };
    if (editingMenuId) {
        payload.menu_id = editingMenuId;
    }

    const response = await fetch(`${API_BASE}/menu/save_menu_item.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.success) {
        closeMenuItemModal();
        loadMenuItems();
    } else {
        errorEl.textContent = result.message;
    }
});

loadMenuItems();
loadRawMaterialsForDropdown();