<?php
require '../helpers/response.php';
require '../config/db_config.php';

$range = $_GET['range'] ?? 'today';

$now = new DateTime();
switch ($range) {
    case 'week':
        $start = (clone $now)->modify('monday this week')->setTime(0, 0, 0);
        break;
    case 'month':
        $start = (clone $now)->modify('first day of this month')->setTime(0, 0, 0);
        break;
    case 'today':
    default:
        $start = (clone $now)->setTime(0, 0, 0);
        break;
}
$startStr = $start->format('Y-m-d H:i:s');
$endStr = $now->format('Y-m-d H:i:s');

// Summary 
$stmt = $conn->prepare("
    SELECT COUNT(*) AS total_transactions,
           COALESCE(SUM(total_amount), 0) AS total_revenue,
           COALESCE(AVG(total_amount), 0) AS avg_order_value
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
");
$stmt->bind_param("ss", $startStr, $endStr);
$stmt->execute();
$summary = $stmt->get_result()->fetch_assoc();

// Best sellers 
$stmt = $conn->prepare("
    SELECT td.menu_id, mi.name, SUM(td.quantity) AS quantity_sold, SUM(td.subtotal) AS revenue
    FROM transaction_details td
    JOIN transactions t ON td.transaction_id = t.transaction_id
    JOIN menu_items mi ON td.menu_id = mi.menu_id
    WHERE t.transaction_date BETWEEN ? AND ?
    GROUP BY td.menu_id, mi.name
    ORDER BY quantity_sold DESC
    LIMIT 10
");
$stmt->bind_param("ss", $startStr, $endStr);
$stmt->execute();
$result = $stmt->get_result();
$bestSellers = [];
while ($row = $result->fetch_assoc()) {
    $bestSellers[] = $row;
}

// Daily sales (chart)
$stmt = $conn->prepare("
    SELECT DATE(transaction_date) AS sale_date, SUM(total_amount) AS revenue
    FROM transactions
    WHERE transaction_date BETWEEN ? AND ?
    GROUP BY DATE(transaction_date)
    ORDER BY sale_date ASC
");
$stmt->bind_param("ss", $startStr, $endStr);
$stmt->execute();
$result = $stmt->get_result();
$dailySales = [];
while ($row = $result->fetch_assoc()) {
    $dailySales[] = $row;
}

// Transaction list 
$stmt = $conn->prepare("
    SELECT t.transaction_id, t.transaction_date, t.total_amount,
           CONCAT(u.f_name, ' ', u.l_name) AS cashier_name,
           (SELECT COUNT(*) FROM transaction_details td WHERE td.transaction_id = t.transaction_id) AS item_count
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    WHERE t.transaction_date BETWEEN ? AND ?
    ORDER BY t.transaction_date DESC
");
$stmt->bind_param("ss", $startStr, $endStr);
$stmt->execute();
$result = $stmt->get_result();
$transactions = [];
while ($row = $result->fetch_assoc()) {
    $transactions[] = $row;
}

sendResponse(true, 'Sales report retrieved', [
    'range' => $range,
    'summary' => $summary,
    'best_sellers' => $bestSellers,
    'daily_sales' => $dailySales,
    'transactions' => $transactions
]);