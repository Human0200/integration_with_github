BX24.ready(function() {
    const groupId = document.getElementById('groupId').value;
    const settingsKey = `github_settings_${groupId}`;
    
    // Загружаем настройки при загрузке страницы
    loadSettings();
    
    // Сохранение настроек
    document.getElementById('settingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });
    
    // Создание репозитория
    document.getElementById('createRepoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createRepository();
    });
    
    // Загрузка настроек
    function loadSettings() {
        BX24.callMethod('app.option.get', {}, function(result) {
            if (result.error()) {
                console.error('Ошибка загрузки настроек:', result.error());
                return;
            }
            
            const allOptions = result.data();
            const settings = allOptions[settingsKey] ? JSON.parse(allOptions[settingsKey]) : {};
            
            // Заполняем форму
            document.getElementById('api_key').value = settings.api_key || '';
            document.getElementById('organization').value = settings.organization || '';
            document.getElementById('members').value = settings.members ? settings.members.join(',') : '';
            
            // Показываем участников
            if (settings.members && settings.members.length > 0) {
                showMembers(settings.members);
            }
        });
    }
    
    // Сохранение настроек
    function saveSettings() {
        const settings = {
            api_key: document.getElementById('api_key').value,
            organization: document.getElementById('organization').value,
            members: document.getElementById('members').value.split(',').map(s => s.trim()).filter(s => s)
        };
        
        const options = {};
        options[settingsKey] = JSON.stringify(settings);
        
        BX24.callMethod('app.option.set', { options: options }, function(result) {
            if (result.error()) {
                showResult('Ошибка сохранения: ' + result.error(), 'error');
            } else {
                showResult('Настройки сохранены!', 'success');
                showMembers(settings.members);
            }
        });
    }
    
    // Создание репозитория
    function createRepository() {
        const repoData = {
            repo_name: document.getElementById('repo_name').value,
            repo_description: document.getElementById('repo_description').value,
            group_id: groupId
        };
        
        // Отправляем данные на сервер
        fetch('github_api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(repoData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showResult('Репозиторий создан: <a href="' + data.url + '" target="_blank">' + data.url + '</a>', 'success');
                document.getElementById('repo_name').value = '';
                document.getElementById('repo_description').value = '';
            } else {
                showResult('Ошибка: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showResult('Ошибка сети: ' + error.message, 'error');
        });
    }
    
    // Показываем список участников
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
    
    // Показываем результат
    function showResult(message, type) {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `<div class="${type}">${message}</div>`;
        
        // Автоматически скрыть через 5 секунд
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 5000);
    }
});