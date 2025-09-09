BX24.ready(function() {
    
    function loadUsersWithGithubProfiles(callback) {
        
        BX24.callMethod(
            "user.get",
            {
                "FILTER": { "ACTIVE": true },
                "SELECT": ["ID", "NAME", "LAST_NAME", "UF_USR_GITHUB_PROFILE"], 
                "SORT": "ID",
                "ORDER": "ASC"
            },
            function(usersResult) {
                if (usersResult.error()) {
                    console.error("Ошибка получения списка пользователей:", usersResult.error());
                    if (callback) callback([]);
                    return;
                }

                const users = usersResult.data();
                if (users.length === 0) {
                    if (callback) callback([]);
                    return;
                }

                
                
                const firstUser = users[0];
                if (firstUser.UF_USR_GITHUB_PROFILE === undefined) {
                    
                    BX24.callMethod('user.userfield.list', {}, function(fieldsResult) {
                        if (fieldsResult.error()) {
                            console.error("Ошибка получения списка пользовательских полей:", fieldsResult.error());
                            const usersWithProfiles = users.map(u => ({ 
                                ...u, 
                                GITHUB_PROFILE: null,
                                DISPLAY_NAME: (u.NAME || '') + ' ' + (u.LAST_NAME || '')
                            }));
                            if (callback) callback(usersWithProfiles);
                            return;
                        }

                        const fields = fieldsResult.data();
                        
                        const githubField = fields.find(f => f.FIELD_NAME === 'UF_USR_GITHUB_PROFILE');
                        
                        if (!githubField) {
                            console.warn("Пользовательское поле UF_USR_GITHUB_PROFILE не найдено в списке полей");
                            const usersWithProfiles = users.map(u => ({ 
                                ...u, 
                                GITHUB_PROFILE: null,
                                DISPLAY_NAME: (u.NAME || '') + ' ' + (u.LAST_NAME || '')
                            }));
                            if (callback) callback(usersWithProfiles);
                            return;
                        } else {
                            console.log("Поле UF_USR_GITHUB_PROFILE найдено, но не было возвращено user.get. Возможно, проблема с правами или данными.");
                            
                            const usersWithProfiles = users.map(u => ({ 
                                ...u, 
                                GITHUB_PROFILE: null,
                                DISPLAY_NAME: (u.NAME || '') + ' ' + (u.LAST_NAME || '')
                            }));
                            if (callback) callback(usersWithProfiles);
                            return;
                        }
                    });
                } else {
                    
                    const usersWithProfiles = users.map(user => ({
                        ...user,
                        GITHUB_PROFILE: user.UF_USR_GITHUB_PROFILE || null,
                        DISPLAY_NAME: (user.NAME || '') + ' ' + (user.LAST_NAME || '')
                    }));

                    
                    const usersWithGithub = usersWithProfiles.filter(u => u.GITHUB_PROFILE);

                    if (callback) callback(usersWithGithub);
                }
            }
        );
    }

    
    function createUsersSelector(containerId, onUserSelectCallback) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error("Контейнер для селектора пользователей не найден:", containerId);
            return;
        }

        loadUsersWithGithubProfiles(function(usersWithProfiles) {
            if (usersWithProfiles.length === 0) {
                container.innerHTML = '<p>Пользователи с заполненными GitHub профилями не найдены.</p>';
                return;
            }

            
            const select = document.createElement('select');
            select.multiple = true;
            select.size = 5; 
            select.className = 'form-control';

            usersWithProfiles.forEach(user => {
                if (user.GITHUB_PROFILE) { 
                    const option = document.createElement('option');
                    option.value = user.GITHUB_PROFILE;
                    
                    option.textContent = `${user.DISPLAY_NAME} (${user.GITHUB_PROFILE})`;
                    option.dataset.userId = user.ID; 
                    option.dataset.githubProfile = user.GITHUB_PROFILE;
                    select.appendChild(option);
                }
            });

            container.innerHTML = '';
            container.appendChild(select);

            
            if (onUserSelectCallback) {
                select.addEventListener('change', function() {
                    const selectedOptions = Array.from(select.selectedOptions);
                    const selectedUsers = selectedOptions.map(option => ({
                        githubProfile: option.value,
                        displayName: option.textContent.split(' (')[0], 
                        userId: option.dataset.userId
                    }));
                    onUserSelectCallback(selectedUsers);
                });
            }
        });
    }

    
    function updateSelectedUsersDisplay(displayElementId, usernamesInputId, selectedUsers) {
        const displayElement = document.getElementById(displayElementId);
        const usernamesInput = document.getElementById(usernamesInputId);
        
        if (!displayElement || !usernamesInput) {
            console.error("Элементы для отображения выбранных пользователей не найдены");
            return;
        }

        if (selectedUsers.length === 0) {
            displayElement.innerHTML = '';
            usernamesInput.value = '';
            return;
        }

        
        displayElement.innerHTML = '';
        const usernames = selectedUsers.map(user => user.githubProfile);
        usernamesInput.value = usernames.join(',');

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';
        ul.style.margin = '0';
        selectedUsers.forEach(user => {
            const li = document.createElement('li');
            li.textContent = `${user.displayName} (${user.githubProfile})`;
            li.style.marginBottom = '5px';
            ul.appendChild(li);
        });
        displayElement.appendChild(ul);
    }

    
    function addSelectedUsersToInput(inputId, selectedUsernamesInputId) {
        const selectedUsernamesInput = document.getElementById(selectedUsernamesInputId);
        const membersInput = document.getElementById(inputId);
        if (selectedUsernamesInput && membersInput) {
            const selectedUsernames = selectedUsernamesInput.value;
            if (selectedUsernames) {
                const currentMembers = membersInput.value.split(',').map(m => m.trim()).filter(m => m);
                const newMembers = selectedUsernames.split(',').map(m => m.trim()).filter(m => m);
                
                
                const allMembers = [...new Set([...currentMembers, ...newMembers])];
                membersInput.value = allMembers.join(',');
                
                
                document.getElementById(selectedUsernamesInputId).value = '';
                
                const displayElementId = selectedUsernamesInputId.replace('_usernames', '').replace('selected_', 'selected-') + '-users';
                const displayElement = document.getElementById(displayElementId);
                if (displayElement) {
                    displayElement.innerHTML = '';
                }
                
                
                if (window.showResult) {
                    window.showResult('Выбранные пользователи добавлены в список участников.', 'info');
                }
            }
        }
    }

    
    function initProjectUserSelectors() {
        const contextTypeElement = document.getElementById('contextType');
        const contextType = contextTypeElement ? contextTypeElement.value : 'settings';
        
        if (contextType === 'project') {
            
            createUsersSelector('project-users-selector-container', function(selectedUsers) {
                updateSelectedUsersDisplay('selected-project-github-users', 'selected_project_github_usernames', selectedUsers);
            });
            
            
            const addSelectedBtn = document.getElementById('addSelectedProjectUsersBtn');
            if (addSelectedBtn) {
                addSelectedBtn.onclick = function() {
                    addSelectedUsersToInput('repo_members', 'selected_project_github_usernames');
                };
            }
        }
    }

    
    function initTaskUserSelectors() {
        const contextTypeElement = document.getElementById('contextType');
        const contextType = contextTypeElement ? contextTypeElement.value : 'settings';
        
        if (contextType === 'task') {
            
            createUsersSelector('task-users-selector-container-new', function(selectedUsers) {
                updateSelectedUsersDisplay('selected-task-github-users-new', 'selected_task_github_usernames_new', selectedUsers);
            });
            
            
            createUsersSelector('task-users-selector-container-existing', function(selectedUsers) {
                updateSelectedUsersDisplay('selected-task-github-users-existing', 'selected_task_github_usernames_existing', selectedUsers);
            });
            
            
            createUsersSelector('task-users-selector-container-members', function(selectedUsers) {
                updateSelectedUsersDisplay('selected-task-github-users-members', 'selected_task_github_usernames_members', selectedUsers);
            });
            
            
            document.getElementById('addSelectedTaskUsersBtnNew').onclick = function() {
                addSelectedUsersToInput('task_repo_members', 'selected_task_github_usernames_new');
            };
            
            document.getElementById('addSelectedTaskUsersBtnExisting').onclick = function() {
                addSelectedUsersToInput('existing_task_repo_members', 'selected_task_github_usernames_existing');
            };
            
            document.getElementById('addSelectedTaskUsersBtnMembers').onclick = function() {
                addSelectedUsersToInput('task_repo_members_list', 'selected_task_github_usernames_members');
            };
        }
    }

    
    function initTabHandlers() {
        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-button')) {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                
                
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                
                e.target.classList.add('active');
                
                
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                
                const activeTab = document.getElementById(tabName);
                if (activeTab) {
                    activeTab.classList.add('active');
                }
            }
        });

        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-button-task')) {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-button-task').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content-task').forEach(tab => tab.classList.remove('active'));
                const activeTab = document.getElementById(tabName);
                if (activeTab) {
                    activeTab.classList.add('active');
                }
            }
        });

        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-button-task-existing')) {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-button-task-existing').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content-task-existing').forEach(tab => tab.classList.remove('active'));
                const activeTab = document.getElementById(tabName);
                if (activeTab) {
                    activeTab.classList.add('active');
                }
            }
        });

        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-button-task-members')) {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-button-task-members').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content-task-members').forEach(tab => tab.classList.remove('active'));
                const activeTab = document.getElementById(tabName);
                if (activeTab) {
                    activeTab.classList.add('active');
                }
            }
        });
    }

    
    document.addEventListener('DOMContentLoaded', function() {
        initTabHandlers();
        initProjectUserSelectors();
        initTaskUserSelectors();
    });

    
    
    initTabHandlers();
    initProjectUserSelectors();
    initTaskUserSelectors();
});