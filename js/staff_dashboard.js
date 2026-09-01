document.getElementById('welcomeMsg').textContent = currentUser.full_name;
document.getElementById('firstName').textContent = currentUser.full_name.split(' ')[0];

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});