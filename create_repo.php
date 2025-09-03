<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$repoName = $input['repo_name'] ?? '';
$repoDescription = $input['repo_description'] ?? '';
$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';

if (!$repoName || !$apiKey || !$organization) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных']);
    exit;
}

$result = createRepository($apiKey, $organization, $repoName, $repoDescription);
echo json_encode($result);

function createRepository($apiKey, $organization, $repoName, $repoDescription = '') {
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
        
        return [
            'success' => true, 
            'url' => $repoInfo['html_url'],
            'repo_name' => $repoInfo['name']
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