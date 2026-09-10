<?php
// Place in api/menu/get_mix_recipe.php
require '../helpers/response.php';
require '../config/db_config.php';

$menu_id = $_GET['menu_id'] ?? null;
if (!$menu_id) {
    sendResponse(false, 'menu_id is required');
}

$stmt = $conn->prepare("SELECT snack_type FROM mix_recipe WHERE menu_id = ?");
$stmt->bind_param("i", $menu_id);
$stmt->execute();
$result = $stmt->get_result();

$components = [];
while ($row = $result->fetch_assoc()) {
    $components[] = $row['snack_type'];
}

sendResponse(true, 'Mix components retrieved', $components);