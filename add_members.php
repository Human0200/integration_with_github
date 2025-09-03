<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';
$repoName = $input['repo_name'] ?? '';
$members = $input['members'] ?? [];

if (!$apiKey || !$organization || !$repoName) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных']);
    exit;
}

$result = addMembersToRepository($apiKey, $organization, $repoName, $members);
echo json_encode($result);

function addMembersToRepository($apiKey, $organization, $repoName, $members) {
    $results = [];
    $errors = [];
    
    foreach ($members as $member) {
        $member = trim($member);
        if (empty($member)) continue;
        
        $result = addCollaborator($apiKey, $organization, $repoName, $member);
        $results[$member] = $result;
        
        if (!$result['success']) {
            $errors[] = $member . ': ' . $result['message'];
        }
    }
    
    if (empty($errors)) {
        return [
            'success' => true,
            'message' => 'Все участники добавлены успешно',
            'results' => $results
        ];
    } else {
        return [
            'success' => false,
            'message' => 'Ошибки при добавлении: ' . implode(', ', $errors),
            'results' => $results
        ];
    }
}

function addCollaborator($apiKey, $organization, $repoName, $username) {
    if (empty($username)) {
        return ['success' => false, 'message' => 'Пустое имя пользователя'];
    }
    
    // Сначала проверяем, не является ли пользователь уже участником
    $checkUrl = "https://api.github.com/repos/$organization/$repoName/collaborators/$username";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $checkUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App'
    ]);
    
    $checkResponse = curl_exec($ch);
    $checkHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($checkHttpCode === 204) {
        // Пользователь уже является участником
        return ['success' => true, 'message' => 'Уже участник'];
    }
    
    // Добавляем пользователя как коллаборатора
    $addUrl = "https://api.github.com/repos/$organization/$repoName/collaborators/$username";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $addUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'permission' => 'push' // или 'pull', 'admin' в зависимости от потребностей
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 201 || $httpCode === 204) {
        return ['success' => true, 'message' => 'Добавлен успешно'];
    } else {
        $error = json_decode($response, true);
        return [
            'success' => false, 
            'message' => $error['message'] ?? "HTTP Error: $httpCode"
        ];
    }
}
?>