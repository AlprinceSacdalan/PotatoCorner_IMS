<?php
require '../helpers/response.php';
require '../config/db_config.php';
require_once '../helpers/auth.php';
require_manager();

$input = json_decode(file_get_contents('php://input'), true);
$recipe_id = $input['recipe_id'] ?? null;

if (!$recipe_id) {
    sendResponse(false, 'recipe_id is required');
}

$stmt = $conn->prepare("DELETE FROM recipes_bom WHERE recipe_id = ?");
$stmt->bind_param("i", $recipe_id);
$stmt->execute();

sendResponse(true, 'Ingredient removed from recipe');