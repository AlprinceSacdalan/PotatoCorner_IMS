<?php
require '../helpers/response.php';
require_once '../helpers/auth.php';

start_app_session();
$_SESSION = [];
session_destroy();
sendResponse(true, 'Logged out');