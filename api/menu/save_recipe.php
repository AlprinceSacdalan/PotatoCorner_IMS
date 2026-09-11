<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$recipe_id = $input['recipe_id'] ?? null;

if ($recipe_id) {
    // Editing an existing ingredient row's quantity
    $quantity_required = $input['quantity_required'] ?? null;
    if (!$quantity_required) {
        sendResponse(false, 'quantity_required is required');
    }

    $stmt = $conn->prepare("UPDATE recipes_bom SET quantity_required = ? WHERE recipe_id = ?");
    $stmt->bind_param("di", $quantity_required, $recipe_id);
    $stmt->execute();

    sendResponse(true, 'Ingredient quantity updated');
} else {
    // Adding a new ingredient to the recipe
    $menu_id = $input['menu_id'] ?? null;
    $material_id = $input['material_id'] ?? null;
    $quantity_required = $input['quantity_required'] ?? null;

    if (!$menu_id || !$material_id || !$quantity_required) {
        sendResponse(false, 'menu_id, material_id, and quantity_required are all required');
    }

    $stmt = $conn->prepare("INSERT INTO recipes_bom (menu_id, material_id, quantity_required) VALUES (?, ?, ?)");
    $stmt->bind_param("iid", $menu_id, $material_id, $quantity_required);
    $stmt->execute();

    sendResponse(true, 'Ingredient added to recipe');
}