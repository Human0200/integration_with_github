<?php
require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

// Получаем данные
$postData = $_POST;
$groupId = json_decode($postData['PLACEMENT_OPTIONS'], true)['GROUP_ID'] ?? 0;

if ($groupId && isset($_POST['settings'])) {
    $settings = [
        'api_key' => $_POST['settings']['api_key'] ?? '',
        'organization' => $_POST['settings']['organization'] ?? '',
        'members' => isset($_POST['settings']['members']) ? 
                    array_map('trim', explode(',', $_POST['settings']['members'])) : []
    ];
    
    // Сохраняем в COption
    $optionKey = "github_settings_" . $groupId;
    COption::SetOptionString("main", $optionKey, json_encode($settings));
    
    // Возвращаем JSON ответ
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Настройки сохранены']);
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Ошибка данных']);
}
?>