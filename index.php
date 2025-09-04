<?php
// Получаем данные от Bitrix24
$postData = $_POST;
$placement = $postData['PLACEMENT'] ?? '';
$placementOptions = json_decode($postData['PLACEMENT_OPTIONS'] ?? '{}', true);

// Определяем контекст
$context = [
    'type' => 'settings', // по умолчанию настройки
    'id' => null,
    'title' => 'Настройки GitHub'
];

if ($placement === 'SONET_GROUP_DETAIL_TAB' && isset($placementOptions['GROUP_ID'])) {
    $context = [
        'type' => 'project',
        'id' => $placementOptions['GROUP_ID'],
        'title' => 'GitHub для проекта #' . $placementOptions['GROUP_ID']
    ];
} elseif ($placement === 'TASK_VIEW_TAB' && isset($placementOptions['taskId'])) {
    $context = [
        'type' => 'task',
        'id' => $placementOptions['taskId'],
        'title' => 'GitHub для задачи #' . $placementOptions['taskId']
    ];
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>GitHub Integration</title>
    <link rel="stylesheet" href="styles.css">
    <script src="//api.bitrix24.com/api/v1/"></script>
</head>
<body>
    <div class="container">
        <h2><?= htmlspecialchars($context['title']) ?></h2>
        
        <input type="hidden" id="contextType" value="<?= $context['type'] ?>">
        <input type="hidden" id="contextId" value="<?= $context['id'] ?>">
        
        <!-- Настройки приложения (глобальные) -->
        <div id="globalSettings" class="settings-section" style="display: none;">
            <h3>Глобальные настройки GitHub</h3>
            <form id="globalSettingsForm">
                <div class="form-group">
                    <label>API ключ GitHub:</label>
                    <input type="password" id="global_api_key" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Организация по умолчанию:</label>
                    <input type="text" id="global_organization" class="form-control">
                </div>
                
                <button type="submit" class="btn btn-primary">Сохранить глобальные настройки</button>
            </form>
        </div>
        
        <!-- Интерфейс для проекта -->
        <div id="projectInterface" class="project-section" style="display: none;">
            <!-- Выбор/создание репозитория -->
            <div class="repo-section">
                <h3>Репозиторий проекта</h3>
                <div id="currentRepo" style="display: none;">
                    <p>Текущий репозиторий: <a href="#" id="repoLink" target="_blank"></a></p>
                    <button type="button" id="changeRepo" class="btn btn-secondary">Изменить репозиторий</button>
                </div>
                
                <div id="repoSelector">
                    <div class="form-group">
                        <label>
                            <input type="radio" name="repoAction" value="create" checked> Создать новый репозиторий
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="repoAction" value="select"> Выбрать существующий
                        </label>
                    </div>
                </div>
                
                <!-- Создание нового репозитория -->
                <div id="createRepoForm" class="form-section">
                    <h4>Создать репозиторий</h4>
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" id="new_repo_name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea id="new_repo_description" class="form-control"></textarea>
                    </div>
                    <button type="button" id="createRepoBtn" class="btn btn-success">Создать репозиторий</button>
                </div>
                
                <!-- Выбор существующего репозитория -->
                <div id="selectRepoForm" class="form-section" style="display: none;">
                    <h4>Выбрать репозиторий</h4>
                    <div class="form-group">
                        <label>URL репозитория:</label>
                        <input type="url" id="existing_repo_url" class="form-control" placeholder="https://github.com/org/repo">
                    </div>
                    <button type="button" id="selectRepoBtn" class="btn btn-primary">Привязать репозиторий</button>
                </div>
            </div>
            
            <!-- Участники -->
            <div id="membersSection" class="members-section" style="display: none;">
                <h3>Участники репозитория</h3>
                <div class="form-group">
                    <label>GitHub пользователи (через запятую):</label>
                    <input type="text" id="repo_members" class="form-control" placeholder="user1,user2,user3">
                </div>
                <button type="button" id="updateMembersBtn" class="btn btn-primary">Обновить участников</button>
                
                <div id="membersList" style="display: none;">
                    <h4>Текущие участники:</h4>
                    <ul id="membersListContent"></ul>
                </div>
            </div>
            
            <!-- GitHub Project -->
            <div id="githubProjectSection" class="project-board-section" style="display: none;">
                <h3>GitHub Project</h3>
                <div id="currentProject" style="display: none;">
                    <p>GitHub Project: <a href="#" id="projectLink" target="_blank"></a></p>
                </div>
                
                <div id="createProjectForm">
                    <div class="form-group">
                        <label>Название проекта:</label>
                        <input type="text" id="github_project_name" class="form-control" placeholder="Название проекта на GitHub">
                    </div>
                    <div class="form-group">
                        <label>Описание проекта:</label>
                        <textarea id="github_project_description" class="form-control" placeholder="Описание проекта"></textarea>
                    </div>
                    <button type="button" id="createGithubProjectBtn" class="btn btn-success">Создать GitHub Project</button>
                </div>
            </div>
        </div>
        
        <!-- Интерфейс для задачи -->
        <div id="taskInterface" class="task-section" style="display: none;">
            <div id="taskRepo" style="display: none;">
                <p>Репозиторий: <a href="#" id="taskRepoLink" target="_blank"></a></p>
                <div class="form-group">
                    <label>Связанная ветка/issue:</label>
                    <input type="text" id="task_branch" class="form-control" placeholder="feature/task-286">
                </div>
                <button type="button" id="updateTaskLinkBtn" class="btn btn-primary">Обновить связь</button>
            </div>
            
            <div id="noTaskRepo">
                <p>Репозиторий не настроен для проекта этой задачи.</p>
                <p>Сначала настройте репозиторий в проекте.</p>
            </div>
        </div>
        
        <!-- Результаты -->
        <div id="result"></div>
    </div>

    <script src="js/app.js"></script>
</body>
</html>