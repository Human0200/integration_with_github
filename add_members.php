<?php
header('Content-Type: application/json');

// Read JSON input
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);

// Debug flag
$debug = isset($input['debug']) ? (bool)$input['debug'] : false;

// ------------- Normalizers -------------
function normalizeOwner($ownerRaw) {
    $s = trim((string)$ownerRaw);
    if ($s === '') return $s;
    // Allow full URL or SSH form
    // https://github.com/owner
    if (preg_match('~github\.com/([^/]+)~i', $s, $m)) {
        $s = $m[1];
    }
    // Remove trailing .git just in case (rare for owner)
    $s = preg_replace('~\.git$~i', '', $s);
    // Trim any slashes
    $s = trim($s, "/\t\n\r\0\x0B ");
    return $s;
}

function normalizeRepo($repoRaw) {
    $s = trim((string)$repoRaw);
    if ($s === '') return $s;
    // if full HTTPS URL: https://github.com/owner/repo(.git)?
    if (preg_match('~https?://github\.com/[^/]+/([^/?#]+)~i', $s, $m)) {
        $s = $m[1];
    }
    // if SSH URL: git@github.com:owner/repo(.git)?
    if (preg_match('~git@github\.com:[^/]+/([^/]+)~i', $s, $m)) {
        $s = $m[1];
    }
    // if provided as owner/repo -> take last segment
    if (strpos($s, '/') !== false) {
        $parts = explode('/', $s);
        $s = end($parts);
    }
    // strip trailing slashes
    $s = rtrim($s, '/');
    // strip .git suffix (case-insensitive)
    $s = preg_replace('~\.git$~i', '', $s);
    // final trim
    $s = trim($s);
    return $s;
}

// Inputs (support both owner and organization)
$apiKey       = trim((string)($input['api_key'] ?? ''));
$ownerParam   = trim((string)($input['owner'] ?? ''));
$orgParam     = trim((string)($input['organization'] ?? ''));
$owner        = normalizeOwner($ownerParam !== '' ? $ownerParam : $orgParam);
$repoName     = normalizeRepo($input['repo_name'] ?? '');
$members      = $input['members'] ?? [];
$permission   = $input['permission'] ?? 'push'; // pull|triage|push|maintain|admin

if ($apiKey === '' || $owner === '' || $repoName === '') {
    echo json_encode([
        'success' => false,
        'message' => 'Не хватает данных: api_key, owner/organization, repo_name',
        'debug'   => $debug ? ['input_raw' => $inputRaw] : null
    ]);
    exit;
}

if (!is_array($members)) $members = [$members];
if (empty($members)) {
    echo json_encode(['success' => true, 'message' => 'Нет участников для добавления', 'results' => [], 'normalized'=>['owner'=>$owner,'repo'=>$repoName]]);
    exit;
}

$result = addMembersToRepository($apiKey, $owner, $repoName, $members, $permission, $debug);
if ($debug) $result['normalized'] = ['owner'=>$owner,'repo'=>$repoName];
echo json_encode($result);

// ---------------- Helpers ----------------

function curlHeaders($apiKey) {
    return [
        "Authorization: Bearer {$apiKey}",
        "Accept: application/vnd.github+json",
        "X-GitHub-Api-Version: 2022-11-28",
        "User-Agent: Bitrix24-GitHub-App"
    ];
}

function ghGet($apiKey, $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => curlHeaders($apiKey),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);
    return [$httpCode, $response, $error];
}

function ghPutJson($apiKey, $url, $json) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PUT',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS     => $json,
        CURLOPT_HTTPHEADER     => array_merge(curlHeaders($apiKey), ["Content-Type: application/json"]),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);
    return [$httpCode, $response, $error];
}

/**
 * Check if user is already a collaborator.
 * GET /repos/{owner}/{repo}/collaborators/{username} -> 204 yes, 404 no.
 */
function isAlreadyCollaborator($apiKey, $owner, $repo, $username) {
    $ownerEnc = rawurlencode($owner);
    $repoEnc  = rawurlencode($repo);
    $userEnc  = rawurlencode($username);
    $url = "https://api.github.com/repos/{$ownerEnc}/{$repoEnc}/collaborators/{$userEnc}";
    list($code, $body,) = ghGet($apiKey, $url);
    return $code === 204;
}

/**
 * Try to detect pending invitation for username.
 * GET /repos/{owner}/{repo}/invitations (admin required) and match invitee.login
 */
function hasPendingInvitation($apiKey, $owner, $repo, $username, $debug=false) {
    $ownerEnc = rawurlencode($owner);
    $repoEnc  = rawurlencode($repo);
    $url = "https://api.github.com/repos/{$ownerEnc}/{$repoEnc}/invitations";
    list($code, $body, $err) = ghGet($apiKey, $url);
    if ($code !== 200) {
        return [false, $debug ? ['code'=>$code,'err'=>$err,'body'=>$body] : null];
    }
    $list = json_decode($body, true);
    if (!is_array($list)) return [false, null];
    foreach ($list as $inv) {
        if (!empty($inv['invitee']['login']) && strcasecmp($inv['invitee']['login'], $username) === 0) {
            return [true, null];
        }
    }
    return [false, null];
}

