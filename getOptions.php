<?php
// getOptions.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/crest.php';

try {
    // Получаем все настройки приложения
    $res = CRest::call('app.option.get');
    
    // Логируем запрос (опционально, для отладки)
    // file_put_contents(__DIR__ . '/getOptions.txt', 
    //     date('Y-m-d H:i:s') . ' Response: ' . json_encode($res) . PHP_EOL, 
    //     FILE_APPEND
    // );

    if (isset($res['error'])) {
        echo json_encode([
            'success' => false,
            'error'   => $res['error'],
            'message' => $res['error_description'] ?? $res['error_information'] ?? 'Bitrix error',
        ]);
        exit;
    }

    // Возвращаем настройки в формате, ожидаемом JS
    echo json_encode([
        'success' => true,
        'result'  => $res['result'] ?? []  // Все настройки приложения
    ]);
    
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}