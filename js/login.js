document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    try {
        const response = await fetch(`${API_BASE}/auth/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('user', JSON.stringify(result.data));

            if (result.data.role === 'manager') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'staff_dashboard.html';
            }
        } else {
            errorMsg.textContent = result.message;
        }
    } catch (err) {
        errorMsg.textContent = 'Could not connect to server. Check your connection.';
    }
});