// --------------- Core ---------------------

function addMembersToRepository($apiKey, $owner, $repoName, $members, $permission = 'push', $debug = false) {
    $results = [];
    $ok = 0;

    foreach ($members as $m) {
        $username = trim((string)$m);

        if ($username === '') {
            $row = ['user' => $m, 'success' => false, 'status'=>'empty', 'message' => 'Пустой логин'];
            $results[] = $row;
            continue;
        }
        if (!preg_match('~^[A-Za-z0-9-]+$~', $username)) {
            $row = ['user' => $m, 'success' => false, 'status'=>'invalid', 'message' => 'Невалидный логин GitHub'];
            $results[] = $row;
            continue;
        }

        // 1) Pre-check collaborator
        if (isAlreadyCollaborator($apiKey, $owner, $repoName, $username)) {
            $row = ['user'=>$username, 'success'=>true, 'status'=>'already', 'message'=>"$username уже имеет доступ"];
            if ($debug) $row['debug'] = ['precheck'=>'collaborator=YES'];
            $results[] = $row;
            $ok++;
            continue;
        }

        // 2) PUT invite
        $r = addCollaborator($apiKey, $owner, $repoName, $username, $permission, $debug);
        $r['user'] = $username;
        $results[] = $r;
        if (!empty($r['success'])) $ok++;
    }

    return ['success' => $ok > 0, 'added' => $ok, 'results' => $results];
}

function addCollaborator($apiKey, $owner, $repoName, $username, $permission = 'push', $debug = false) {
    $ownerEnc = rawurlencode($owner);
    $repoEnc  = rawurlencode($repoName);
    $userEnc  = rawurlencode($username);
    $url = "https://api.github.com/repos/{$ownerEnc}/{$repoEnc}/collaborators/{$userEnc}";
    $payload = json_encode(['permission' => $permission], JSON_UNESCAPED_SLASHES);

    list($httpCode, $response, $error) = ghPutJson($apiKey, $url, $payload);
    $res = json_decode($response, true);

    $dbg = $debug ? [
        'request_url' => $url,
        'owner'       => $owner,
        'repo'        => $repoName,
        'username'    => $username,
        'payload'     => $payload,
        'http_code'   => $httpCode,
        'response'    => $res,
        'curl_error'  => $error
    ] : null;

    if ($httpCode === 201) {
        $out = ['success'=>true,'status'=>'invited','message'=>"Приглашение для {$username} отправлено"];
        if ($dbg) $out['debug'] = $dbg;
        return $out;
    }
    if ($httpCode === 204) {
        $out = ['success'=>true,'status'=>'already','message'=>"{$username} уже имеет доступ"];
        if ($dbg) $out['debug'] = $dbg;
        return $out;
    }
    if ($httpCode === 422) {
        // Possibly an existing pending invite or policy issue; try to detect pending
        list($pending, $pdbg) = hasPendingInvitation($apiKey, $owner, $repoName, $username, $debug);
        if ($pending) {
            $out = ['success'=>true,'status'=>'pending','message'=>"Приглашение для {$username} уже отправлено и ожидает принятия"];
            if ($dbg) { $out['debug'] = $dbg; $out['debug']['pending_check'] = 'YES'; }
            return $out;
        }
        $detail = isset($res['errors'][0]['message']) ? $res['errors'][0]['message'] : ($res['message'] ?? '');
        $out = ['success'=>false,'status'=>'unprocessable','message'=>"422: нельзя пригласить {$username}" . ($detail ? " | {$detail}" : '')];
        if ($dbg) { $out['debug'] = $dbg; if ($pdbg) $out['debug']['pending_check'] = $pdbg; }
        return $out;
    }
    if ($httpCode === 404) {
        $detail = $res['message'] ?? 'Not Found';
        $out = ['success'=>false,'status'=>'not_found','message'=>"404: нет доступа к репозиторию, репозиторий не найден, или пользователь {$username} не существует | {$detail}"];
        if ($dbg) $out['debug'] = $dbg;
        return $out;
    }
    if ($httpCode === 401) {
        $out = ['success'=>false,'status'=>'unauthorized','message'=>"401: токен недействителен или не имеет нужных прав"];
        if ($dbg) $out['debug'] = $dbg;
        return $out;
    }
    if ($httpCode === 403) {
        $detail = $res['message'] ?? '';
        $out = ['success'=>false,'status'=>'forbidden','message'=>"403: операция запрещена" . ($detail ? " | {$detail}" : '')];
        if ($dbg) $out['debug'] = $dbg;
        return $out;
    }

    $out = ['success'=>false,'status'=>'error','message'=>"Ошибка {$httpCode}" . ($error ? " | cURL: {$error}" : ''), 'response'=>$res];
    if ($dbg) $out['debug'] = $dbg;
    return $out;
}
?>