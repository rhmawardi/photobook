<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id']) || !isset($data['title'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit;
}

$id = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['id']);
$title = htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8');
$date = htmlspecialchars($data['date'] ?? '', ENT_QUOTES, 'UTF-8');
$description = htmlspecialchars($data['description'] ?? '', ENT_QUOTES, 'UTF-8');

$filename = $id . '.html';

if (file_exists($filename)) {
    echo json_encode(['success' => false, 'error' => 'File already exists']);
    exit;
}

$template = file_get_contents('album-template.html');
if (!$template) {
    echo json_encode(['success' => false, 'error' => 'Template not found']);
    exit;
}

$template = str_replace('{{TITLE}}', $title, $template);
$template = str_replace('{{DATE}}', $date, $template);
$template = str_replace('{{DESCRIPTION}}', $description, $template);

if (file_put_contents($filename, $template)) {
    echo json_encode(['success' => true, 'url' => $filename]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to write file']);
}
