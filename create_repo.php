<?php
header('Content-Type: application/json');

// Получаем данные
$input = json_decode(file_get_contents('php://input'), true);

$repoName = $input['repo_name'] ?? '';
$repoDescription = $input['repo_description'] ?? '';
$apiKey = $input['api_key'] ?? '';
$organization = $input['organization'] ?? '';
$isPrivate = $input['private'] ?? true;
$withReadme = $input['readme'] ?? true;

// Добавляем отладочную информацию
error_log("Create repo request: " . json_encode($input));

if (!$repoName || !$apiKey || !$organization) {
    echo json_encode(['success' => false, 'message' => 'Не хватает данных: имя репозитория=' . $repoName . ', API ключ=' . ($apiKey ? 'есть' : 'нет') . ', организация=' . $organization]);
    exit;
}

// Функция для транслитерации русского текста
function transliterate($text) {
    $translit = array(
        'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D',
        'Е' => 'E', 'Ё' => 'Yo', 'Ж' => 'Zh', 'З' => 'Z', 'И' => 'I',
        'Й' => 'Y', 'К' => 'K', 'Л' => 'L', 'М' => 'M', 'Н' => 'N',
        'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T',
        'У' => 'U', 'Ф' => 'F', 'Х' => 'H', 'Ц' => 'Ts', 'Ч' => 'Ch',
        'Ш' => 'Sh', 'Щ' => 'Sch', 'Ъ' => '', 'Ы' => 'Y', 'Ь' => '',
        'Э' => 'E', 'Ю' => 'Yu', 'Я' => 'Ya',
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd',
        'е' => 'e', 'ё' => 'yo', 'ж' => 'zh', 'з' => 'z', 'и' => 'i',
        'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n',
        'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
        'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch',
        'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
        'э' => 'e', 'ю' => 'yu', 'я' => 'ya'
    );
    
    return strtr($text, $translit);
}

// Очищаем имя репозитория
$repoName = trim($repoName);

// Транслитерируем русский текст
$repoName = transliterate($repoName);

// Заменяем пробелы на дефисы
$repoName = str_replace(' ', '-', $repoName);

// Удаляем недопустимые символы, оставляем только буквы, цифры, дефисы и подчеркивания
$repoName = preg_replace('/[^a-zA-Z0-9\-_]/', '', $repoName);

// Заменяем множественные дефисы на один
$repoName = preg_replace('/\-+/', '-', $repoName);

// Убираем дефисы в начале и конце
$repoName = trim($repoName, '-');

// Если имя пустое, генерируем имя по умолчанию
if (empty($repoName)) {
    $repoName = 'repo-' . date('Y-m-d-H-i-s');
}

// Ограничиваем длину имени (GitHub ограничивает 100 символов)
$repoName = substr($repoName, 0, 100);

error_log("Cleaned repo name: " . $repoName);

$result = createRepository($apiKey, $organization, $repoName, $repoDescription, $isPrivate, $withReadme);
echo json_encode($result);

function createRepository($apiKey, $organization, $repoName, $repoDescription = '', $isPrivate = true, $withReadme = true) {
    // Данные для создания репозитория
    $repoData = json_encode([
        'name' => $repoName,
        'description' => $repoDescription,
        'private' => (bool)$isPrivate,
        'auto_init' => (bool)$withReadme,
        'gitignore_template' => ''
    ]);
    
    error_log("Sending repo  " . $repoData);
    
    // Создаем репозиторий
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/orgs/" . urlencode($organization) . "/repos");
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
    $error = curl_error($ch);
    curl_close($ch);
    
    error_log("Create repo response: HTTP $httpCode, Response: $response, Error: $error");
    
    if ($httpCode === 201) {
        $repoInfo = json_decode($response, true);
        
        return [
            'success' => true, 
            'url' => $repoInfo['html_url'],
            'repo_name' => $repoInfo['name']
        ];
    } else {
        $errorData = json_decode($response, true);
        $errorMessage = $errorData['message'] ?? 'Ошибка создания репозитория';
        if ($error) {
            $errorMessage .= " | cURL Error: $error";
        }
        return [
            'success' => false, 
            'message' => $errorMessage . " (HTTP: $httpCode)"
        ];
    }
}
?>