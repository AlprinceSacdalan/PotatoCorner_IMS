document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

async function loadMaterialsDropdown() {
    const response = await fetch(`${API_BASE}/inventory/get_inventory.php`);
    const result = await response.json();
    if (!result.success) return;

    const select = document.getElementById('wasteMaterialSelect');
    select.innerHTML = '<option value="">Select material</option>';
    result.data.forEach(m => {
        select.innerHTML += `<option value="${m.material_id}">${m.name} (${m.unit})</option>`;
    });
}

async function loadWasteLog() {
    const response = await fetch(`${API_BASE}/waste/get_waste_log.php`);
    const result = await response.json();
    if (!result.success) return;

    const tbody = document.getElementById('wasteBody');
    const table = document.getElementById('wasteTable');
    const noMsg = document.getElementById('noWasteMsg');

    if (result.data.length === 0) {
        table.style.display = 'none';
        noMsg.style.display = 'block';
        return;
    }
    table.style.display = 'table';
    noMsg.style.display = 'none';

    tbody.innerHTML = result.data.map(log => `
        <tr>
            <td>${log.material_name}</td>
            <td>${log.quantity_wasted} ${log.unit}</td>
            <td>${log.reason}</td>
            <td>${log.logged_by}</td>
            <td>${log.waste_date}</td>
        </tr>
    `).join('');
}

document.getElementById('wasteReasonSelect').addEventListener('change', function(e) {
    document.getElementById('wasteReasonOther').style.display = e.target.value === 'Other' ? 'inline-block' : 'none';
});

document.getElementById('saveWasteBtn').addEventListener('click', async function() {
    const material_id = document.getElementById('wasteMaterialSelect').value;
    const quantity_wasted = document.getElementById('wasteQuantity').value;
    const reasonChoice = document.getElementById('wasteReasonSelect').value;
    const reasonOther = document.getElementById('wasteReasonOther').value.trim();
    const msg = document.getElementById('wasteMsg');
    msg.textContent = '';

    if (!material_id || !quantity_wasted || !reasonChoice) {
        msg.textContent = 'Select a material, quantity, and reason.';
        return;
    }
    if (reasonChoice === 'Other' && !reasonOther) {
        msg.textContent = 'Please specify the reason.';
        return;
    }

    const reason = reasonChoice === 'Other' ? `Other: ${reasonOther}` : reasonChoice;

    const response = await fetch(`${API_BASE}/waste/save_waste.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            material_id,
            user_id: currentUser.user_id,
            quantity_wasted,
            reason
        })
    });
    const result = await response.json();

    if (result.success) {
        document.getElementById('wasteQuantity').value = '';
        document.getElementById('wasteReasonSelect').value = '';
        document.getElementById('wasteReasonOther').value = '';
        document.getElementById('wasteReasonOther').style.display = 'none';
        loadWasteLog();
    } else {
        msg.textContent = result.message;
    }
});

loadMaterialsDropdown();
loadWasteLog();