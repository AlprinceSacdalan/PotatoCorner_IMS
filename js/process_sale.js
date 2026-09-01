document.getElementById('welcomeMsg').textContent = currentUser.full_name;
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('user');
    window.location.href = '/PotatoCorner_IMS/html/login.html';
});

let menuItemsCache = [];
let cart = []; // { menu_id, name, price, quantity }

async function loadMenuItems() {
    const response = await fetch(`${API_BASE}/menu/get_menu.php`);
    const result = await response.json();
    if (!result.success) return;

    menuItemsCache = result.data.filter(item => item.status === 'available');
    renderMenuGrid(menuItemsCache);
}

function renderMenuGrid(items) {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `${item.name}<br><span class="menu-price">₱${item.price}</span>`;
        card.addEventListener('click', () => addToCart(item));
        grid.appendChild(card);
    });
}

document.getElementById('searchInput').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderMenuGrid(menuItemsCache.filter(item => item.name.toLowerCase().includes(term)));
});

function addToCart(item) {
    const existing = cart.find(c => c.menu_id === item.menu_id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ menu_id: item.menu_id, name: item.name, price: item.price, quantity: 1 });
    }
    renderOrderSummary();
}

function removeFromCart(menu_id) {
    cart = cart.filter(c => String(c.menu_id) !== String(menu_id));
    renderOrderSummary();
}

function renderOrderSummary() {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        list.innerHTML += `
            <div class="order-line">
                <span>${item.quantity}x ${item.name}</span>
                <span>₱${subtotal.toFixed(2)}
                    <button class="remove-btn" onclick="removeFromCart(${item.menu_id})">×</button>
                </span>
            </div>
        `;
    });

    document.getElementById('orderTotal').textContent = `₱${total.toFixed(2)}`;
}

loadMenuItems();

document.getElementById('confirmSaleBtn').addEventListener('click', async function() {
    const msg = document.getElementById('saleMsg');
    msg.textContent = '';

    if (cart.length === 0) {
        msg.textContent = 'Add at least one item to the order.';
        return;
    }

    const items = cart.map(c => ({ menu_id: c.menu_id, quantity: c.quantity }));

    try {
        const response = await fetch(`${API_BASE}/transactions/process_sale.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, items })
        });
        const result = await response.json();

        if (result.success) {
            alert(`Sale confirmed! Total: ₱${result.data.total_amount}`);
            cart = [];
            renderOrderSummary();
        } else {
            msg.textContent = result.message;
        }
    } catch (err) {
        msg.textContent = 'Could not connect to server. Check your connection.';
    }
});