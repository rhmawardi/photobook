<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['image'])) {
    echo json_encode(['success' => false, 'error' => 'No image data provided']);
    exit;
}

$imageData = $data['image'];
$prefix = preg_replace('/[^a-zA-Z0-9_\/-]/', '-', $data['prefix'] ?? 'photo');
$filename = $data['filename'] ?? null;

// Strip data URL header if present
if (strpos($imageData, 'data:') === 0) {
    $parts = explode(',', $imageData, 2);
    $imageData = $parts[1] ?? '';
}

$decoded = base64_decode($imageData);
if ($decoded === false || strlen($decoded) < 100) {
    echo json_encode(['success' => false, 'error' => 'Invalid image data']);
    exit;
}

// Ensure images directory exists
$dir = __DIR__ . '/images';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Generate filename
if ($filename) {
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '-', pathinfo($filename, PATHINFO_FILENAME));
} else {
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '-', $prefix) . '-' . time() . '-' . substr(md5(random_bytes(8)), 0, 6);
}
$safeName = substr($safeName, 0, 80);
$filepath = $dir . '/' . $safeName . '.jpg';

// Avoid overwriting — append number if exists
$counter = 0;
$basepath = $filepath;
while (file_exists($filepath)) {
    $counter++;
    $filepath = str_replace('.jpg', '-' . $counter . '.jpg', $basepath);
}

if (file_put_contents($filepath, $decoded)) {
    $relativePath = './images/' . basename($filepath);
    echo json_encode([
        'success' => true,
        'path' => $relativePath,
        'filename' => basename($filepath)
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to write file']);
}
