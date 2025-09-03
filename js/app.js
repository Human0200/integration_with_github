BX24.ready(function() {
    const contextType = document.getElementById('contextType').value;
    const contextId = document.getElementById('contextId').value;
    
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
        document.getElementById('globalSettings').style.display = 'block';
        loadGlobalSettings();
        
        document.getElementById('globalSettingsForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveGlobalSettings();
        });
    }
    
    function loadGlobalSettings() {
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) return;
            
            const options = result.data();
            document.getElementById('global_api_key').value = options.github_api_key || '';
            document.getElementById('global_organization').value = options.github_organization || '';
        });
    }
    
    function saveGlobalSettings() {
        const options = {
            github_api_key: document.getElementById('global_api_key').value,
            github_organization: document.getElementById('global_organization').value,
            github_default_members: document.getElementById('global_members').value
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
        document.getElementById('projectInterface').style.display = 'block';
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
                document.getElementById('currentRepo').style.display = 'block';
                document.getElementById('repoSelector').style.display = 'none';
                document.getElementById('createRepoForm').style.display = 'none';
                document.getElementById('selectRepoForm').style.display = 'none';
                document.getElementById('membersSection').style.display = 'block';
                
                document.getElementById('repoLink').href = projectData.repo_url;
                document.getElementById('repoLink').textContent = projectData.repo_name || projectData.repo_url;
                
                // Загружаем участников
                if (projectData.members) {
                    document.getElementById('repo_members').value = projectData.members.join(',');
                    showMembers(projectData.members);
                } else {
                    // Показываем пустое поле для участников
                    document.getElementById('repo_members').value = '';
                }
            } else {
                // Показываем форму выбора/создания
                document.getElementById('repoSelector').style.display = 'block';
                document.getElementById('createRepoForm').style.display = 'block';
                document.getElementById('membersSection').style.display = 'none';
            }
        });
    }
    
    function setupProjectEvents() {
        // Переключение между созданием и выбором
        document.querySelectorAll('input[name="repoAction"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'create') {
                    document.getElementById('createRepoForm').style.display = 'block';
                    document.getElementById('selectRepoForm').style.display = 'none';
                } else {
                    document.getElementById('createRepoForm').style.display = 'none';
                    document.getElementById('selectRepoForm').style.display = 'block';
                }
            });
        });
        
        // Создание репозитория
        document.getElementById('createRepoBtn').addEventListener('click', createRepository);
        
        // Выбор существующего репозитория
        document.getElementById('selectRepoBtn').addEventListener('click', selectRepository);
        
        // Изменение репозитория
        document.getElementById('changeRepo').addEventListener('click', function() {
            document.getElementById('currentRepo').style.display = 'none';
            document.getElementById('repoSelector').style.display = 'block';
            document.getElementById('createRepoForm').style.display = 'block';
            document.getElementById('membersSection').style.display = 'none';
        });
        
        // Обновление участников
        document.getElementById('updateMembersBtn').addEventListener('click', updateMembers);
    }
    
    function createRepository() {
        const repoName = document.getElementById('new_repo_name').value;
        const repoDescription = document.getElementById('new_repo_description').value;
        
        if (!repoName) {
            showResult('Укажите название репозитория', 'error');
            return;
        }
        
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
            
            // Отправляем запрос на создание
            fetch('create_repo.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_name: repoName,
                    repo_description: repoDescription,
                    api_key: options.github_api_key,
                    organization: options.github_organization
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    saveProjectRepo({
                        repo_name: repoName,
                        repo_url: data.url,
                        members: []
                    });
                    showResult('Репозиторий создан: ' + data.url, 'success');
                    loadProjectRepo(); // Перезагружаем интерфейс
                } else {
                    showResult('Ошибка создания: ' + data.message, 'error');
                }
            })
            .catch(error => {
                showResult('Ошибка сети: ' + error.message, 'error');
            });
        });
    }
    
    function selectRepository() {
        const repoUrl = document.getElementById('existing_repo_url').value;
        
        if (!repoUrl) {
            showResult('Укажите URL репозитория', 'error');
            return;
        }
        
        // Извлекаем название из URL
        const matches = repoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
        const repoName = matches ? matches[1] : repoUrl;
        
        saveProjectRepo({
            repo_name: repoName,
            repo_url: repoUrl,
            members: []
        });
        
        showResult('Репозиторий привязан!', 'success');
        loadProjectRepo();
    }
    
    function saveProjectRepo(data) {
        const optionKey = `github_project_${contextId}`;
        const options = {};
        options[optionKey] = JSON.stringify(data);
        
        BX24.callMethod('app.option.set', { options: options }, function(result) {
            if (result.error()) {
                showResult('Ошибка сохранения: ' + result.error(), 'error');
            }
        });
    }
    
    function updateMembers() {
        const membersText = document.getElementById('repo_members').value;
        const members = membersText.split(',').map(s => s.trim()).filter(s => s);
        
        // Получаем текущие данные проекта
        const optionKey = `github_project_${contextId}`;
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) return;
            
            const options = result.data();
            const projectData = options[optionKey] ? JSON.parse(options[optionKey]) : {};
            
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
        // Получаем глобальные настройки для API ключа
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                callback(false);
                return;
            }
            
            const options = result.data();
            const apiKey = options.github_api_key;
            const organization = options.github_organization;
            
            if (!apiKey || !organization || !projectData.repo_name) {
                showResult('Не хватает настроек для добавления участников', 'error');
                callback(false);
                return;
            }
            
            // Отправляем запрос на добавление участников
            fetch('add_members.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    organization: organization,
                    repo_name: projectData.repo_name,
                    members: members
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    callback(true);
                } else {
                    showResult('Ошибка GitHub API: ' + data.message, 'error');
                    callback(false);
                }
            })
            .catch(error => {
                showResult('Ошибка сети: ' + error.message, 'error');
                callback(false);
            });
        });
    }
    
    // Интерфейс задачи
    function showTaskInterface() {
        document.getElementById('taskInterface').style.display = 'block';
        loadTaskRepo();
        setupTaskEvents();
    }
    
    function loadTaskRepo() {
        // Сначала получаем ID проекта задачи
        BX24.callMethod('tasks.task.get', { taskId: contextId }, function(result) {
            if (result.error()) {
                document.getElementById('noTaskRepo').style.display = 'block';
                return;
            }
            
            const task = result.data().task;
            const groupId = task.groupId;
            
            if (!groupId) {
                document.getElementById('noTaskRepo').style.display = 'block';
                return;
            }
            
            // Получаем репозиторий проекта
            const projectOptionKey = `github_project_${groupId}`;
            BX24.callMethod('app.option.get', {}, function(result) {
                if (result.error()) return;
                
                const options = result.data();
                const projectData = options[projectOptionKey] ? JSON.parse(options[projectOptionKey]) : null;
                
                if (projectData && projectData.repo_url) {
                    document.getElementById('taskRepo').style.display = 'block';
                    document.getElementById('noTaskRepo').style.display = 'none';
                    
                    document.getElementById('taskRepoLink').href = projectData.repo_url;
                    document.getElementById('taskRepoLink').textContent = projectData.repo_name || projectData.repo_url;
                    
                    // Загружаем связь задачи
                    const taskOptionKey = `github_task_${contextId}`;
                    const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : {};
                    document.getElementById('task_branch').value = taskData.branch || '';
                } else {
                    document.getElementById('noTaskRepo').style.display = 'block';
                }
            });
        });
    }
    
    function setupTaskEvents() {
        document.getElementById('updateTaskLinkBtn').addEventListener('click', function() {
            const branch = document.getElementById('task_branch').value;
            
            const taskOptionKey = `github_task_${contextId}`;
            const options = {};
            options[taskOptionKey] = JSON.stringify({ branch: branch });
            
            BX24.callMethod('app.option.set', { options: options }, function(result) {
                if (result.error()) {
                    showResult('Ошибка сохранения: ' + result.error(), 'error');
                } else {
                    showResult('Связь обновлена!', 'success');
                }
            });
        });
    }
    
    // Вспомогательные функции
    function showMembers(members) {
        if (members && members.length > 0) {
            const membersList = document.getElementById('membersList');
            const membersListContent = document.getElementById('membersListContent');
            
            membersListContent.innerHTML = '';
            members.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member;
                membersListContent.appendChild(li);
            });
            
            membersList.style.display = 'block';
        }
    }
    
    function showResult(message, type) {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `<div class="${type}">${message}</div>`;
        
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 5000);
    }
});