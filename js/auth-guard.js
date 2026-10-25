const _fetch = window.fetch;
window.fetch = async (...args) => {
    const res = await _fetch(...args);
    if (res.status === 401) {
        localStorage.removeItem('user');
        window.location.href = '/PotatoCorner_IMS/html/login.html';
    }
    return res;
};

const userStr = localStorage.getItem('user');

if (!userStr) {
    window.location.href = 'login.html';
} else {
    var currentUser = JSON.parse(userStr);

    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const confirmed = await confirmAction(
                'Are you sure you want to log out of the inventory system?',
                'Log out?'
            );
            if (!confirmed) return;

           showLoading('Signing you out...');
           try {
             await fetch('../api/auth/logout.php', { method: 'POST' });
            } catch (e) {
            }
            localStorage.removeItem('user');
            window.location.href = '/PotatoCorner_IMS/html/login.html';
        });
    }
}