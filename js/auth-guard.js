const userStr = localStorage.getItem('user');

if (!userStr) {
    window.location.href = 'login.html';
} else {
    var currentUser = JSON.parse(userStr);
}