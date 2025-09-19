BX24.ready(function () {
    const contextTypeElement = document.getElementById('contextType');
    const contextIdElement = document.getElementById('contextId');
    const contextType = contextTypeElement ? contextTypeElement.value : 'settings';
    const contextId = contextIdElement ? contextIdElement.value : null;

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

    function showGlobalSettings() {
        const globalSettings = document.getElementById('globalSettings');
        if (!globalSettings) return;
        globalSettings.style.display = 'block';
        loadGlobalSettings();
        const globalSettingsForm = document.getElementById('globalSettingsForm');
        if (globalSettingsForm) {
            globalSettingsForm.addEventListener('submit', function (e) {
                e.preventDefault();
                saveGlobalSettings();
            });
        }
    }
    function loadGlobalSettings() {
        BX24.callMethod('app.option.get', {}, function (result) {
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
        setAppOptions({ options: options }).then(res => {
            if (res.success) {
                showResult('Настройки сохранены', 'success');
            } else {
                showResult('Ошибка сохранения: ' + (res.message || 'Неизвестная ошибка'), 'error');
            }
        });
    }

    function showProjectInterface() {
        const projectInterface = document.getElementById('projectInterface');
        if (!projectInterface) return;
        projectInterface.style.display = 'block';
        loadProjectRepo();
        setupProjectEvents();
    }
    function loadProjectRepo() {
        const optionKey = `github_project_${contextId}`;
        BX24.callMethod('app.option.get', {}, function (result) {
            if (result.error()) return;
            const options = result.data();
            const projectData = options[optionKey] ? JSON.parse(options[optionKey]) : null;
            if (projectData && projectData.repo_url) {

                showCurrentRepository(projectData);
            } else {

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


        if (contextType === 'project' && contextId) {


            BX24.callMethod('sonet_group.get', {
                'FILTER': {
                    'ID': contextId
                }
            }, function (result) {
                if (!result.error() && result.data().length > 0) {
                    const projectName = result.data()[0].NAME;
                    const repoNameInput = document.getElementById('new_repo_name');
                    if (repoNameInput && projectName) {
                        const transliteratedName = transliterateAndClean(projectName);

                        repoNameInput.value = `${transliteratedName}_${contextId}`;
                    }
                } else {


                    console.warn("Не удалось получить название проекта для автозаполнения");
                }
            });
        }

    }
    function setupProjectEvents() {

        const repoActions = document.querySelectorAll('input[name="repoAction"]');
        repoActions.forEach(radio => {
            radio.addEventListener('change', function () {
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
    window.showResult = showResult;

    function transliterateAndClean(name) {
        if (!name) return '';

        const ru = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
            'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
            'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
            'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
            'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
            'э': 'e', 'ю': 'yu', 'я': 'ya',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
            'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
            'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
            'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
            'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
            'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
            'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        };


        let result = name.split('').map(function (char) {
            return ru[char] || char;
        }).join('');

        result = result.replace(/[^a-zA-Z0-9_\-]/g, '_');

        result = result.replace(/_+/g, '_');

        result = result.replace(/^_+|_+$/g, '');

        result = result.toLowerCase();

        if (result === '' || /^\d/.test(result)) {
            result = 'repo_' + result;
        }

        return result || 'unnamed_repo';
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

        BX24.callMethod('app.option.get', {}, function (result) {
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

                        const actualRepoName = data.repo_name || repoNameValue;
                        const projectData = {
                            repo_name: actualRepoName,
                            repo_url: data.url,
                            members: []
                        };
                        saveProjectRepo(projectData, function (success) {
                            if (success) {
                                showResult('Репозиторий создан: ' + data.url, 'success');

                                showCurrentRepository(projectData);
                            } else {
                                showResult('Репозиторий создан, но ошибка сохранения: ' + data.url, 'warning');

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

        if (!data.repo_name && data.repo_url) {
            const matches = data.repo_url.match(/github\.com\/[^\/]+\/([^\/]+)/);
            if (matches && matches[1]) {
                data.repo_name = matches[1];
            }
        }
        options[optionKey] = JSON.stringify(data);
        setAppOptions({ options: options }).then(res => { 
            if(res.success) {
                showResult('Настройки сохранены', 'success');
            }else{
                showResult('Ошибка сохранения: ' + (res.message || 'Неизвестная ошибка'), 'error');
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

        const optionKey = `github_project_${contextId}`;
        BX24.callMethod('app.option.get', {}, function (result) {
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

            addMembersToGithub(projectData, members, function (success) {
                if (success) {

                    projectData.members = members;
                    const newOptions = {};
                    newOptions[optionKey] = JSON.stringify(projectData);
                    setAppOptions({ options: newOptions }).then(res => {
                        if (res.success) {
                            showResult('Участники добавлены в GitHub и сохранены!', 'success');
                            showMembers(members);
                        } else {
                            showResult('Ошибка сохранения: ' + (res.message || 'Неизвестная ошибка'), 'error');
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

        BX24.callMethod('app.option.get', {}, function (result) {
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

            let repoName = projectData.repo_name;
            if (projectData.repo_url) {

                const matches = projectData.repo_url.match(/github\.com\/[^\/]+\/([^\/]+)/);
                if (matches && matches[1]) {
                    repoName = matches[1];
                    console.log('Extracted repo name from URL:', repoName);
                }
            }

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

    function showTaskInterface() {
        const taskInterface = document.getElementById('taskInterface');
        if (!taskInterface) return;
        taskInterface.style.display = 'block';
        loadTaskRepo();
        setupTaskEvents();
    }
    function loadTaskRepo() {

        BX24.callMethod('tasks.task.get', { taskId: contextId }, function (result) {
            if (result.error()) {
                showTaskSetupInterface(null, false);
                return;
            }
            const task = result.data().task;
            const groupId = task.groupId;
            const hasGroup = !!groupId;


            const taskOptionKey = `github_task_${contextId}`;
            BX24.callMethod('app.option.get', {}, function (optionResult) {
                if (optionResult.error()) {
                    showTaskSetupInterface(null, hasGroup);
                    return;
                }
                const options = optionResult.data();
                const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : null;
                if (taskData && taskData.repo_url) {

                    showTaskRepoInterface(taskData);
                } else if (groupId) {

                    const projectOptionKey = `github_project_${groupId}`;
                    const projectData = options[projectOptionKey] ? JSON.parse(options[projectOptionKey]) : null;
                    if (projectData && projectData.repo_url) {

                        showTaskSetupInterface(projectData, hasGroup);
                    } else {

                        showTaskSetupInterface(null, hasGroup);
                    }
                } else {

                    showTaskSetupInterface(null, hasGroup);
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


        const useProjectRepoSection = document.getElementById('useProjectRepo');
        const createTaskRepoSection = document.getElementById('createTaskRepo');
        const selectTaskRepoSection = document.getElementById('selectTaskRepo');

        if (useProjectRepoSection) useProjectRepoSection.style.display = 'none';
        if (createTaskRepoSection) createTaskRepoSection.style.display = 'none';
        if (selectTaskRepoSection) selectTaskRepoSection.style.display = 'none';


        const taskRepoOptions = document.querySelectorAll('input[name="taskRepoOption"]');
        taskRepoOptions.forEach(radio => {
            radio.checked = false;
        });


        if (hasGroup && projectData && useProjectRepoSection && projectRepoLink) {

            if (projectOptionLabel) projectOptionLabel.style.display = 'block';
            useProjectRepoSection.style.display = 'none';
            projectRepoLink.href = projectData.repo_url;
            projectRepoLink.textContent = projectData.repo_name || projectData.repo_url;
        } else {

            if (projectOptionLabel) projectOptionLabel.style.display = 'none';
            if (useProjectRepoSection) useProjectRepoSection.style.display = 'none';
        }


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
        if (taskMembersList) {
            taskMembersList.value = taskData.members ? taskData.members.join(',') : '';
        }
        if (taskData.members) {
            showTaskMembers(taskData.members);
        }


        if (taskBranch) {

            if (taskData.branch) {
                taskBranch.value = taskData.branch;
            } else {

                BX24.callMethod('tasks.task.get', { taskId: contextId }, function (result) {
                    if (!result.error()) {
                        const taskName = result.data().task.title;
                        if (taskName && !taskBranch.value) {
                            const transliteratedName = transliterateAndClean(taskName);

                            taskBranch.value = `task-${contextId}-${transliteratedName}`;
                        }
                    } else {
                        console.error("Ошибка получения задачи для автозаполнения ветки:", result.error());

                        if (!taskBranch.value) {
                            taskBranch.value = `task-${contextId}`;
                        }
                    }
                });
            }


            if (taskData.branch && openBranchBtn) {
                openBranchBtn.style.display = 'inline-block';
                openBranchBtn.onclick = function () {
                    window.open(`${taskData.repo_url}/tree/${taskData.branch}`, '_blank');
                };
            } else if (openBranchBtn) {
                openBranchBtn.style.display = 'none';
            }


            taskBranch.addEventListener('input', function () {
                if (this.value && openBranchBtn) {
                    openBranchBtn.style.display = 'inline-block';
                    openBranchBtn.onclick = function () {
                        window.open(`${taskData.repo_url}/tree/${taskBranch.value}`, '_blank');
                    };
                } else if (openBranchBtn) {
                    openBranchBtn.style.display = 'none';
                }
            });
        }
    }
    function setupTaskRepoOptions() {
        const taskRepoOptions = document.querySelectorAll('input[name="taskRepoOption"]');
        taskRepoOptions.forEach(radio => {
            radio.addEventListener('change', function () {
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


                    const taskRepoName = document.getElementById('task_repo_name');
                    const taskRepoDescription = document.getElementById('task_repo_description');
                    if (taskRepoName) {

                        BX24.callMethod('tasks.task.get', { taskId: contextId }, function (taskResult) {
                            if (!taskResult.error()) {
                                const taskName = taskResult.data().task.title;
                                if (taskName) {
                                    const transliteratedName = transliterateAndClean(taskName);

                                    taskRepoName.value = `${transliteratedName}/${contextId}`;
                                } else {

                                    taskRepoName.value = `task-${contextId}-${Date.now()}`;
                                }
                            } else {
                                console.error("Ошибка получения задачи для автозаполнения названия:", taskResult.error());

                                taskRepoName.value = `task-${contextId}-${Date.now()}`;
                            }
                        });


                    }
                    if (taskRepoDescription) {
                        taskRepoDescription.value = `Репозиторий для задачи #${contextId}`;
                    }


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

        const setupTaskRepo = document.getElementById('setupTaskRepo');
        if (setupTaskRepo) {
            setupTaskRepo.addEventListener('click', function () {
                loadTaskRepo();
            });
        }

        const confirmProjectRepo = document.getElementById('confirmProjectRepo');
        if (confirmProjectRepo) {
            confirmProjectRepo.addEventListener('click', useProjectRepository);
        }

        const createTaskRepoBtn = document.getElementById('createTaskRepoBtn');
        if (createTaskRepoBtn) {
            createTaskRepoBtn.addEventListener('click', createTaskRepository);
        }

        const selectTaskRepoBtn = document.getElementById('selectTaskRepoBtn');
        if (selectTaskRepoBtn) {
            selectTaskRepoBtn.addEventListener('click', selectTaskRepository);
        }

        const updateTaskLinkBtn = document.getElementById('updateTaskLinkBtn');
        if (updateTaskLinkBtn) {
            updateTaskLinkBtn.addEventListener('click', updateTaskLink);
        }

        const updateTaskMembersBtn = document.getElementById('updateTaskMembersBtn');
        if (updateTaskMembersBtn) {
            updateTaskMembersBtn.addEventListener('click', updateTaskMembers);
        }

        const changeTaskRepoBtn = document.getElementById('changeTaskRepo');
        if (changeTaskRepoBtn) {
            changeTaskRepoBtn.addEventListener('click', function () {
                showTaskSetupInterface();
            });
        }

        const createBranchBtn = document.getElementById('createBranchBtn');
        if (createBranchBtn) {
            createBranchBtn.addEventListener('click', createBranch);
        }

        const taskBranch = document.getElementById('task_branch');
        if (taskBranch) {
            taskBranch.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    createBranch();
                }
            });
        }

        setupTaskRepoOptions();
    }
    function useProjectRepository() {

        BX24.callMethod('tasks.task.get', { taskId: contextId }, function (result) {
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


            const projectOptionKey = `github_project_${groupId}`;
            BX24.callMethod('app.option.get', {}, function (optionResult) {
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


                const taskName = task.title;
                let branchName = `task/${contextId}`;

                if (taskName) {
                    const transliteratedName = transliterateAndClean(taskName);

                    const maxLength = 50;
                    const truncatedName = transliteratedName.substring(0, maxLength).replace(/_+$/, '');
                    if (truncatedName) {
                        branchName = `${truncatedName}/${contextId}`;
                    }
                }


                const taskData = {
                    repo_url: projectData.repo_url,
                    repo_name: projectData.repo_name,
                    branch: branchName,
                    from_project: true,
                    members: projectData.members || []
                };

                saveTaskRepo(taskData, function (success) {
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

        let members = [];
        if (repoMembers && repoMembers.value) {
            members = repoMembers.value.split(',').map(s => s.trim()).filter(s => s);
        }
        const isPrivate = repoPrivate ? repoPrivate.checked : true;
        const withReadme = repoReadme ? repoReadme.checked : true;
        showResult('Создание репозитория...', 'info');

        BX24.callMethod('app.option.get', {}, function (result) {
            if (result.error()) {
                showResult('Ошибка получения настроек: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            if (!options.github_api_key || !options.github_organization) {
                showResult('Сначала настройте глобальные настройки GitHub', 'error');
                return;
            }

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

                        saveTaskRepo(taskData, function (success) {
                            if (success) {

                                if (members.length > 0) {
                                    showResult('Добавление участников в репозиторий...', 'info');
                                    addMembersToTaskRepo(taskData, members, function (addSuccess) {
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

        const matches = repoUrl.value.match(/github\.com\/[^\/]+\/([^\/]+)/);
        const repoName = matches ? matches[1] : repoUrl.value;

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
        saveTaskRepo(taskData, function (success) {
            if (success) {
                showResult('Репозиторий привязан!', 'success');
                showTaskRepoInterface(taskData);

                if (members.length > 0) {
                    addMembersToTaskRepo(taskData, members, function (addSuccess) {
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
        setAppOptions({ options: options }).then(res => {
            if (callback) callback(res.success);
        });
    }
    function addMembersToTaskRepo(taskData, members, callback) {

        BX24.callMethod('app.option.get', {}, function (result) {
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

        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function (result) {
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

            addMembersToTaskRepo(taskData, members, function (success) {
                if (success) {

                    taskData.members = members;
                    const newOptions = {};
                    newOptions[taskOptionKey] = JSON.stringify(taskData);
                    setAppOptions({ options: newOptions }).then(res => {
                        if (res.success) {
                            showResult('Участники добавлены в GitHub и сохранены!', 'success');
                            showTaskMembers(members);
                        } else {
                            showResult('Ошибка сохранения: ' + (res.message || 'Неизвестная ошибка'), 'error');
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
        BX24.callMethod('tasks.task.get', { taskId: contextId }, function (result) {
            if (result.error()) return;
            const task = result.data().task;
            const assignees = task.responsible || [];
            if (assignees.length > 0) {
                const membersInput = document.getElementById('task_repo_members');
                if (membersInput) {


                    const githubUsers = assignees.map(a => a.name || a.lastName || 'user').join(',');
                    membersInput.value = '';
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
        BX24.callMethod('app.option.get', {}, function (result) {
            if (result.error()) {
                showResult('Ошибка получения данных: ' + result.error(), 'error');
                return;
            }
            const options = result.data();
            const taskData = options[taskOptionKey] ? JSON.parse(options[taskOptionKey]) : {};
            taskData.branch = branch;
            const newOptions = {};
            newOptions[taskOptionKey] = JSON.stringify(taskData);
            setAppOptions({ options: newOptions }).then(saveResult => {
                if (saveResult.error()) {
                    showResult('Ошибка сохранения: ' + saveResult.error(), 'error');
                } else {
                    showResult('Связь обновлена!', 'success');

                    const openBranchBtn = document.getElementById('openBranchBtn');
                    if (branch && openBranchBtn) {
                        openBranchBtn.style.display = 'inline-block';
                        openBranchBtn.onclick = function () {
                            window.open(`${taskData.repo_url}/tree/${branch}`, '_blank');
                        };
                    } else if (openBranchBtn) {
                        openBranchBtn.style.display = 'none';
                    }
                }
            });
        });
    }

    function createBranch() {
        const branchName = document.getElementById('task_branch');
        if (!branchName || !branchName.value) {
            showResult('Укажите название ветки', 'error');
            return;
        }
        const branch = branchName.value.trim();

        const taskOptionKey = `github_task_${contextId}`;
        BX24.callMethod('app.option.get', {}, function (result) {
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

            BX24.callMethod('app.option.get', {}, function (globalResult) {
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


                fetch(`https://api.github.com/repos/${organization}/${taskData.repo_name}/git/refs/heads/main`, {
                    headers: {
                        'Authorization': `token ${apiKey}`,
                        'User-Agent': 'Bitrix24-GitHub-App'
                    }
                })
                    .then(response => {
                        if (!response.ok) {

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

                            const openBranchBtn = document.getElementById('openBranchBtn');
                            if (openBranchBtn) {
                                openBranchBtn.style.display = 'inline-block';
                                openBranchBtn.onclick = function () {
                                    window.open(`${taskData.repo_url}/tree/${branch}`, '_blank');
                                };
                            }

                            taskData.branch = branch;
                            const newOptions = {};
                            newOptions[taskOptionKey] = JSON.stringify(taskData);
setAppOptions({ options: newOptions }).then(res => { console.log(res); });
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
    function setAppOptions(optionsOrPair) {
        return fetch('saveOptions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optionsOrPair)
        }).then(r => r.json());
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
