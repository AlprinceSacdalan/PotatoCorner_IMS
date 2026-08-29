<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$price = $input['price'] ?? null;

if ($name === '' || !$price) {
    sendResponse(false, 'Name and price are required');
}

$stmt = $conn->prepare("INSERT INTO menu_items (name, price) VALUES (?, ?)");
$stmt->bind_param("sd", $name, $price);
$stmt->execute();

sendResponse(true, 'Menu item created', ['menu_id' => $stmt->insert_id]);