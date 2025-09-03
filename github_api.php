<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);
$groupId = $input['group_id'] ?? 0;
$repoName = $input['repo_name'] ?? '';
$repoDescription = $input['repo_description'] ?? '';

if (!$groupId || !$repoName) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных']);
    exit;
}

// Получаем настройки из Bitrix24 (через API)
// В реальной реализации это будет через BX24.callMethod
// Но для серверной части нам нужно получить токен и вызвать API

// Пока используем заглушку - в реальном приложении нужно получить токен
// и вызвать BX24.callMethod('app.option.get')

// Для демонстрации используем временные настройки
$settings = [
    'api_key' => $_SERVER['HTTP_X_GITHUB_TOKEN'] ?? '', // Получаем из заголовков
    'organization' => 'leadspace24', // Временно
    'members' => ['Human0200'] // Временно
];

// Создаем репозиторий (код из предыдущих примеров)
$result = createRepository($settings, $repoName, $repoDescription);
echo json_encode($result);

function createRepository($settings, $repoName, $repoDescription = '') {
    $apiKey = $settings['api_key'] ?? '';
    $organization = $settings['organization'] ?? '';
    
    if (empty($apiKey) || empty($organization)) {
        return ['success' => false, 'message' => 'Не заполнены настройки API'];
    }
    
    // Данные для создания репозитория
    $repoData = json_encode([
        'name' => $repoName,
        'description' => $repoDescription,
        'private' => false
    ]);
    
    // Создаем репозиторий
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/orgs/$organization/repos");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $repoData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 201) {
        $repoInfo = json_decode($response, true);
        
        // Добавляем участников (если нужно)
        foreach ($settings['members'] ?? [] as $member) {
            addCollaborator($apiKey, $organization, $repoName, trim($member));
        }
        
        return [
            'success' => true, 
            'url' => $repoInfo['html_url']
        ];
    } else {
        $error = json_decode($response, true);
        return [
            'success' => false, 
            'message' => $error['message'] ?? 'Ошибка создания репозитория'
        ];
    }
}

function addCollaborator($apiKey, $orgName, $repoName, $username) {
    if (empty($username)) return;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/repos/$orgName/$repoName/collaborators/$username");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App'
    ]);
    
    curl_exec($ch);
    curl_close($ch);
}
?>