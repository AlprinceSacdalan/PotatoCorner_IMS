<?php
require '../helpers/response.php';
require '../config/db_config.php';

$result = $conn->query("SELECT menu_id, name, price, status, size_name FROM menu_items ORDER BY name");

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

sendResponse(true, 'Menu items retrieved', $items);