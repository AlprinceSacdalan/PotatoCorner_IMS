document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

async function loadDashboard() {
    const [inventoryRes, menuRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/get_inventory.php`),
        fetch(`${API_BASE}/menu/get_menu.php`)
    ]);
    const inventoryResult = await inventoryRes.json();
    const menuResult = await menuRes.json();

    if (!inventoryResult.success) return;

    const materials = inventoryResult.data;
    const lowCount = materials.filter(m => m.status === 'low').length;
    const watchCount = materials.filter(m => m.status === 'watch').length;
    const totalCount = materials.length;

    const menuCount = menuResult.success
        ? menuResult.data.filter(item => item.status === 'available').length
        : '—';

    renderStats({ totalCount, lowCount, watchCount, menuCount });
    renderAlerts(materials.filter(m => m.status === 'low' || m.status === 'watch'));
}

function renderStats({ totalCount, lowCount, watchCount, menuCount }) {
    const stats = [
        { label: 'Active menu items', value: menuCount, variant: 'neutral' },
        { label: 'Raw materials tracked', value: totalCount, variant: 'neutral' },
        { label: 'Low stock', value: lowCount, variant: 'low' },
        { label: 'Watch', value: watchCount, variant: 'watch' }
    ];

    document.getElementById('dashboardStats').innerHTML = stats.map(s => `
        <div class="stat-card stat-card-${s.variant}">
            <div class="stat-card-value">${s.value}</div>
            <div class="stat-card-label">${s.label}</div>
        </div>
    `).join('');
}

function renderAlerts(alertMaterials) {
    const tbody = document.getElementById('lowStockBody');
    const table = document.getElementById('lowStockTable');
    const noMsg = document.getElementById('noLowStockMsg');

    if (alertMaterials.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    noMsg.style.display = 'none';

    // Low stock first, then watch, alphabetical within each
    alertMaterials.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'low' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    tbody.innerHTML = alertMaterials.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.current_stock} ${m.unit}</td>
            <td>${m.threshold} ${m.unit}</td>
            <td><span class="status-${m.status === 'low' ? 'low' : 'watch'}">${m.status === 'low' ? 'Low' : 'Watch'}</span></td>
        </tr>
    `).join('');
}

loadDashboard();