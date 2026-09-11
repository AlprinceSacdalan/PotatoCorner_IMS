<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$menu_id = $input['menu_id'] ?? null;
$name = trim($input['name'] ?? '');
$price = $input['price'] ?? null;

if ($name === '' || !$price) {
    sendResponse(false, 'Name and price are required');
}

if ($menu_id) {
    // Editing an existing item
    $stmt = $conn->prepare("UPDATE menu_items SET name = ?, price = ? WHERE menu_id = ?");
    $stmt->bind_param("sdi", $name, $price, $menu_id);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        $check = $conn->prepare("SELECT menu_id FROM menu_items WHERE menu_id = ?");
        $check->bind_param("i", $menu_id);
        $check->execute();
        if ($check->get_result()->num_rows === 0) {
            sendResponse(false, 'Menu item not found');
        }
    }

    sendResponse(true, 'Menu item updated', ['menu_id' => $menu_id]);
} else {
    // Creating a new item
    $stmt = $conn->prepare("INSERT INTO menu_items (name, price) VALUES (?, ?)");
    $stmt->bind_param("sd", $name, $price);
    $stmt->execute();

    sendResponse(true, 'Menu item created', ['menu_id' => $stmt->insert_id]);
}