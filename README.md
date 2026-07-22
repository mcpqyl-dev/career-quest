# career-quest

V1.0

## Probar web local

python3 -m http.server 8000

## Transferencia silenciosa de datos a Google Sheets

El botón de descarga del Passport ahora también dispara un envío silencioso de datos de registro + progreso final.

1. Crear un Google Apps Script vinculado a una hoja y publicar un Web App (acceso: Anyone with the link).
2. Agregar en [index.html](index.html) un script antes de cargar [js/game.js](js/game.js):

```html
<script>
	window.CAREER_QUEST_WEBHOOK_URL = 'https://script.google.com/macros/s/TU_WEBHOOK/exec';
</script>
```

3. El payload se envía en JSON cada vez que el usuario pulsa "Capturar y descargar Passport".

### Ejemplo de Apps Script (Code.gs)

```javascript
function doPost(e) {
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('data');
	var payload = JSON.parse(e.postData.contents || '{}');

	var registration = payload.registration || {};
	var finalPassport = payload.finalPassport || {};
	var stats = finalPassport.stats || {};
	var missions = finalPassport.missionSummary || {};

	if (sheet.getLastRow() === 0) {
		sheet.appendRow([
			'generatedAt',
			'name',
			'mcpCode',
			'currentArea',
			'level',
			'xp',
			'completedQuizzes',
			'completedMissions',
			'totalMissions',
			'visitedDepartments',
			'visitedPositions',
			'achievements'
		]);
	}

	sheet.appendRow([
		payload.generatedAt || '',
		registration.name || '',
		registration.mcpCode || '',
		registration.currentArea || '',
		stats.level || 0,
		stats.xp || 0,
		stats.completedQuizzes || 0,
		missions.completed || 0,
		missions.total || 0,
		JSON.stringify(finalPassport.visitedDepartments || []),
		JSON.stringify(finalPassport.visitedPositions || []),
		JSON.stringify(finalPassport.achievements || [])
	]);

	return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}
```

## Cargar cambios a repositorio

git add .
git commit -m "Actualización del juego Career Quest"
git push origin main