<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';
$projectName = $input['project_name'] ?? '';
$projectDescription = $input['project_description'] ?? '';
$groupId = $input['group_id'] ?? '';

if (!$apiKey || !$organization || !$projectName) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных']);
    exit;
}

$result = createGithubProject($apiKey, $organization, $projectName, $projectDescription, $groupId);
echo json_encode($result);

function createGithubProject($apiKey, $organization, $projectName, $projectDescription, $groupId) {
    // Получаем ID организации через GraphQL
    $orgId = getOrganizationId($apiKey, $organization);
    if (!$orgId) {
        return ['success' => false, 'message' => 'Не удалось получить ID организации'];
    }
    
    // Создаем проект с использованием правильного GraphQL API
    $query = '
    mutation($input: CreateProjectV2Input!) {
        createProjectV2(input: $input) {
            projectV2 {
                id
                title
                url
            }
        }
    }';
    
    $variables = [
        'input' => [
            'title' => $projectName,
            'ownerId' => $orgId
        ]
    ];
    
    $graphqlData = json_encode([
        'query' => $query,
        'variables' => $variables
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/graphql");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $graphqlData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: bearer ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $responseData = json_decode($response, true);
    
    if ($httpCode === 200 && isset($responseData['data']['createProjectV2']['projectV2'])) {
        $projectInfo = $responseData['data']['createProjectV2']['projectV2'];
        
        // Добавляем описание через отдельный мутатор, если нужно
        if (!empty($projectDescription)) {
            updateProjectDescription($apiKey, $projectInfo['id'], $projectDescription, $groupId);
        }
        
        return [
            'success' => true,
            'project_id' => $projectInfo['id'],
            'project_url' => $projectInfo['url'],
            'project_name' => $projectInfo['title']
        ];
    } else {
        $errorMessage = 'Неизвестная ошибка';
        if (isset($responseData['errors'][0]['message'])) {
            $errorMessage = $responseData['errors'][0]['message'];
        } elseif (isset($responseData['message'])) {
            $errorMessage = $responseData['message'];
        }
        
        return [
            'success' => false,
            'message' => 'Ошибка создания проекта: ' . $errorMessage,
            'debug' => $responseData
        ];
    }
}

function getOrganizationId($apiKey, $organization) {
    $query = '
    query($login: String!) {
        organization(login: $login) {
            id
        }
    }';
    
    $graphqlData = json_encode([
        'query' => $query,
        'variables' => ['login' => $organization]
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/graphql");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $graphqlData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: bearer ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $responseData = json_decode($response, true);
    
    if (isset($responseData['data']['organization']['id'])) {
        return $responseData['data']['organization']['id'];
    }
    
    return null;
}

function updateProjectDescription($apiKey, $projectId, $projectDescription, $groupId) {
    $fullDescription = $projectDescription . "\n\nСинхронизация с Bitrix24 группой #$groupId";
    
    $query = '
    mutation($input: UpdateProjectV2Input!) {
        updateProjectV2(input: $input) {
            projectV2 {
                id
            }
        }
    }';
    
    $variables = [
        'input' => [
            'projectId' => $projectId,
            'description' => $fullDescription
        ]
    ];
    
    $graphqlData = json_encode([
        'query' => $query,
        'variables' => $variables
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/graphql");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $graphqlData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: bearer ' . $apiKey,
        'User-Agent: Bitrix24-GitHub-App',
        'Content-Type: application/json'
    ]);
    
    curl_exec($ch);
    curl_close($ch);
}
?>