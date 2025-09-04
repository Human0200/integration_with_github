<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';
$repoName = $input['repo_name'] ?? '';
$projectName = $input['project_name'] ?? '';
$projectDescription = $input['project_description'] ?? '';
$groupId = $input['group_id'] ?? '';

if (!$apiKey || !$organization || !$projectName || !$repoName) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных']);
    exit;
}

$result = createGithubProject($apiKey, $organization, $repoName, $projectName, $projectDescription, $groupId);
echo json_encode($result);

function createGithubProject($apiKey, $organization, $repoName, $projectName, $projectDescription, $groupId) {
    // Создаем проект для организации (GitHub Projects v2)
    $projectData = json_encode([
        'title' => $projectName,
        'body' => $projectDescription . "\n\nСинхронизация с Bitrix24 группой #$groupId"
    ]);
    
    // Создаем проект
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/orgs/$organization/projects");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $projectData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json',
        'Accept: application/vnd.github.v3+json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 201) {
        $projectInfo = json_decode($response, true);
        
        // Создаем базовые колонки
        $columns = ['To Do', 'In Progress', 'Done'];
        foreach ($columns as $columnName) {
            createProjectColumn($apiKey, $projectInfo['id'], $columnName);
        }
        
        return [
            'success' => true,
            'project_id' => $projectInfo['id'],
            'project_url' => $projectInfo['html_url'],
            'project_name' => $projectInfo['name']
        ];
    } else {
        // Если не получилось создать проект для организации, попробуем для репозитория
        return createRepoProject($apiKey, $organization, $repoName, $projectName, $projectDescription);
    }
}

function createRepoProject($apiKey, $organization, $repoName, $projectName, $projectDescription) {
    // Создаем проект для репозитория (старая версия Projects)
    $projectData = json_encode([
        'name' => $projectName,
        'body' => $projectDescription
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/repos/$organization/$repoName/projects");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $projectData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json',
        'Accept: application/vnd.github.inertia-preview+json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 201) {
        $projectInfo = json_decode($response, true);
        
        // Создаем базовые колонки
        $columns = ['To Do', 'In Progress', 'Done'];
        foreach ($columns as $columnName) {
            createProjectColumn($apiKey, $projectInfo['id'], $columnName);
        }
        
        return [
            'success' => true,
            'project_id' => $projectInfo['id'],
            'project_url' => $projectInfo['html_url'],
            'project_name' => $projectInfo['name']
        ];
    } else {
        $error = json_decode($response, true);
        return [
            'success' => false,
            'message' => $error['message'] ?? 'Ошибка создания проекта'
        ];
    }
}
?>