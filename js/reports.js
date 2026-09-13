document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let currentRange = 'today';
let transactionsCache = [];
let salesChart = null;

async function loadReport(range) {
    currentRange = range;
    const response = await fetch(`${API_BASE}/reports/get_sales_report.php?range=${range}`);
    const result = await response.json();
    if (!result.success) return;

    renderStats(result.data.summary);
    renderChart(result.data.daily_sales);
    renderBestSellers(result.data.best_sellers);
    transactionsCache = result.data.transactions;
    renderTransactions(transactionsCache);
}

function renderStats(summary) {
    const stats = [
        { label: 'Total revenue', value: `₱${Number(summary.total_revenue).toFixed(2)}`, variant: 'neutral' },
        { label: 'Transactions', value: summary.total_transactions, variant: 'neutral' },
        { label: 'Average order value', value: `₱${Number(summary.avg_order_value).toFixed(2)}`, variant: 'neutral' }
    ];

    document.getElementById('reportStats').innerHTML = stats.map(s => `
        <div class="stat-card stat-card-${s.variant}">
            <div class="stat-card-value">${s.value}</div>
            <div class="stat-card-label">${s.label}</div>
        </div>
    `).join('');
}

function renderChart(dailySales) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const labels = dailySales.map(d => d.sale_date);
    const data = dailySales.map(d => Number(d.revenue));

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#1B4D2E',
                backgroundColor: 'rgba(27, 77, 46, 0.1)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderBestSellers(bestSellers) {
    const tbody = document.getElementById('bestSellersBody');
    const table = document.getElementById('bestSellersTable');
    const noMsg = document.getElementById('noSalesMsg');

    if (bestSellers.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }
    table.style.display = 'table';
    noMsg.style.display = 'none';

    tbody.innerHTML = bestSellers.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity_sold}</td>
            <td>₱${Number(item.revenue).toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
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

document.getElementById('transactionSearch').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTransactions(transactionsCache.filter(t =>
        t.cashier_name.toLowerCase().includes(term) || String(t.transaction_id).includes(term)
    ));
});

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadReport(tab.dataset.range);
    });
});

loadReport(currentRange);