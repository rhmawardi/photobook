<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['id'])) {
    echo json_encode(['success' => false, 'error' => 'No album ID']);
    exit;
}
$id = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['id']);
$file = __DIR__ . '/' . $id . '.html';
if (file_exists($file) && unlink($file)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'File not found or cannot delete']);
}
