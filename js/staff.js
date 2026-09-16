document.getElementById('welcomeMsg').textContent = `Hi, ${currentUser.full_name}`;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let editingUserId = null;
let resettingUserId = null;

async function loadUsers() {
    const response = await fetch(`${API_BASE}/users/get_users.php`);
    const result = await response.json();
    if (!result.success) return;

    const tbody = document.getElementById('usersBody');
    tbody.innerHTML = result.data.map(u => {
        const isActive = u.status === 'active';
        return `
            <tr>
                <td>${u.f_name} ${u.l_name}</td>
                <td>${u.username}</td>
                <td>${u.role === 'manager' ? 'Manager' : 'Staff'}</td>
                <td><span class="${isActive ? 'status-ok' : 'status-low'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                <td class="menu-item-row-actions">
                    <button class="row-icon-btn" data-action="edit" title="Edit">✎</button>
                    <button class="row-icon-btn" data-action="reset" title="Reset password">⚿</button>
                    <button class="row-icon-btn" data-action="toggle" title="${isActive ? 'Deactivate' : 'Activate'}">${isActive ? '●' : '○'}</button>
                </td>
            </tr>
        `;
    }).join('');

    // Wire up action buttons (need the full user objects, so re-map by row index)
    const rows = tbody.querySelectorAll('tr');
    result.data.forEach((u, i) => {
        const row = rows[i];
        row.querySelector('[data-action="edit"]').addEventListener('click', () => openEditModal(u));
        row.querySelector('[data-action="reset"]').addEventListener('click', () => openResetModal(u));
        row.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleUserStatus(u));
    });
}

function openAddModal() {
    editingUserId = null;
    document.getElementById('userModalTitle').textContent = 'Add account';
    document.getElementById('userFirstName').value = '';
    document.getElementById('userLastName').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userRole').value = 'staff';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').style.display = 'block';
    document.getElementById('userPassword').placeholder = 'Password';
    document.getElementById('userModalError').textContent = '';
    document.getElementById('userModal').classList.remove('hidden');
}

function openEditModal(u) {
    editingUserId = u.user_id;
    document.getElementById('userModalTitle').textContent = 'Edit account';
    document.getElementById('userFirstName').value = u.f_name;
    document.getElementById('userLastName').value = u.l_name;
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userRole').value = u.role;
    document.getElementById('userPassword').style.display = 'none'; // password not editable here
    document.getElementById('userModalError').textContent = '';
    document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    editingUserId = null;
}

document.getElementById('addUserBtn').addEventListener('click', openAddModal);
document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);

document.getElementById('saveUserBtn').addEventListener('click', async function() {
    const f_name = document.getElementById('userFirstName').value.trim();
    const l_name = document.getElementById('userLastName').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    const errorEl = document.getElementById('userModalError');
    errorEl.textContent = '';

    if (!f_name || !l_name || !username) {
        errorEl.textContent = 'First name, last name, and username are required.';
        return;
    }
    if (!editingUserId && !password) {
        errorEl.textContent = 'Password is required for a new account.';
        return;
    }

    const payload = { f_name, l_name, username, role };
    if (editingUserId) {
        payload.user_id = editingUserId;
    } else {
        payload.password = password;
    }

    const response = await fetch(`${API_BASE}/users/save_user.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.success) {
        closeUserModal();
        loadUsers();
    } else {
        errorEl.textContent = result.message;
    }
});

function openResetModal(u) {
    resettingUserId = u.user_id;
    document.getElementById('resetPasswordFor').textContent = `For: ${u.f_name} ${u.l_name} (${u.username})`;
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('resetPasswordError').textContent = '';
    document.getElementById('resetPasswordModal').classList.remove('hidden');
}

document.getElementById('cancelResetBtn').addEventListener('click', () => {
    document.getElementById('resetPasswordModal').classList.add('hidden');
    resettingUserId = null;
});

document.getElementById('confirmResetBtn').addEventListener('click', async function() {
    const new_password = document.getElementById('newPasswordInput').value;
    const errorEl = document.getElementById('resetPasswordError');
    errorEl.textContent = '';

    if (new_password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
    }

    const response = await fetch(`${API_BASE}/users/reset_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: resettingUserId, new_password })
    });
    const result = await response.json();

    if (result.success) {
        document.getElementById('resetPasswordModal').classList.add('hidden');
        resettingUserId = null;
    } else {
        errorEl.textContent = result.message;
    }
});

async function toggleUserStatus(u) {
    const isActive = u.status === 'active';
    const confirmMsg = isActive
        ? `Deactivate ${u.f_name} ${u.l_name}? They won't be able to log in.`
        : `Reactivate ${u.f_name} ${u.l_name}?`;
    if (!confirm(confirmMsg)) return;

    const response = await fetch(`${API_BASE}/users/toggle_user_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.user_id })
    });
    const result = await response.json();

    if (result.success) {
        loadUsers();
    } else {
        alert(result.message);
    }
}

loadUsers();