<?php
require_once (__DIR__.'/crest.php');
$install_result = CRest::installApp();

// URL обработчика приложения
$handlerBackUrl = ($_SERVER['HTTPS'] === 'on' || $_SERVER['SERVER_PORT'] === '443' ? 'https' : 'http') . '://'
	. $_SERVER['SERVER_NAME']
	. (in_array($_SERVER['SERVER_PORT'],	['80', '443'], true) ? '' : ':' . $_SERVER['SERVER_PORT'])
	. str_replace($_SERVER['DOCUMENT_ROOT'], '',__DIR__)
	. '/index.php';

// Привязываем к проектам
$result1 = CRest::call(
	'placement.bind',
	[
		'PLACEMENT' => 'SONET_GROUP_DETAIL_TAB',
		'HANDLER' => $handlerBackUrl,
		'TITLE' => 'GitHub'
	]
);
CRest::setLog(['group_tab' => $result1], 'installation');

// Привязываем к задачам
$result2 = CRest::call(
	'placement.bind',
	[
		'PLACEMENT' => 'TASK_VIEW_TAB',
		'HANDLER' => $handlerBackUrl,
		'TITLE' => 'GitHub'
	]
);
CRest::setLog(['task_tab' => $result2], 'installation');

if($install_result['rest_only'] === false):?>
<head>
	<script src="//api.bitrix24.com/api/v1/"></script>
	<?if($install_result['install'] == true):?>
	<script>
		BX24.init(function(){
			BX24.installFinish();
		});
	</script>
	<?endif;?>
</head>
<body>
	<?if($install_result['install'] == true):?>
		GitHub Integration установлена успешно!<br>
		Группы: <?= $result1['result'] ? '✅' : '❌' ?><br>
		Задачи: <?= $result2['result'] ? '✅' : '❌' ?>
	<?else:?>
		Ошибка установки
	<?endif;?>
</body>
<?endif;