<?php
require_once 'crest.php';
$install = CRest::installApp();
/**
 * URL обработчика (index.php), который будет отрисовывать вкладки.
 * Важно: этот URL должен быть доступен из B24.
 */
$handlerBackUrl =
    ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || $_SERVER['SERVER_PORT'] == 443 ? 'https' : 'http')
    . '://' . $_SERVER['SERVER_NAME']
    . (in_array((string)$_SERVER['SERVER_PORT'], ['80', '443'], true) ? '' : ':' . $_SERVER['SERVER_PORT'])
    . rtrim(str_replace($_SERVER['DOCUMENT_ROOT'], '', __DIR__), '/')
    . '/index.php';

/**
 * Дальше всё делаем ТОЛЬКО если приложение установлено/переустановлено и токены сохранены.
 */
$bindGroup   = null;
$bindTask    = null;
$ufResult    = null;

if (!empty($install['install'])) {

    // Привязка к карточке группы (проект)
    $bindGroup = CRest::call('placement.bind', [
        'PLACEMENT' => 'SONET_GROUP_DETAIL_TAB',
        'HANDLER'   => $handlerBackUrl,
        'TITLE'     => 'GitHub'
    ]);
    CRest::setLog(['group_tab' => $bindGroup], 'installation');

    // Привязка к карточке задачи
    $bindTask = CRest::call('placement.bind', [
        'PLACEMENT' => 'TASK_VIEW_TAB',
        'HANDLER'   => $handlerBackUrl,
        'TITLE'     => 'GitHub'
    ]);
    CRest::setLog(['task_tab' => $bindTask], 'installation');

    // 1) Проверяем, есть ли уже нужное пользовательское поле
    $fieldName = 'UF_USR_GITHUB_PROFILE'; // ВАЖНО: совпадает с фронтом
    $existing = CRest::call('user.userfield.list', [
        'filter' => ['FIELD_NAME' => $fieldName],
        'order'  => ['ID' => 'asc'],
    ]);

    $needCreate = true;
    if (!empty($existing['result']) && is_array($existing['result'])) {
        foreach ($existing['result'] as $f) {
            if (!empty($f['FIELD_NAME']) && $f['FIELD_NAME'] === $fieldName) {
                $needCreate = false;
                $ufResult = ['result' => ['ID' => $f['ID']], 'notice' => 'already_exists'];
                break;
            }
        }
    }

    // 2) Если нет — создаём поле
    if ($needCreate) {
        $ufResult = CRest::call('user.userfield.add', [
            'fields' => [
                'FIELD_NAME'    => $fieldName,
                'USER_TYPE_ID'  => 'string',
                'XML_ID'        => $fieldName,
                'SORT'          => 100,
                'MULTIPLE'      => 'N',
                'MANDATORY'     => 'N',
                'SHOW_FILTER'   => 'Y',
                'SHOW_IN_LIST'  => 'Y',
                'EDIT_IN_LIST'  => 'Y',
                'EDIT_FORM_LABEL'   => ['ru' => 'GitHub профиль', 'en' => 'GitHub Profile'],
                'LIST_COLUMN_LABEL' => ['ru' => 'GitHub профиль', 'en' => 'GitHub Profile'],
                'LIST_FILTER_LABEL' => ['ru' => 'GitHub профиль', 'en' => 'GitHub Profile'],
            ]
        ]);
    }

    CRest::setLog(['userfield' => $ufResult], 'installation');
}

/**
 * Если установка идёт через форму установки (PLACEMENT=DEFAULT), отдадим html-страницу.
 */
if (isset($install['rest_only']) && $install['rest_only'] === false): ?>

    <head>
        <meta charset="utf-8">
        <script src="//api.bitrix24.com/api/v1/"></script>
        <?php if (!empty($install['install'])): ?>
            <script>
                BX24.init(function() {
                    BX24.installFinish();
                });
            </script>
        <?php endif; ?>
        <style>
            body {
                font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                padding: 24px
            }

            .ok {
                color: #0a0
            }

            .bad {
                color: #c00
            }

            code {
                background: #f6f8fa;
                padding: 2px 6px;
                border-radius: 4px
            }
        </style>
    </head>

    <body>
        <?php if (!empty($install['install'])): ?>
            <h2>GitHub Integration установлена</h2>
            <p>Обработчик: <code><?= htmlspecialchars($handlerBackUrl, ENT_QUOTES, 'UTF-8'); ?></code></p>
            <ul>
                <li>Вкладка в проектах: <span class="<?= (!empty($bindGroup['result'])) ? 'ok' : 'bad' ?>"><?= (!empty($bindGroup['result'])) ? 'OK' : 'Ошибка' ?></span></li>
                <li>Вкладка в задачах: <span class="<?= (!empty($bindTask['result'])) ? 'ok' : 'bad' ?>"><?= (!empty($bindTask['result'])) ? 'OK' : 'Ошибка' ?></span></li>
                <li>Поле пользователя <code>UF_USR_GITHUB_PROFILE</code>:
                    <span class="<?= (isset($ufResult['result'])) ? 'ok' : 'bad' ?>">
                        <?= (isset($ufResult['result'])) ? ('OK' . (!empty($ufResult['notice']) ? ' (существовало)' : '')) : 'Ошибка' ?>
                    </span>
                </li>
            </ul>
        <?php else: ?>
            <h2 class="bad">Ошибка установки</h2>
            <pre><?php print_r($install); ?></pre>
        <?php endif; ?>
    </body>
<?php endif;
