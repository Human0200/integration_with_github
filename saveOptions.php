<?php
// saveOptions.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/crest.php';

try {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        throw new Exception('Empty request body');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception('Invalid JSON');
    }

    // Получаем настройки из запроса
    $options = $data['options'] ?? null;
    if (!$options || !is_array($options)) {
        throw new Exception('No options provided');
    }

    // ПРАВИЛЬНЫЙ ВЫЗОВ: передаем настройки напрямую
    $res = CRest::call('app.option.set', $options);
    $res2 = Crest::call('app.option.get', []);
    //file_put_contents(__DIR__ . '/saveOptions_debug.txt', date('Y-m-d H:i:s') . ' ' . json_encode([ 'response_get' => $res2]) . PHP_EOL, FILE_APPEND);

    if (isset($res['error'])) {
        echo json_encode([
            'success' => false,
            'error'   => $res['error'],
            'message' => $res['error_description'] ?? $res['error_information'] ?? 'Bitrix error',
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'result'  => $res['result'] ?? true
    ]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}