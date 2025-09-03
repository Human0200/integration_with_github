<?php
// Получаем данные от Bitrix24
$postData = $_POST;
$groupId = json_decode($postData['PLACEMENT_OPTIONS'], true)['GROUP_ID'] ?? 0;
?>

<!DOCTYPE html>
<html>
<head>
    <title>GitHub Integration</title>
    <link rel="stylesheet" href="style.css">
    <script src="//api.bitrix24.com/api/v1/"></script>
</head>
<body>
    <div class="container">
        <h2>GitHub Integration для проекта #<?= $groupId ?></h2>
        
        <!-- Форма настроек -->
        <div class="settings-section">
            <h3>Настройки GitHub</h3>
            <form id="settingsForm">
                <input type="hidden" id="groupId" value="<?= $groupId ?>">
                
                <div class="form-group">
                    <label>API ключ:</label>
                    <input type="password" id="api_key" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Организация:</label>
                    <input type="text" id="organization" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Участники (через запятую):</label>
                    <input type="text" id="members" class="form-control" placeholder="user1,user2,user3">
                </div>
                
                <button type="submit" class="btn btn-primary">Сохранить настройки</button>
            </form>
        </div>
        
        <!-- Форма создания репозитория -->
        <div class="create-section">
            <h3>Создать репозиторий</h3>
            <form id="createRepoForm">
                <div class="form-group">
                    <label>Название репозитория:</label>
                    <input type="text" id="repo_name" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Описание:</label>
                    <textarea id="repo_description" class="form-control"></textarea>
                </div>
                
                <button type="submit" class="btn btn-success">Создать репозиторий</button>
            </form>
        </div>
        
        <!-- Список участников -->
        <div class="members-section" id="membersList" style="display: none;">
            <h3>Участники проекта</h3>
            <ul id="membersListContent"></ul>
        </div>
        
        <!-- Результаты -->
        <div id="result"></div>
    </div>

    <script src="js/app.js"></script>
</body>
</html>