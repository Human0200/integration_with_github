<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';
$repoName = $input['repo_name'] ?? '';
$members = $input['members'] ?? [];

if (!$apiKey || !$organization || !$repoName) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных для добавления участников']);
    exit;
}

if (empty($members)) {
    echo json_encode(['success' => true, 'message' => 'Нет участников для добавления']);
    exit;
}

$result = addMembersToRepository($apiKey, $organization, $repoName, $members);
echo json_encode($result);

function addMembersToRepository($apiKey, $organization, $repoName, $members) {
    $results = [];
    $errors = [];
    $successCount = 0;
    
    foreach ($members as $member) {
        $member = trim($member);
        if (empty($member)) continue;
        
        $result = addCollaborator($apiKey, $organization, $repoName, $member);
        $results[$member] = $result;
        
        if ($result['success']) {
            $successCount++;
        } else {
            $errors[] = $member . ': ' . $result['message'];
        }
    }
    
    if (empty($errors)) {
        return [
            'success' => true,
            'message' => "Успешно добавлено участников: $successCount из " . count($members),
            'results' => $results,
            'added_count' => $successCount
        ];
    } else {
        return [
            'success' => $successCount > 0,
            'message' => "Добавлено: $successCount из " . count($members) . '. Ошибки: ' . implode(', ', $errors),
            'results' => $results,
            'added_count' => $successCount,
            'errors' => $errors
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
    $error = curl_error($ch);
    curl_close($ch);
    
    // Добавляем отладочную информацию
    error_log("Add collaborator response for $username: HTTP $httpCode, Response: $response, Error: $error");
    
    if ($httpCode === 201 || $httpCode === 204) {
        return ['success' => true, 'message' => 'Добавлен успешно'];
    } else {
        $errorData = json_decode($response, true);
        $errorMessage = $errorData['message'] ?? "HTTP Error: $httpCode";
        if ($error) {
            $errorMessage .= " | cURL Error: $error";
        }
        return [
            'success' => false, 
            'message' => $errorMessage
        ];
    }
}
?>