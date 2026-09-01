<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$items = $input['items'] ?? null; // array of { menu_id, quantity }

if (!$user_id || !$items || count($items) === 0) {
    sendResponse(false, 'user_id and at least one item are required');
}

$conn->begin_transaction();

try {
    // check stock availability sa database kada every ingredient across all items first
    foreach ($items as $item) {
        $stmt = $conn->prepare("
            SELECT rm.material_id, rm.name, rm.current_stock, rb.quantity_required
            FROM recipes_bom rb
            JOIN raw_materials rm ON rb.material_id = rm.material_id
            WHERE rb.menu_id = ?
        ");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($ingredient = $result->fetch_assoc()) {
            $needed = $ingredient['quantity_required'] * $item['quantity'];
            if ($ingredient['current_stock'] < $needed) {
                throw new Exception("Insufficient stock: {$ingredient['name']}");
            }
        }
    }

    // kunin at calculate menu prices and  total
    $total_amount = 0;
    $lineItems = [];
    foreach ($items as $item) {
        $stmt = $conn->prepare("SELECT price FROM menu_items WHERE menu_id = ?");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $menuResult = $stmt->get_result()->fetch_assoc();

        $subtotal = $menuResult['price'] * $item['quantity'];
        $total_amount += $subtotal;
        $lineItems[] = ['menu_id' => $item['menu_id'], 'quantity' => $item['quantity'], 'subtotal' => $subtotal];
    }

    // insert the transaction header
    $stmt = $conn->prepare("INSERT INTO transactions (user_id, total_amount) VALUES (?, ?)");
    $stmt->bind_param("id", $user_id, $total_amount);
    $stmt->execute();
    $transaction_id = $stmt->insert_id;

    // mag insert ng each line item at deduct ingredients
    foreach ($lineItems as $line) {
        $stmt = $conn->prepare("INSERT INTO transaction_details (transaction_id, menu_id, quantity, subtotal) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("iiid", $transaction_id, $line['menu_id'], $line['quantity'], $line['subtotal']);
        $stmt->execute();

        $stmt = $conn->prepare("
            SELECT material_id, quantity_required FROM recipes_bom WHERE menu_id = ?
        ");
        $stmt->bind_param("i", $line['menu_id']);
        $stmt->execute();
        $ingredients = $stmt->get_result();

        while ($ing = $ingredients->fetch_assoc()) {
            $deduct = $ing['quantity_required'] * $line['quantity'];
            $stmt2 = $conn->prepare("UPDATE raw_materials SET current_stock = current_stock - ? WHERE material_id = ?");
            $stmt2->bind_param("di", $deduct, $ing['material_id']);
            $stmt2->execute();
        }
    }

    $conn->commit();
    sendResponse(true, 'Sale recorded', ['transaction_id' => $transaction_id, 'total_amount' => $total_amount]);

} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}