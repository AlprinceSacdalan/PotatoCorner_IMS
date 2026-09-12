document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let materialsCache = [];

async function loadInventory() {
    const response = await fetch(`${API_BASE}/inventory/get_inventory.php`);
    const result = await response.json();

    if (!result.success) return;

    materialsCache = result.data;
    renderInventoryRows(materialsCache);

    const select = document.getElementById('materialSelect');
    select.innerHTML = '<option value="">Select item</option>';
    materialsCache.forEach(item => {
        select.innerHTML += `<option value="${item.material_id}">${item.name}</option>`;
    });
}

function renderInventoryRows(items) {
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';

    items.forEach(item => {
        const badgeClass = item.status === 'low' ? 'status-low'
                          : item.status === 'watch' ? 'status-watch'
                          : 'status-ok';
        const badgeLabel = item.status === 'low' ? 'Low'
                          : item.status === 'watch' ? 'Watch'
                          : 'Ok';
        const rowClass = item.status === 'low' ? 'row-low'
                        : item.status === 'watch' ? 'row-watch'
                        : '';

        tbody.innerHTML += `
            <tr class="${rowClass}">
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td>${item.current_stock}</td>
                <td>${item.threshold}</td>
                <td><span class="${badgeClass}">${badgeLabel}</span></td>
            </tr>
        `;
    });
}

document.getElementById('inventorySearch').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderInventoryRows(materialsCache.filter(item => item.name.toLowerCase().includes(term)));
});

document.getElementById('saveAdjustmentBtn').addEventListener('click', async function() {
    const material_id = document.getElementById('materialSelect').value;
    const quantity = document.getElementById('quantityInput').value;
    const adjustment_type = document.getElementById('typeSelect').value;
    const msg = document.getElementById('adjustmentMsg');
    msg.textContent = '';

    if (!material_id || !quantity) {
        msg.textContent = 'Please select an item and enter a quantity.';
        return;
    }

    const response = await fetch(`${API_BASE}/inventory/add_stock.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            material_id: material_id,
            user_id: currentUser.user_id,
            quantity: quantity,
            adjustment_type: adjustment_type
        })
    });
    const result = await response.json();

    if (result.success) {
        document.getElementById('quantityInput').value = '';
        loadInventory();
    } else {
        msg.textContent = result.message;
    }
});

loadInventory();