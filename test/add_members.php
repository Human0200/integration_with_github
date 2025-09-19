<?php
// add_members.php

/**
 * Добавление участников в GitHub репозиторий
 * Использует GitHub REST API v3
 */

function addCollaborator($apiKey, $organization, $repoName, $username, $permission = 'push') {
    $url = "https://api.github.com/repos/{$organization}/{$repoName}/collaborators/{$username}";
    $payload = json_encode(['permission' => $permission], JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: token {$apiKey}",
            "User-Agent: Bitrix24-GitHub-App",
            "Accept: application/vnd.github+json",
            "X-GitHub-Api-Version: 2022-11-28",
            "Content-Type: application/json"
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);

    $res = json_decode($response, true);

    switch ($httpCode) {
        case 201:
            return ['success' => true, 'message' => "Приглашение для {$username} отправлено"];
        case 204:
            return ['success' => true, 'message' => "{$username} уже имеет доступ"];
        case 404:
            return ['success' => false, 'message' => "404: нет доступа к репо или пользователь {$username} не найден"];
        case 422:
            return ['success' => false, 'message' => "422: нельзя пригласить {$username} (возможно уже есть приглашение или запрещены outside collaborators)"];
        case 401:
            return ['success' => false, 'message' => "401: токен недействителен или без прав"];
        default:
            return [
                'success' => false,
                'message' => "Ошибка {$httpCode}" . ($error ? " | cURL: {$error}" : ""),
                'response' => $res
            ];
    }
}

function addMembersToRepository($apiKey, $organization, $repoName, $members) {
    $results = [];
    $ok = 0;

    foreach ($members as $m) {
        $username = trim($m);
        if ($username === '') {
            $results[] = ['user' => $m, 'success' => false, 'message' => 'Пустой логин'];
            continue;
        }

        $r = addCollaborator($apiKey, $organization, $repoName, $username, 'push');
        $r['user'] = $username;
        $results[] = $r;

        if (!empty($r['success'])) {
            $ok++;
        }
    }

    return [
        'success' => $ok > 0,
        'added'   => $ok,
        'results' => $results
    ];
}

// ===== Пример использования =====
// $apiKey        = 'ghp_xxxxxxxx'; // GitHub personal access token
// $organization  = 'my-org';       // организация/владелец
// $repoName      = 'my-repo';      // репозиторий
// $members       = ['login1', 'login2']; // логины GitHub
//
// $result = addMembersToRepository($apiKey, $organization, $repoName, $members);
// print_r($result);
?>
