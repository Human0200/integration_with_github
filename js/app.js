BX24.ready(function() {
    const contextTypeElement = document.getElementById('contextType');
    const contextIdElement = document.getElementById('contextId');
    const contextType = contextTypeElement ? contextTypeElement.value : 'settings';
    const contextId = contextIdElement ? contextIdElement.value : null;
    // Инициализация интерфейса в зависимости от контекста
    initInterface();
    function initInterface() {
        if (contextType === 'settings') {
            showGlobalSettings();
        } else if (contextType === 'project') {
            showProjectInterface();
        } else if (contextType === 'task') {
            showTaskInterface();
        }
    }
    // Глобальные настройки
    function showGlobalSettings() {
        const globalSettings = document.getElementById('globalSettings');
        if (!globalSettings) return;
        globalSettings.style.display = 'block';
        loadGlobalSettings();
        const globalSettingsForm = document.getElementById('globalSettingsForm');
        if (globalSettingsForm) {
            globalSettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveGlobalSettings();
            });
        }
    }
    function loadGlobalSettings() {
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) return;
            const options = result.data();
            const elements = {
                'global_api_key': options.github_api_key || '',
                'global_organization': options.github_organization || '',
                'global_members': options.github_default_members || ''
            };
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = elements[id];
            });
        });
    }
    function saveGlobalSettings() {
        const elements = {
            'global_api_key': document.getElementById('global_api_key'),
            'global_organization': document.getElementById('global_organization'),
            'global_members': document.getElementById('global_members')
        };
        // Проверяем существование всех элементов
        for (let id in elements) {
            if (!elements[id]) {
                showResult(`Элемент ${id} не найден`, 'error');
                return;
            }
        }
        const options = {
            github_api_key: elements['global_api_key'].value,
            github_organization: elements['global_organization'].value,
            github_default_members: elements['global_members'].value
        };
        BX24.callMethod('app.option.set', { options: options }, function(result) {
            if (result.error()) {
                showResult('Ошибка сохранения: ' + result.error(), 'error');
            } else {
                showResult('Глобальные настройки сохранены!', 'success');
            }
        });
    }
    // Интерфейс проекта
    function showProjectInterface() {
        const projectInterface = document.getElementById('projectInterface');
        if (!projectInterface) return;
        projectInterface.style.display = 'block';
        loadProjectRepo();
        setupProjectEvents();
    }
    function loadProjectRepo() {
        const optionKey = `github_project_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) return;
            const options = result.data();
            const projectData = options[optionKey] ? JSON.parse(options[optionKey]) : null;
            if (projectData && projectData.repo_url) {
                // Показываем текущий репозиторий
                showCurrentRepository(projectData);
            } else {
                // Показываем форму выбора/создания репозитория
                showRepoSelector();
            }
        });
    }
    function showCurrentRepository(projectData) {
        const currentRepo = document.getElementById('currentRepo');
        const repoSelector = document.getElementById('repoSelector');
        const createRepoForm = document.getElementById('createRepoForm');
        const membersSection = document.getElementById('membersSection');
        if (currentRepo) {
            currentRepo.style.display = 'block';
            const repoLink = document.getElementById('repoLink');
            if (repoLink) {
                repoLink.href = projectData.repo_url;
                repoLink.textContent = projectData.repo_name || projectData.repo_url;
            }
        }
        if (repoSelector) repoSelector.style.display = 'none';
        if (createRepoForm) createRepoForm.style.display = 'none';
        if (membersSection) membersSection.style.display = 'block';
        // Загружаем участников
        const repoMembers = document.getElementById('repo_members');
        if (repoMembers) {
            repoMembers.value = projectData.members ? projectData.members.join(',') : '';
        }
        if (projectData.members) {
            showMembers(projectData.members);
        }
    }
    function showRepoSelector() {
        const currentRepo = document.getElementById('currentRepo');
        const repoSelector = document.getElementById('repoSelector');
        const createRepoForm = document.getElementById('createRepoForm');
        const membersSection = document.getElementById('membersSection');
        if (currentRepo) currentRepo.style.display = 'none';
        if (repoSelector) repoSelector.style.display = 'block';
        if (createRepoForm) createRepoForm.style.display = 'block';
        if (membersSection) membersSection.style.display = 'none';
    }
    function setupProjectEvents() {
        // Переключение между созданием и выбором репозитория
        const repoActions = document.querySelectorAll('input[name="repoAction"]');
        repoActions.forEach(radio => {
            radio.addEventListener('change', function() {
                const createRepoForm = document.getElementById('createRepoForm');
                const selectRepoForm = document.getElementById('selectRepoForm');
                if (this.value === 'create') {
                    if (createRepoForm) createRepoForm.style.display = 'block';
                    if (selectRepoForm) selectRepoForm.style.display = 'none';
                } else {
                    if (createRepoForm) createRepoForm.style.display = 'none';
                    if (selectRepoForm) selectRepoForm.style.display = 'block';
                }
            });
        });
        // Кнопки действий
        const eventHandlers = {
            'createRepoBtn': createRepository,
            'selectRepoBtn': selectRepository,
            'changeRepo': changeRepository,
            'updateMembersBtn': updateMembers
        };
        Object.keys(eventHandlers).forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', eventHandlers[buttonId]);
            }
        });
    }
    function changeRepository() {
        const currentRepo = document.getElementById('currentRepo');
        const repoSelector = document.getElementById('repoSelector');
        const createRepoForm = document.getElementById('createRepoForm');
        const membersSection = document.getElementById('membersSection');
        if (currentRepo) currentRepo.style.display = 'none';
        if (repoSelector) repoSelector.style.display = 'block';
        if (createRepoForm) createRepoForm.style.display = 'block';
        if (membersSection) membersSection.style.display = 'none';
    }
function createRepository() {
    const repoName = document.getElementById('new_repo_name');
    const repoDescription = document.getElementById('new_repo_description');
    const repoPrivate = document.getElementById('new_repo_private');
    const repoReadme = document.getElementById('new_repo_readme');
    if (!repoName || !repoDescription) {
        showResult('Элементы формы не найдены', 'error');
        return;
    }
    if (!repoName.value) {
        showResult('Укажите название репозитория', 'error');
        return;
    }
    const repoNameValue = repoName.value.trim();
    const isPrivate = repoPrivate ? repoPrivate.checked : true;
    const withReadme = repoReadme ? repoReadme.checked : true;
    // Получаем глобальные настройки для создания
    BX24.callMethod('app.option.get', {}, function(result) {
        if (result.error()) {
            showResult('Ошибка получения настроек: ' + result.error(), 'error');
            return;
        }
        const options = result.data();
        if (!options.github_api_key || !options.github_organization) {
            showResult('Сначала настройте глобальные настройки GitHub', 'error');
            return;
        }
        showResult('Создание репозитория...', 'info');
        // Отправляем запрос на создание
        fetch('create_repo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repo_name: repoNameValue,
                repo_description: repoDescription.value,
                api_key: options.github_api_key,
                organization: options.github_organization,
                private: isPrivate,
                readme: withReadme
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Create repo response:', data);
            if (data.success) {
                // Используем имя репозитория из ответа
                const actualRepoName = data.repo_name || repoNameValue;
                const projectData = {
                    repo_name: actualRepoName,
                    repo_url: data.url,
                    members: []
                };
                saveProjectRepo(projectData, function(success) {
                    if (success) {
                        showResult('Репозиторий создан: ' + data.url, 'success');
                        // Напрямую обновляем интерфейс вместо перезагрузки
                        showCurrentRepository(projectData);
                    } else {
                        showResult('Репозиторий создан, но ошибка сохранения: ' + data.url, 'warning');
                        // Даже при ошибке сохранения показываем интерфейс
                        showCurrentRepository({
                            repo_name: actualRepoName,
                            repo_url: data.url,
                            members: []
                        });
                    }
                });
            } else {
                showResult('Ошибка создания: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Create repo error:', error);
            showResult('Ошибка сети: ' + error.message, 'error');
        });
    });
}
    function selectRepository() {
        const repoUrl = document.getElementById('existing_repo_url');
        if (!repoUrl) {
            showResult('Элемент URL репозитория не найден', 'error');
            return;
        }
        if (!repoUrl.value) {
            showResult('Укажите URL репозитория', 'error');
            return;
        }
        // Извлекаем название из URL
        const matches = repoUrl.value.match(/github\.com\/[^\/]+\/([^\/]+)/);
        const repoName = matches ? matches[1] : repoUrl.value;
        saveProjectRepo({
            repo_name: repoName,
            repo_url: repoUrl.value,
            members: []
        });
        showResult('Репозиторий привязан!', 'success');
        loadProjectRepo();
    }
function saveProjectRepo(data, callback) {
    const optionKey = `github_project_${contextId}`;
    const options = {};
    // Извлекаем имя репозитория из URL если оно не указано
    if (!data.repo_name && data.repo_url) {
        const matches = data.repo_url.match(/github\.com\/[^\/]+\/([^\/]+)/);
        if (matches && matches[1]) {
            data.repo_name = matches[1];
        }
    }
    options[optionKey] = JSON.stringify(data);
    BX24.callMethod('app.option.set', { options: options }, function(result) {
        if (result.error()) {
            showResult('Ошибка сохранения: ' + result.error(), 'error');
            if (callback) callback(false);
        } else {
            if (callback) callback(true);
        }
    });
}
function updateMembers() {
    const membersText = document.getElementById('repo_members');
    if (!membersText) {
        showResult('Элемент участников не найден', 'error');
        return;
    }
    const members = membersText.value.split(',').map(s => s.trim()).filter(s => s);
    // Получаем текущие данные проекта
    const optionKey = `github_project_${contextId}`;
    BX24.callMethod('app.option.get', {}, function(result) {
        if (result.error()) {
            showResult('Ошибка получения данных проекта: ' + result.error(), 'error');
            return;
        }
        const options = result.data();
        const projectData = options[optionKey] ? JSON.parse(options[optionKey]) : {};
        console.log('Project data for adding members:', projectData);
        if (!projectData.repo_name) {
            showResult('Репозиторий не настроен', 'error');
            return;
        }
        // Добавляем участников в GitHub
        addMembersToGithub(projectData, members, function(success) {
            if (success) {
                // Сохраняем в Bitrix24 только если успешно добавили в GitHub
                projectData.members = members;
                const newOptions = {};
                newOptions[optionKey] = JSON.stringify(projectData);
                BX24.callMethod('app.option.set', { options: newOptions }, function(result) {
                    if (result.error()) {
                        showResult('Ошибка сохранения: ' + result.error(), 'error');
                    } else {
                        showResult('Участники добавлены в GitHub и сохранены!', 'success');
                        showMembers(members);
                    }
                });
            } else {
                showResult('Ошибка добавления участников в GitHub', 'error');
            }
        });
    });
}
function addMembersToGithub(projectData, members, callback) {
    console.log('Adding members to repo:', projectData.repo_name, 'Members:', members);
    // Получаем глобальные настройки для API ключа
    BX24.callMethod('app.option.get', {}, function(result) {
        if (result.error()) {
            showResult('Ошибка получения настроек: ' + result.error(), 'error');
            callback(false);
            return;
        }
        const options = result.data();
        const apiKey = options.github_api_key;
        const organization = options.github_organization;
        console.log('API settings:', { apiKey: !!apiKey, organization: organization, repo_name: projectData.repo_name });
        if (!apiKey || !organization || !projectData.repo_name) {
            showResult('Не хватает настроек для добавления участников: API ключ=' + !!apiKey + ', организация=' + organization + ', репозиторий=' + projectData.repo_name, 'error');
            callback(false);
            return;
        }
        if (members.length === 0) {
            showResult('Нет участников для добавления', 'info');
            callback(true);
            return;
        }
        // Извлекаем правильное имя репозитория из URL
        let repoName = projectData.repo_name;
        if (projectData.repo_url) {
            // Извлекаем имя из URL: https://github.com/org/repo-name
            const matches = projectData.repo_url.match(/github\.com\/[^\/]+\/([^\/]+)/);
            if (matches && matches[1]) {
                repoName = matches[1];
                console.log('Extracted repo name from URL:', repoName);
            }
        }
        // Отправляем запрос на добавление участников
        fetch('add_members.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                organization: organization,
                repo_name: repoName,
                members: members
            })
        })
        .then(response => {
            console.log('Add members response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Add members response data:', data);
            if (data.success) {
                callback(true);
            } else {
                showResult('Ошибка GitHub API: ' + data.message, 'error');
                callback(false);
            }
        })
        .catch(error => {
            console.error('Add members network error:', error);
            showResult('Ошибка сети: ' + error.message, 'error');
            callback(false);
        });
    });
}
    // Интерфейс задачи
    function showTaskInterface() {
        const taskInterface = document.getElementById('taskInterface');
        if (!taskInterface) return;
        taskInterface.style.display = 'block';
        loadTaskRepo();
        setupTaskEvents();
    }
    function loadTaskRepo() {
    // Сначала получаем данные задачи
    BX24.callMethod('tasks.task.get', { taskId: contextId }, function(result) {
        if (result.error()) {
            showTaskSetupInterface(null, false); // Передаем, что группа отсутствует
            return;
        }
        const task = result.data().task;
        const groupId = task.groupId;
        const hasGroup = !!groupId; // Проверяем, есть ли группа у задачи

        // Проверяем, есть ли уже настроенный репозиторий для задачи
        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(optionResult) {
            if (optionResult.error()) {
                showTaskSetupInterface(null, hasGroup); // Передаем информацию о группе
                return;
            }
            const options = optionResult.data();
            const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : null;
            if (taskData && taskData.repo_url) {
                // Показываем уже настроенный репозиторий задачи
                showTaskRepoInterface(taskData);
            } else if (groupId) {
                // Проверяем репозиторий проекта
                const projectOptionKey = `github_project_${groupId}`;
                const projectData = options[projectOptionKey] ? JSON.parse(options[projectOptionKey]) : null;
                if (projectData && projectData.repo_url) {
                    // Есть репозиторий проекта - показываем выбор
                    showTaskSetupInterface(projectData, hasGroup); // Передаем информацию о группе
                } else {
                    // Нет репозитория проекта - показываем настройку
                    showTaskSetupInterface(null, hasGroup); // Передаем информацию о группе
                }
            } else {
                // Нет группы - показываем настройку без опции проекта
                showTaskSetupInterface(null, hasGroup); // Передаем информацию о группе (false в данном случае)
            }
        });
    });
}

function showTaskSetupInterface(projectData = null, hasGroup = false) {
    const noTaskRepo = document.getElementById('noTaskRepo');
    const taskRepo = document.getElementById('taskRepo');
    const taskRepoSetup = document.getElementById('taskRepoSetup');
    const useProjectRepo = document.getElementById('useProjectRepo');
    const projectRepoLink = document.getElementById('projectRepoLink');
    const projectOptionElement = document.querySelector('input[value="project"]');
    const projectOptionLabel = projectOptionElement ? projectOptionElement.closest('label') : null;

    if (noTaskRepo) noTaskRepo.style.display = 'none';
    if (taskRepo) taskRepo.style.display = 'none';
    if (taskRepoSetup) taskRepoSetup.style.display = 'block';

    // Скрываем все секции опций
    const useProjectRepoSection = document.getElementById('useProjectRepo');
    const createTaskRepoSection = document.getElementById('createTaskRepo');
    const selectTaskRepoSection = document.getElementById('selectTaskRepo');

    if (useProjectRepoSection) useProjectRepoSection.style.display = 'none';
    if (createTaskRepoSection) createTaskRepoSection.style.display = 'none';
    if (selectTaskRepoSection) selectTaskRepoSection.style.display = 'none';

    // Снимаем выделение со всех radio кнопок
    const taskRepoOptions = document.querySelectorAll('input[name="taskRepoOption"]');
    taskRepoOptions.forEach(radio => {
        radio.checked = false;
    });

    // Управление опцией "Использовать репозиторий проекта"
    if (hasGroup && projectData && useProjectRepoSection && projectRepoLink) {
        // Если задача в группе и есть данные проекта, показываем опцию
        if (projectOptionLabel) projectOptionLabel.style.display = 'block';
        useProjectRepoSection.style.display = 'none'; // Секция скрыта до выбора опции
        projectRepoLink.href = projectData.repo_url;
        projectRepoLink.textContent = projectData.repo_name || projectData.repo_url;
    } else {
        // Если задача не в группе или нет данных проекта, скрываем опцию
        if (projectOptionLabel) projectOptionLabel.style.display = 'none';
        if (useProjectRepoSection) useProjectRepoSection.style.display = 'none';
    }

    // Автозаполнение полей при необходимости
    fillTaskAssignees();
}
    function showTaskRepoInterface(taskData) {
        const noTaskRepo = document.getElementById('noTaskRepo');
        const taskRepo = document.getElementById('taskRepo');
        const taskRepoSetup = document.getElementById('taskRepoSetup');
        const taskRepoLink = document.getElementById('taskRepoLink');
        const taskBranch = document.getElementById('task_branch');
        const taskMembersList = document.getElementById('task_repo_members_list');
        const openBranchBtn = document.getElementById('openBranchBtn');
        if (noTaskRepo) noTaskRepo.style.display = 'none';
        if (taskRepoSetup) taskRepoSetup.style.display = 'none';
        if (taskRepo) taskRepo.style.display = 'block';
        if (taskRepoLink) {
            taskRepoLink.href = taskData.repo_url;
            taskRepoLink.textContent = taskData.repo_name || taskData.repo_url;
        }
        if (taskBranch) {
            taskBranch.value = taskData.branch || '';
            // Если ветка уже указана, показываем кнопку открытия
            if (taskData.branch && openBranchBtn) {
                openBranchBtn.style.display = 'inline-block';
                openBranchBtn.onclick = function() {
                    window.open(`${taskData.repo_url}/tree/${taskData.branch}`, '_blank');
                };
            } else if (openBranchBtn) {
                openBranchBtn.style.display = 'none';
            }
        }
        if (taskMembersList) {
            taskMembersList.value = taskData.members ? taskData.members.join(',') : '';
        }
        if (taskData.members) {
            showTaskMembers(taskData.members);
        }
    }
    function setupTaskRepoOptions() {
        const taskRepoOptions = document.querySelectorAll('input[name="taskRepoOption"]');
        taskRepoOptions.forEach(radio => {
            radio.addEventListener('change', function() {
                const useProjectRepo = document.getElementById('useProjectRepo');
                const createTaskRepo = document.getElementById('createTaskRepo');
                const selectTaskRepo = document.getElementById('selectTaskRepo');
                if (this.value === 'project') {
                    if (useProjectRepo) useProjectRepo.style.display = 'block';
                    if (createTaskRepo) createTaskRepo.style.display = 'none';
                    if (selectTaskRepo) selectTaskRepo.style.display = 'none';
                } else if (this.value === 'new') {
                    if (useProjectRepo) useProjectRepo.style.display = 'none';
                    if (createTaskRepo) createTaskRepo.style.display = 'block';
                    if (selectTaskRepo) selectTaskRepo.style.display = 'none';
                    // Автозаполнение названия репозитория
                    const taskRepoName = document.getElementById('task_repo_name');
                    if (taskRepoName) {
                        taskRepoName.value = `task-${contextId}-${Date.now()}`;
                    }
                    const taskRepoDescription = document.getElementById('task_repo_description');
                    if (taskRepoDescription) {
                        taskRepoDescription.value = `Репозиторий для задачи #${contextId}`;
                    }
                    // Автозаполнение участников из исполнителей задачи
                    fillTaskAssignees();
                } else {
                    if (useProjectRepo) useProjectRepo.style.display = 'none';
                    if (createTaskRepo) createTaskRepo.style.display = 'none';
                    if (selectTaskRepo) selectTaskRepo.style.display = 'block';
                }
            });
        });
    }
    function setupTaskEvents() {
        // Кнопка настройки репозитория
        const setupTaskRepo = document.getElementById('setupTaskRepo');
        if (setupTaskRepo) {
            setupTaskRepo.addEventListener('click', function() {
                loadTaskRepo(); // Перезагружаем интерфейс настройки
            });
        }
        // Подтверждение использования репозитория проекта
        const confirmProjectRepo = document.getElementById('confirmProjectRepo');
        if (confirmProjectRepo) {
            confirmProjectRepo.addEventListener('click', useProjectRepository);
        }
        // Создание нового репозитория
        const createTaskRepoBtn = document.getElementById('createTaskRepoBtn');
        if (createTaskRepoBtn) {
            createTaskRepoBtn.addEventListener('click', createTaskRepository);
        }
        // Выбор существующего репозитория
        const selectTaskRepoBtn = document.getElementById('selectTaskRepoBtn');
        if (selectTaskRepoBtn) {
            selectTaskRepoBtn.addEventListener('click', selectTaskRepository);
        }
        // Обновление связи задачи
        const updateTaskLinkBtn = document.getElementById('updateTaskLinkBtn');
        if (updateTaskLinkBtn) {
            updateTaskLinkBtn.addEventListener('click', updateTaskLink);
        }
        // Обновление участников задачи
        const updateTaskMembersBtn = document.getElementById('updateTaskMembersBtn');
        if (updateTaskMembersBtn) {
            updateTaskMembersBtn.addEventListener('click', updateTaskMembers);
        }
        // Изменение репозитория задачи
        const changeTaskRepoBtn = document.getElementById('changeTaskRepo');
        if (changeTaskRepoBtn) {
            changeTaskRepoBtn.addEventListener('click', function() {
                showTaskSetupInterface();
            });
        }
        // Создание ветки
        const createBranchBtn = document.getElementById('createBranchBtn');
        if (createBranchBtn) {
            createBranchBtn.addEventListener('click', createBranch);
        }
        // Добавляем обработчик для Enter в поле ветки
        const taskBranch = document.getElementById('task_branch');
        if (taskBranch) {
            taskBranch.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    createBranch();
                }
            });
        }
        // Настройка опций репозитория
        setupTaskRepoOptions();
    }
    function useProjectRepository() {
        // Получаем данные проекта
        BX24.callMethod('tasks.task.get', { taskId: contextId }, function(result) {
            if (result.error()) {
                showResult('Ошибка получения данных задачи', 'error');
                return;
            }
            const task = result.data().task;
            const groupId = task.groupId;
            if (!groupId) {
                showResult('Задача не принадлежит проекту', 'error');
                return;
            }
            // Получаем репозиторий проекта
            const projectOptionKey = `github_project_${groupId}`;
            BX24.callMethod('app.option.get', {}, function(optionResult) {
                if (optionResult.error()) {
                    showResult('Ошибка получения данных проекта', 'error');
                    return;
                }
                const options = optionResult.data();
                const projectData = options[projectOptionKey] ? JSON.parse(options[projectOptionKey]) : null;
                if (!projectData || !projectData.repo_url) {
                    showResult('Репозиторий проекта не настроен', 'error');
                    return;
                }
                // Сохраняем репозиторий проекта для задачи
                const taskData = {
                    repo_url: projectData.repo_url,
                    repo_name: projectData.repo_name,
                    branch: `task/${contextId}`,
                    from_project: true,
                    members: projectData.members || []
                };
                saveTaskRepo(taskData, function(success) {
                    if (success) {
                        showResult('Репозиторий задачи настроен!', 'success');
                        showTaskRepoInterface(taskData);
                    }
                });
            });
        });
    }
    function createTaskRepository() {
        const repoName = document.getElementById('task_repo_name');
        const repoDescription = document.getElementById('task_repo_description');
        const repoPrivate = document.getElementById('task_repo_private');
        const repoReadme = document.getElementById('task_repo_readme');
        const repoMembers = document.getElementById('task_repo_members');
        if (!repoName || !repoDescription) {
            showResult('Элементы формы не найдены', 'error');
            return;
        }
        if (!repoName.value) {
            showResult('Укажите название репозитория', 'error');
            return;
        }
        // Получаем участников
        let members = [];
        if (repoMembers && repoMembers.value) {
            members = repoMembers.value.split(',').map(s => s.trim()).filter(s => s);
        }
        const isPrivate = repoPrivate ? repoPrivate.checked : true;
        const withReadme = repoReadme ? repoReadme.checked : true;
        showResult('Создание репозитория...', 'info');
        // Получаем глобальные настройки
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                showResult('Ошибка получения настроек: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            if (!options.github_api_key || !options.github_organization) {
                showResult('Сначала настройте глобальные настройки GitHub', 'error');
                return;
            }
            // Создаем репозиторий
            fetch('create_repo.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_name: repoName.value,
                    repo_description: repoDescription.value,
                    api_key: options.github_api_key,
                    organization: options.github_organization,
                    private: isPrivate,
                    readme: withReadme
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const taskData = {
                        repo_url: data.url,
                        repo_name: repoName.value,
                        branch: 'main',
                        from_project: false,
                        members: members
                    };
                    // Сохраняем репозиторий
                    saveTaskRepo(taskData, function(success) {
                        if (success) {
                            // Если есть участники, добавляем их
                            if (members.length > 0) {
                                showResult('Добавление участников в репозиторий...', 'info');
                                addMembersToTaskRepo(taskData, members, function(addSuccess) {
                                    if (addSuccess) {
                                        showResult('Репозиторий создан и участники добавлены!', 'success');
                                        showTaskRepoInterface(taskData);
                                    } else {
                                        showResult('Репозиторий создан, но ошибка при добавлении участников', 'warning');
                                        showTaskRepoInterface(taskData);
                                    }
                                });
                            } else {
                                showResult('Репозиторий создан!', 'success');
                                showTaskRepoInterface(taskData);
                            }
                        } else {
                            showResult('Ошибка сохранения репозитория', 'error');
                        }
                    });
                } else {
                    showResult('Ошибка создания репозитория: ' + data.message, 'error');
                }
            })
            .catch(error => {
                showResult('Ошибка сети: ' + error.message, 'error');
            });
        });
    }
    // Функция для выбора существующего репозитория
    function selectTaskRepository() {
        const repoUrl = document.getElementById('existing_task_repo_url');
        const repoMembers = document.getElementById('existing_task_repo_members');
        if (!repoUrl) {
            showResult('Элемент URL репозитория не найден', 'error');
            return;
        }
        if (!repoUrl.value) {
            showResult('Укажите URL репозитория', 'error');
            return;
        }
        // Извлекаем название из URL
        const matches = repoUrl.value.match(/github\.com\/[^\/]+\/([^\/]+)/);
        const repoName = matches ? matches[1] : repoUrl.value;
        // Получаем участников
        let members = [];
        if (repoMembers && repoMembers.value) {
            members = repoMembers.value.split(',').map(s => s.trim()).filter(s => s);
        }
        const taskData = {
            repo_name: repoName,
            repo_url: repoUrl.value,
            branch: '',
            from_project: false,
            members: members
        };
        saveTaskRepo(taskData, function(success) {
            if (success) {
                showResult('Репозиторий привязан!', 'success');
                showTaskRepoInterface(taskData);
                // Если есть участники, добавляем их
                if (members.length > 0) {
                    addMembersToTaskRepo(taskData, members, function(addSuccess) {
                        if (addSuccess) {
                            showResult('Участники добавлены в репозиторий!', 'success');
                        } else {
                            showResult('Репозиторий привязан, но ошибка при добавлении участников', 'warning');
                        }
                    });
                }
            }
        });
    }
    function saveTaskRepo(taskData, callback) {
        const taskOptionKey = `github_task_${contextId}`;
        const options = {};
        options[taskOptionKey] = JSON.stringify(taskData);
        BX24.callMethod('app.option.set', { options: options }, function(result) {
            if (result.error()) {
                showResult('Ошибка сохранения: ' + result.error(), 'error');
                if (callback) callback(false);
            } else {
                if (callback) callback(true);
            }
        });
    }
    function addMembersToTaskRepo(taskData, members, callback) {
        // Получаем глобальные настройки
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                showResult('Ошибка получения настроек: ' + result.error(), 'error');
                if (callback) callback(false);
                return;
            }
            const options = result.data();
            const apiKey = options.github_api_key;
            const organization = options.github_organization;
            if (!apiKey || !organization || !taskData.repo_name) {
                showResult('Не хватает настроек для добавления участников', 'error');
                if (callback) callback(false);
                return;
            }
            showResult('Отправка запроса на добавление участников...', 'info');
            // Отправляем запрос на добавление участников
            fetch('add_members.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    organization: organization,
                    repo_name: taskData.repo_name,
                    members: members
                })
            })
            .then(response => {
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showResult('Участники успешно добавлены!', 'success');
                    if (callback) callback(true);
                } else {
                    showResult('Ошибка GitHub API: ' + data.message, 'error');
                    if (callback) callback(false);
                }
            })
            .catch(error => {
                showResult('Ошибка сети при добавлении участников: ' + error.message, 'error');
                if (callback) callback(false);
            });
        });
    }
    function updateTaskMembers() {
        const membersText = document.getElementById('task_repo_members_list');
        if (!membersText) {
            showResult('Элемент участников не найден', 'error');
            return;
        }
        const members = membersText.value.split(',').map(s => s.trim()).filter(s => s);
        if (members.length === 0) {
            showResult('Укажите участников для добавления', 'error');
            return;
        }
        showResult('Обновление участников...', 'info');
        // Получаем текущие данные задачи
        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                showResult('Ошибка получения данных: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : {};
            if (!taskData.repo_name) {
                showResult('Репозиторий не настроен', 'error');
                return;
            }
            // Добавляем участников в GitHub
            addMembersToTaskRepo(taskData, members, function(success) {
                if (success) {
                    // Сохраняем в Bitrix24 только если успешно добавили в GitHub
                    taskData.members = members;
                    const newOptions = {};
                    newOptions[taskOptionKey] = JSON.stringify(taskData);
                    BX24.callMethod('app.option.set', { options: newOptions }, function(result) {
                        if (result.error()) {
                            showResult('Ошибка сохранения: ' + result.error(), 'error');
                        } else {
                            showResult('Участники добавлены в GitHub и сохранены!', 'success');
                            showTaskMembers(members);
                        }
                    });
                } else {
                    showResult('Ошибка добавления участников в GitHub', 'error');
                }
            });
        });
    }
    function showTaskMembers(members) {
        if (members && members.length > 0) {
            const membersList = document.getElementById('taskMembersList');
            const membersListContent = document.getElementById('taskMembersListContent');
            if (membersList && membersListContent) {
                membersListContent.innerHTML = '';
                members.forEach(member => {
                    const li = document.createElement('li');
                    li.textContent = member;
                    membersListContent.appendChild(li);
                });
                membersList.style.display = 'block';
            }
        }
    }
    function fillTaskAssignees() {
        BX24.callMethod('tasks.task.get', { taskId: contextId }, function(result) {
            if (result.error()) return;
            const task = result.data().task;
            const assignees = task.responsible || [];
            if (assignees.length > 0) {
                const membersInput = document.getElementById('task_repo_members');
                if (membersInput) {
                    // Преобразуем исполнителей в список GitHub пользователей
                    // Пока просто покажем уведомление, что нужно вручную указать GitHub логины
                    const githubUsers = assignees.map(a => a.name || a.lastName || 'user').join(',');
                    membersInput.value = ''; // Пока оставляем пустым, пользователь должен ввести GitHub логины
                    showResult('Укажите GitHub логины исполнителей через запятую', 'info');
                }
            }
        });
    }
    function updateTaskLink() {
        const taskBranch = document.getElementById('task_branch');
        if (!taskBranch) return;
        const branch = taskBranch.value;
        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                showResult('Ошибка получения данных: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : {};
            taskData.branch = branch;
            const newOptions = {};
            newOptions[taskOptionKey] = JSON.stringify(taskData);
            BX24.callMethod('app.option.set', { options: newOptions }, function(saveResult) {
                if (saveResult.error()) {
                    showResult('Ошибка сохранения: ' + saveResult.error(), 'error');
                } else {
                    showResult('Связь обновлена!', 'success');
                    // Обновляем кнопку открытия ветки
                    const openBranchBtn = document.getElementById('openBranchBtn');
                    if (branch && openBranchBtn) {
                        openBranchBtn.style.display = 'inline-block';
                        openBranchBtn.onclick = function() {
                            window.open(`${taskData.repo_url}/tree/${branch}`, '_blank');
                        };
                    } else if (openBranchBtn) {
                        openBranchBtn.style.display = 'none';
                    }
                }
            });
        });
    }
    // Функция для создания ветки
    function createBranch() {
        const branchName = document.getElementById('task_branch');
        if (!branchName || !branchName.value) {
            showResult('Укажите название ветки', 'error');
            return;
        }
        const branch = branchName.value.trim();
        // Получаем данные репозитория задачи
        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                showResult('Ошибка получения данных: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : {};
            if (!taskData.repo_url || !taskData.repo_name) {
                showResult('Репозиторий не настроен', 'error');
                return;
            }
            // Получаем глобальные настройки
            BX24.callMethod('app.option.get', {}, function(globalResult) {
                if (globalResult.error()) {
                    showResult('Ошибка получения настроек: ' + globalResult.error(), 'error');
                    return;
                }
                const globalOptions = globalResult.data();
                const apiKey = globalOptions.github_api_key;
                const organization = globalOptions.github_organization;
                if (!apiKey || !organization) {
                    showResult('Сначала настройте глобальные настройки GitHub', 'error');
                    return;
                }
                showResult('Создание ветки...', 'info');
                // Создаем ветку через GitHub API
                // Сначала получаем SHA последнего коммита в main/master
                fetch(`https://api.github.com/repos/${organization}/${taskData.repo_name}/git/refs/heads/main`, {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'User-Agent': 'Bitrix24-GitHub-App'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        // Пытаемся получить master вместо main
                        return fetch(`https://api.github.com/repos/${organization}/${taskData.repo_name}/git/refs/heads/master`, {
                            headers: {
                                'Authorization': `token ${apiKey}`,
                                'User-Agent': 'Bitrix24-GitHub-App'
                            }
                        });
                    }
                    return response;
                })
                .then(response => response.json())
                .then(data => {
                    const sha = data.object ? data.object.sha : null;
                    if (!sha) {
                        throw new Error('Не удалось получить SHA последнего коммита');
                    }
                    // Создаем новую ветку
                    return fetch(`https://api.github.com/repos/${organization}/${taskData.repo_name}/git/refs`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `token ${apiKey}`,
                            'User-Agent': 'Bitrix24-GitHub-App',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ref: `refs/heads/${branch}`,
                            sha: sha
                        })
                    });
                })
                .then(response => response.json())
                .then(data => {
                    if (data.ref) {
                        showResult(`Ветка "${branch}" успешно создана!`, 'success');
                        // Показываем кнопку для открытия ветки
                        const openBranchBtn = document.getElementById('openBranchBtn');
                        if (openBranchBtn) {
                            openBranchBtn.style.display = 'inline-block';
                            openBranchBtn.onclick = function() {
                                window.open(`${taskData.repo_url}/tree/${branch}`, '_blank');
                            };
                        }
                        // Сохраняем ветку в настройках задачи
                        taskData.branch = branch;
                        const newOptions = {};
                        newOptions[taskOptionKey] = JSON.stringify(taskData);
                        BX24.callMethod('app.option.set', { options: newOptions }, function() {
                            // Игнорируем ошибки сохранения, главное что ветка создана
                        });
                    } else {
                        showResult('Ошибка создания ветки: ' + (data.message || 'Неизвестная ошибка'), 'error');
                    }
                })
                .catch(error => {
                    showResult('Ошибка создания ветки: ' + error.message, 'error');
                });
            });
        });
    }
    // Вспомогательные функции
    function showMembers(members) {
        if (members && members.length > 0) {
            const membersList = document.getElementById('membersList');
            const membersListContent = document.getElementById('membersListContent');
            if (membersList && membersListContent) {
                membersListContent.innerHTML = '';
                members.forEach(member => {
                    const li = document.createElement('li');
                    li.textContent = member;
                    membersListContent.appendChild(li);
                });
                membersList.style.display = 'block';
            }
        }
    }
    function showResult(message, type) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="${type}">${message}</div>`;
            setTimeout(() => {
                resultDiv.innerHTML = '';
            }, 5000);
        }
    }
});
