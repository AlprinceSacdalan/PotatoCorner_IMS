<?php
require '../helpers/response.php';
require '../config/db_config.php';

$menu_id = $_GET['menu_id'] ?? null;
if (!$menu_id) {
    sendResponse(false, 'menu_id is required');
}

$stmt = $conn->prepare("
    SELECT rb.recipe_id, rb.material_id, rm.name, rm.unit, rb.quantity_required
    FROM recipes_bom rb
    JOIN raw_materials rm ON rb.material_id = rm.material_id
    WHERE rb.menu_id = ?
");
$stmt->bind_param("i", $menu_id);
$stmt->execute();
$result = $stmt->get_result();

$ingredients = [];
while ($row = $result->fetch_assoc()) {
    $ingredients[] = $row;
}

sendResponse(true, 'Recipe retrieved', $ingredients);