<?php
// fieldsGet.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/crest.php';   // внутри crest.php сам подключает defines.php, как у тебя

try {
    // опционально принимаем JSON c параметрами (order, filter и т.д.)
    $raw   = file_get_contents('php://input');
    $input = $raw ? json_decode($raw, true) : [];

    $order  = isset($input['order'])  && is_array($input['order'])  ? $input['order']  : ['ID' => 'desc'];
    $filter = isset($input['filter']) && is_array($input['filter']) ? $input['filter'] : [];

    $res = CRest::call('user.userfield.list', [
        'order'  => $order,
        'filter' => $filter,
    ]);

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
        'result'  => $res['result'] ?? [],
        'total'   => $res['total'] ?? null,
    ]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
