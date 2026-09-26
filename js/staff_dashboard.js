document.getElementById('welcomeMsg').textContent = currentUser.full_name;
document.getElementById('firstName').textContent = currentUser.full_name.split(' ')[0];

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

async function loadStaffDashboard() {
    const [inventoryRes, salesRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/get_inventory.php`),
        fetch(`${API_BASE}/reports/get_sales_report.php?range=today`)
    ]);
    const inventoryResult = await inventoryRes.json();
    const salesResult = await salesRes.json();

    if (inventoryResult.success) {
        renderStock(inventoryResult.data);
    }
    if (salesResult.success) {
        renderSalesStats(salesResult.data.summary);
        renderTransactions(salesResult.data.transactions);
    }
}

function renderStock(materials) {
    const tbody = document.getElementById('stockBody');
    tbody.innerHTML = materials.map(item => {
        const badgeClass = item.status === 'low' ? 'status-low'
                          : item.status === 'watch' ? 'status-watch'
                          : 'status-ok';
        const badgeLabel = item.status === 'low' ? 'Low'
                          : item.status === 'watch' ? 'Watch'
                          : 'Ok';
        const rowClass = item.status === 'low' ? 'row-low'
                        : item.status === 'watch' ? 'row-watch'
                        : '';
        return `
            <tr class="${rowClass}">
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td>${item.current_stock}</td>
                <td>${item.threshold}</td>
                <td><span class="${badgeClass}">${badgeLabel}</span></td>
            </tr>
        `;
    }).join('');
}

function renderSalesStats(summary) {
    const stats = [
        { label: "Today's revenue", value: `₱${Number(summary.total_revenue).toFixed(2)}` },
        { label: "Today's transactions", value: summary.total_transactions },
        { label: 'Average order value', value: `₱${Number(summary.avg_order_value).toFixed(2)}` }
    ];

    document.getElementById('salesStats').innerHTML = stats.map(s => `
        <div class="stat-card stat-card-neutral">
            <div class="stat-card-value">${s.value}</div>
            <div class="stat-card-label">${s.label}</div>
        </div>
    `).join('');
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    const table = document.getElementById('transactionsTable');
    const noMsg = document.getElementById('noTransactionsMsg');

    if (transactions.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }
    table.style.display = 'table';
    noMsg.style.display = 'none';

    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>#${t.transaction_id}</td>
            <td>${t.transaction_date}</td>
            <td>${t.cashier_name}</td>
            <td>${t.item_count}</td>
            <td>₱${Number(t.total_amount).toFixed(2)}</td>
        </tr>
    `).join('');
}

loadStaffDashboard();