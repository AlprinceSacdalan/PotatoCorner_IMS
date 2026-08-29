document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let selectedMenuId = null;
let materialsCache = [];

async function loadMenuItems() {
    const response = await fetch(`${API_BASE}/menu/get_menu.php`);
    const result = await response.json();
    if (!result.success) return;

    const list = document.getElementById('menuItemList');
    list.innerHTML = '';
    result.data.forEach(item => {
        const row = document.createElement('div');
        row.className = 'menu-item-row';
        row.textContent = `${item.name} — ₱${item.price}`;
        row.dataset.menuId = item.menu_id;
        row.addEventListener('click', () => selectMenuItem(item.menu_id, item.name));
        list.appendChild(row);
    });
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
        tbody.innerHTML += `<tr><td>${ing.name}</td><td>${ing.quantity_required} ${ing.unit}</td></tr>`;
    });
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

document.getElementById('addMenuItemBtn').addEventListener('click', function() {
    document.getElementById('addMenuItemModal').style.display = 'flex';
});

document.getElementById('saveNewItemBtn').addEventListener('click', async function() {
    const name = document.getElementById('newItemName').value.trim();
    const price = document.getElementById('newItemPrice').value;

    if (!name || !price) return;

    const response = await fetch(`${API_BASE}/menu/save_menu_item.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price })
    });
    const result = await response.json();

    if (result.success) {
        document.getElementById('newItemName').value = '';
        document.getElementById('newItemPrice').value = '';
        document.getElementById('addMenuItemModal').style.display = 'none';
        loadMenuItems();
    }
});

loadMenuItems();
loadRawMaterialsForDropdown();