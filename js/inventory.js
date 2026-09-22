document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let materialsCache = [];
let correctingMaterial = null;

async function loadInventory() {
    const response = await fetch(`${API_BASE}/inventory/get_inventory.php`);
    const result = await response.json();

    if (!result.success) return;

    materialsCache = result.data;
    renderInventoryRows(materialsCache);
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

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.unit}</td>
            <td>${item.current_stock}</td>
            <td>${item.threshold}</td>
            <td><span class="${badgeClass}">${badgeLabel}</span></td>
            <td><button class="row-icon-btn" data-action="edit" title="Correct stock">✎</button></td>
        `;
        tr.querySelector('[data-action="edit"]').addEventListener('click', () => openCorrectStockModal(item));
        tbody.appendChild(tr);
    });
}

document.getElementById('inventorySearch').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderInventoryRows(materialsCache.filter(item => item.name.toLowerCase().includes(term)));
});

function openCorrectStockModal(item) {
    correctingMaterial = item;
    document.getElementById('correctStockTitle').textContent = `Edit stock — ${item.name}`;
    document.getElementById('correctStockCurrent').textContent =
        `Current: ${item.current_stock} ${item.unit}`;
    document.getElementById('correctStockInput').value = item.current_stock;
    document.getElementById('correctStockError').textContent = '';
    document.getElementById('correctStockModal').classList.remove('hidden');
}

function closeCorrectStockModal() {
    document.getElementById('correctStockModal').classList.add('hidden');
    correctingMaterial = null;
}

document.getElementById('cancelCorrectStockBtn').addEventListener('click', closeCorrectStockModal);

document.getElementById('saveCorrectStockBtn').addEventListener('click', async function() {
    const errorEl = document.getElementById('correctStockError');
    errorEl.textContent = '';

    const newTotal = document.getElementById('correctStockInput').value;
    if (newTotal === '' || Number(newTotal) < 0) {
        errorEl.textContent = 'Enter a valid quantity.';
        return;
    }

    const response = await fetch(`${API_BASE}/inventory/add_stock.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            material_id: correctingMaterial.material_id,
            user_id: currentUser.user_id,
            new_total: newTotal
        })
    });
    const result = await response.json();

    if (result.success) {
        closeCorrectStockModal();
        loadInventory();
    } else {
        errorEl.textContent = result.message;
    }
});

loadInventory();