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
                
                <div class="form-group">
                    <label>Участники по умолчанию (через запятую):</label>
                    <input type="text" id="global_members" class="form-control">
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
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="new_repo_private" checked> Приватный репозиторий
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="new_repo_readme" checked> Создать README.md
                        </label>
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
        </div>
        
<!-- Интерфейс для задачи -->
<div id="taskInterface" class="task-section" style="display: none;">
    <div id="taskRepoSetup" style="display: none;">
        <h3>Настройка репозитория для задачи</h3>
        <div class="form-group">
            <label>
                <input type="radio" name="taskRepoOption" value="project" checked> Использовать репозиторий проекта
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="radio" name="taskRepoOption" value="new"> Создать новый репозиторий
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="radio" name="taskRepoOption" value="select"> Выбрать существующий репозиторий
            </label>
        </div>
        
        <!-- Использовать репозиторий проекта -->
        <div id="useProjectRepo" class="form-section">
            <h4>Репозиторий проекта</h4>
            <p>Репозиторий: <a href="#" id="projectRepoLink" target="_blank"></a></p>
            <button type="button" id="confirmProjectRepo" class="btn btn-primary">Использовать этот репозиторий</button>
        </div>
        
        <!-- Создать новый репозиторий -->
        <div id="createTaskRepo" class="form-section" style="display: none;">
            <h4>Создать новый репозиторий</h4>
            <div class="form-group">
                <label>Название репозитория:</label>
                <input type="text" id="task_repo_name" class="form-control" placeholder="task-286-feature">
            </div>
            <div class="form-group">
                <label>Описание:</label>
                <textarea id="task_repo_description" class="form-control" placeholder="Репозиторий для задачи #286"></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="task_repo_private" checked> Приватный репозиторий
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="task_repo_readme" checked> Создать README.md
                </label>
            </div>
            <div class="form-group">
                <label>Участники (через запятую):</label>
                <input type="text" id="task_repo_members" class="form-control" placeholder="user1,user2,user3">
            </div>
            <button type="button" id="createTaskRepoBtn" class="btn btn-success">Создать репозиторий</button>
        </div>
        
        <!-- Выбрать существующий репозиторий -->
        <div id="selectTaskRepo" class="form-section" style="display: none;">
            <h4>Выбрать существующий репозиторий</h4>
            <div class="form-group">
                <label>URL репозитория:</label>
                <input type="url" id="existing_task_repo_url" class="form-control" placeholder="https://github.com/org/repo">
            </div>
            <div class="form-group">
                <label>Участники (через запятую):</label>
                <input type="text" id="existing_task_repo_members" class="form-control" placeholder="user1,user2,user3">
            </div>
            <button type="button" id="selectTaskRepoBtn" class="btn btn-primary">Привязать репозиторий</button>
        </div>
    </div>
    
    <div id="taskRepo" style="display: none;">
        <h3>Репозиторий задачи</h3>
        <p>Репозиторий: <a href="#" id="taskRepoLink" target="_blank"></a></p>
        
        <div class="form-group">
            <label>Связанная ветка/issue:</label>
            <input type="text" id="task_branch" class="form-control" placeholder="feature/task-286">
            <div class="branch-actions" style="margin-top: 10px;">
                <button type="button" id="createBranchBtn" class="btn btn-sm btn-success">Создать ветку</button>
                <button type="button" id="openBranchBtn" class="btn btn-sm btn-primary" style="display: none;">Открыть ветку в GitHub</button>
            </div>
        </div>
        
        <div class="members-section">
            <h4>Участники репозитория</h4>
            <div class="form-group">
                <label>GitHub пользователи (через запятую):</label>
                <input type="text" id="task_repo_members_list" class="form-control" placeholder="user1,user2,user3">
            </div>
            <button type="button" id="updateTaskMembersBtn" class="btn btn-primary">Обновить участников</button>
            
            <div id="taskMembersList" style="display: none;">
                <h5>Текущие участники:</h5>
                <ul id="taskMembersListContent"></ul>
            </div>
        </div>
        
        <button type="button" id="updateTaskLinkBtn" class="btn btn-primary">Обновить связь</button>
        <button type="button" id="changeTaskRepo" class="btn btn-secondary">Изменить репозиторий</button>
    </div>
    
    <div id="noTaskRepo">
        <p>Репозиторий не настроен для этой задачи.</p>
        <button type="button" id="setupTaskRepo" class="btn btn-primary">Настроить репозиторий</button>
    </div>
</div>
        
        <!-- Результаты -->
        <div id="result"></div>
    </div>

    <script src="js/app.js"></script>
</body>
</html>