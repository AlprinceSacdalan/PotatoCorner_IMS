document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let lastNeedsOrdering = [];

function formatQty(value, unit) {
    return `${Number(value).toLocaleString()} ${unit}`;
}

async function loadReorderList() {
    const response = await fetch(`${API_BASE}/reorder/get_reorder_list.php`);
    const result = await response.json();
    if (!result.success) return;

    lastNeedsOrdering = result.data.needs_ordering;
    renderNeedsOrdering(lastNeedsOrdering);
    renderOrderHistory(result.data.order_history);
}

function renderNeedsOrdering(items) {
    const tbody = document.getElementById('reorderBody');
    const table = document.getElementById('reorderTable');
    const noMsg = document.getElementById('noReorderMsg');

    if (items.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }
    table.style.display = 'table';
    noMsg.style.display = 'none';

    tbody.innerHTML = items.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${formatQty(m.current_stock, m.unit)}</td>
            <td>${formatQty(m.threshold, m.unit)}</td>
            <td>
                <strong>${Number(m.reorder_purchase_qty)} ${m.purchase_unit_name}${Number(m.reorder_purchase_qty) > 1 ? 's' : ''}</strong>
                <span class="reorder-subtotal">(${formatQty(m.recommended_total, m.unit)})</span>
            </td>
            <td class="no-print">
                <button class="btn-primary btn-small" data-material="${m.material_id}">Mark as ordered</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('[data-material]').forEach(btn => {
        btn.addEventListener('click', () => markAsOrdered(btn.dataset.material));
    });
}

function renderOrderHistory(items) {
    const tbody = document.getElementById('orderHistoryBody');
    const table = document.getElementById('orderHistoryTable');
    const noMsg = document.getElementById('noHistoryMsg');

    if (items.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }
    table.style.display = 'table';
    noMsg.style.display = 'none';

    tbody.innerHTML = items.map(m => {
        const isReceived = m.status === 'received';
        const badgeClass = isReceived ? 'status-ok' : 'status-watch';
        const badgeLabel = isReceived ? 'Received' : 'Ordered';
        const actionCell = isReceived
            ? '—'
            : `<button class="btn-primary btn-small" data-reorder="${m.reorder_id}">Order Received</button>`;
        return `
            <tr>
                <td>${m.name}</td>
                <td>${Number(m.purchase_qty)} ${m.purchase_unit_name}${Number(m.purchase_qty) > 1 ? 's' : ''}</td>
                <td><span class="${badgeClass}">${badgeLabel}</span></td>
                <td>${m.ordered_date}</td>
                <td>${m.received_date ? m.received_date : '—'}</td>
                <td>${actionCell}</td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('[data-reorder]').forEach((btn, idx) => {
        const pendingItems = items.filter(i => i.status !== 'received');
        btn.addEventListener('click', () => openOrderReceivedModal(pendingItems[idx]));
    });
}

let currentReceivingOrder = null;

function openOrderReceivedModal(order) {
    currentReceivingOrder = order;
    document.getElementById('orderReceivedInfo').textContent =
        `${order.name} — ordered ${Number(order.purchase_qty)} ${order.purchase_unit_name}${Number(order.purchase_qty) > 1 ? 's' : ''} (${Number(order.quantity_ordered).toLocaleString()} ${order.unit})`;
    document.getElementById('orderReceivedStep1').classList.remove('hidden');
    document.getElementById('orderReceivedStep2').classList.add('hidden');
    document.getElementById('confirmActualQuantityBtn').classList.add('hidden');
    document.getElementById('actualQuantityInput').value = '';
    document.getElementById('actualQuantityInput').placeholder = `Actual quantity received (${order.unit})`;
    document.getElementById('orderReceivedError').textContent = '';
    document.getElementById('orderReceivedModal').classList.remove('hidden');
}

function closeOrderReceivedModal() {
    document.getElementById('orderReceivedModal').classList.add('hidden');
    currentReceivingOrder = null;
}

async function submitOrderReceived(matchesOrdered, actualQuantity) {
    const response = await fetch(`${API_BASE}/reorder/order_received.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reorder_id: currentReceivingOrder.reorder_id,
            matches_ordered: matchesOrdered,
            actual_quantity: actualQuantity
        })
    });
    const result = await response.json();

    if (result.success) {
        closeOrderReceivedModal();
        loadReorderList();
    } else {
        document.getElementById('orderReceivedError').textContent = result.message;
        document.getElementById('orderReceivedStep1').classList.add('hidden');
        document.getElementById('orderReceivedStep2').classList.remove('hidden');
        document.getElementById('confirmActualQuantityBtn').classList.remove('hidden');
    }
}

document.getElementById('orderReceivedYesBtn').addEventListener('click', () => {
    submitOrderReceived(true, null);
});

document.getElementById('orderReceivedNoBtn').addEventListener('click', () => {
    document.getElementById('orderReceivedStep1').classList.add('hidden');
    document.getElementById('orderReceivedStep2').classList.remove('hidden');
    document.getElementById('confirmActualQuantityBtn').classList.remove('hidden');
});

document.getElementById('cancelOrderReceivedBtn').addEventListener('click', closeOrderReceivedModal);

document.getElementById('confirmActualQuantityBtn').addEventListener('click', () => {
    const errorEl = document.getElementById('orderReceivedError');
    const qty = document.getElementById('actualQuantityInput').value;
    if (qty === '' || Number(qty) < 0) {
        errorEl.textContent = 'Enter a valid quantity.';
        return;
    }
    submitOrderReceived(false, qty);
});

async function markAsOrdered(materialId) {
    const response = await fetch(`${API_BASE}/reorder/mark_as_ordered.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, user_id: currentUser.user_id })
    });
    const result = await response.json();

    if (result.success) {
        loadReorderList();
    } else {
        alert(result.message);
    }
}

document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    if (lastNeedsOrdering.length === 0) {
        alert('Nothing needs ordering right now — nothing to export.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Potato Corner — Purchase Order List', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);

    const rows = lastNeedsOrdering.map(m => [
        m.name,
        formatQty(m.current_stock, m.unit),
        formatQty(m.threshold, m.unit),
        `${Number(m.reorder_purchase_qty)} ${m.purchase_unit_name}${Number(m.reorder_purchase_qty) > 1 ? 's' : ''} (${formatQty(m.recommended_total, m.unit)})`
    ]);

    doc.autoTable({
        startY: 32,
        head: [['Material', 'Current stock', 'Threshold', 'Order quantity']],
        body: rows,
        headStyles: { fillColor: [27, 77, 46] }, // Potato Corner green
        styles: { fontSize: 10 }
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    doc.save(`reorder-list-${dateStamp}.pdf`);

    document.getElementById('printDate').textContent = `Generated ${new Date().toLocaleString()}`;
    setTimeout(() => window.print(), 150);
});

loadReorderList();