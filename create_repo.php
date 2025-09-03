<?php
require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');
require_once 'github_api.php';

// Получаем данные
$postData = $_POST;
$groupId = json_decode($postData['PLACEMENT_OPTIONS'], true)['GROUP_ID'] ?? 0;

if ($groupId && isset($_POST['repo_name'])) {
    // Получаем настройки для группы
    $optionKey = "github_settings_" . $groupId;
    $settingsJson = COption::GetOptionString("main", $optionKey, "");
    $settings = $settingsJson ? json_decode($settingsJson, true) : [];
    
    if (empty($settings)) {
        echo json_encode(['success' => false, 'message' => 'Настройки не найдены']);
        exit;
    }
    
    // Создаем репозиторий
    $result = createRepository(
        $settings, 
        $_POST['repo_name'], 
        $_POST['repo_description'] ?? ''
    );
    
    header('Content-Type: application/json');
    echo json_encode($result);
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Не указано имя репозитория']);
}
?>