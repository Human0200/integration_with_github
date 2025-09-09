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
    <style>
        /* Стили для вкладок */
        .tabs {
            display: flex;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }

        .tab-button {
            padding: 8px 16px;
            cursor: pointer;
            background-color: #f1f1f1;
            border: 1px solid #ccc;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            margin-right: 2px;
            font-size: 14px;
        }

        .tab-button.active {
            background-color: #007bff;
            color: white;
        }

        .tab-button-task, .tab-button-task-existing, .tab-button-task-members {
            padding: 8px 16px;
            cursor: pointer;
            background-color: #f1f1f1;
            border: 1px solid #ccc;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            margin-right: 2px;
            font-size: 14px;
        }

        .tab-button-task.active, .tab-button-task-existing.active, .tab-button-task-members.active {
            background-color: #007bff;
            color: white;
        }

        .tab-content, .tab-content-task, .tab-content-task-existing, .tab-content-task-members {
            display: none;
            padding: 15px;
            border: 1px solid #ccc;
            border-top: none;
            border-radius: 0 0 4px 4px;
        }

        .tab-content.active, .tab-content-task.active, .tab-content-task-existing.active, .tab-content-task-members.active {
            display: block;
        }

        .selected-users-list {
            margin-top: 5px;
            padding: 5px;
            min-height: 20px;
            background-color: #f9f9f9;
            border: 1px dashed #ccc;
            border-radius: 4px;
        }
        .selected-users-list:empty::before {
            content: "Пока нет выбранных пользователей";
            color: #999;
        }
        
        .users-selector-container {
            margin-top: 5px;
        }
        
        .users-selector-container select {
            width: 100%;
            max-width: 100%;
        }
    </style>
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
                
                <!-- Вкладки для выбора способа добавления -->
                <div class="tabs">
                    <button class="tab-button active" data-tab="members-text-tab-project">Через запятую</button>
                    <button class="tab-button" data-tab="members-selector-tab-project">Выбор пользователей</button>
                </div>

                <!-- Ввод через запятую -->
                <div id="members-text-tab-project" class="tab-content active">
                    <div class="form-group">
                        <label>GitHub пользователи (через запятую):</label>
                        <input type="text" id="repo_members" class="form-control" placeholder="user1,user2,user3">
                    </div>
                </div>

                <!-- Выбор пользователей -->
                <div id="members-selector-tab-project" class="tab-content">
                    <div class="form-group">
                        <label>Выберите пользователей Bitrix24:</label>
                        <div id="project-users-selector-container" class="users-selector-container">
                            <!-- Здесь будет динамически добавлен селектор пользователей -->
                        </div>
                        <button type="button" id="addSelectedProjectUsersBtn" class="btn btn-secondary" style="margin-top: 10px;">Добавить выбранных</button>
                    </div>
                    <div class="form-group">
                        <label>Выбранные пользователи (их GitHub профили):</label>
                        <div id="selected-project-github-users" class="selected-users-list"></div>
                        <input type="hidden" id="selected_project_github_usernames" value=""> <!-- Для хранения выбранных логинов -->
                    </div>
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
                    
                    <!-- Участники -->
                    <div class="form-group">
                        <label>Участники:</label>
                        <!-- Вкладки для выбора способа добавления -->
                        <div class="tabs">
                            <button class="tab-button-task active" data-tab="members-text-tab-task-new">Через запятую</button>
                            <button class="tab-button-task" data-tab="members-selector-tab-task-new">Выбор пользователей</button>
                        </div>

                        <!-- Ввод через запятую -->
                        <div id="members-text-tab-task-new" class="tab-content-task active">
                            <input type="text" id="task_repo_members" class="form-control" placeholder="user1,user2,user3">
                        </div>

                        <!-- Выбор пользователей -->
                        <div id="members-selector-tab-task-new" class="tab-content-task">
                            <div id="task-users-selector-container-new" class="users-selector-container">
                                <!-- Здесь будет динамически добавлен селектор пользователей -->
                            </div>
                            <button type="button" id="addSelectedTaskUsersBtnNew" class="btn btn-secondary" style="margin-top: 10px;">Добавить выбранных</button>
                            <div style="margin-top: 10px;">
                                <label>Выбранные пользователи (их GitHub профили):</label>
                                <div id="selected-task-github-users-new" class="selected-users-list"></div>
                                <input type="hidden" id="selected_task_github_usernames_new" value=""> <!-- Для хранения выбранных логинов -->
                            </div>
                        </div>
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
                    
                    <!-- Участники -->
                    <div class="form-group">
                        <label>Участники:</label>
                        <!-- Вкладки для выбора способа добавления -->
                        <div class="tabs">
                            <button class="tab-button-task-existing active" data-tab="members-text-tab-task-existing">Через запятую</button>
                            <button class="tab-button-task-existing" data-tab="members-selector-tab-task-existing">Выбор пользователей</button>
                        </div>

                        <!-- Ввод через запятую -->
                        <div id="members-text-tab-task-existing" class="tab-content-task-existing active">
                            <input type="text" id="existing_task_repo_members" class="form-control" placeholder="user1,user2,user3">
                        </div>

                        <!-- Выбор пользователей -->
                        <div id="members-selector-tab-task-existing" class="tab-content-task-existing">
                            <div id="task-users-selector-container-existing" class="users-selector-container">
                                <!-- Здесь будет динамически добавлен селектор пользователей -->
                            </div>
                            <button type="button" id="addSelectedTaskUsersBtnExisting" class="btn btn-secondary" style="margin-top: 10px;">Добавить выбранных</button>
                            <div style="margin-top: 10px;">
                                <label>Выбранные пользователи (их GitHub профили):</label>
                                <div id="selected-task-github-users-existing" class="selected-users-list"></div>
                                <input type="hidden" id="selected_task_github_usernames_existing" value=""> <!-- Для хранения выбранных логинов -->
                            </div>
                        </div>
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
                    
                    <!-- Участники -->
                    <div class="form-group">
                        <label>Участники:</label>
                        <!-- Вкладки для выбора способа добавления -->
                        <div class="tabs">
                            <button class="tab-button-task-members active" data-tab="members-text-tab-task-members">Через запятую</button>
                            <button class="tab-button-task-members" data-tab="members-selector-tab-task-members">Выбор пользователей</button>
                        </div>

                        <!-- Ввод через запятую -->
                        <div id="members-text-tab-task-members" class="tab-content-task-members active">
                            <input type="text" id="task_repo_members_list" class="form-control" placeholder="user1,user2,user3">
                        </div>

                        <!-- Выбор пользователей -->
                        <div id="members-selector-tab-task-members" class="tab-content-task-members">
                            <div id="task-users-selector-container-members" class="users-selector-container">
                                <!-- Здесь будет динамически добавлен селектор пользователей -->
                            </div>
                            <button type="button" id="addSelectedTaskUsersBtnMembers" class="btn btn-secondary" style="margin-top: 10px;">Добавить выбранных</button>
                            <div style="margin-top: 10px;">
                                <label>Выбранные пользователи (их GitHub профили):</label>
                                <div id="selected-task-github-users-members" class="selected-users-list"></div>
                                <input type="hidden" id="selected_task_github_usernames_members" value=""> <!-- Для хранения выбранных логинов -->
                            </div>
                        </div>
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
    <script src="js/github-users.js"></script>
</body>
</html>