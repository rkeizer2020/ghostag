# Time Blender v2

Nieuwe graphics en animaties voor de hoofdpersoon van Timeblends.

- `time-blender-v2.js`: de personage-code. Deze vervangt het blok in `demo/time-blender-demo.html` vanaf `/* ===== Time Blender, posed like the Knight` tot vlak vóór `/* ===== Fifteen smooth 2D factory rooms`. De functienamen en coördinaten blijven gelijk.
- `time-blender-v2.html`: een voorbeeldpagina met een testveld waarin je kunt spelen, alle animaties, en knoppen om het bericht en de code te kopiëren voor je code-chat.
- `forge-v2.js` + `forge-v2.html`: de Sunrise Forge (kamer 15) in de stijl van het personage. Vervangt `function drawForge(c,cam,t)` in het spel; de pagina laat hem zien met de held ernaast.
- `time-blender-v2-code.html`: een pagina met alleen de instructies en de volledige code (personage en forge), om aan je code-chat te geven.
- `preview.template.html` + `build.py`: hiermee maak je alle pagina's opnieuw (ook met `forge.template.html`) nadat je de `.js` hebt aangepast (`python3 timeblends/build.py`).

Nieuw in `poseFor(st, o)`: de toestanden `'heal'`, `'hurt'` en `'ko'`, en de waarden `o.heal`, `o.hurt`, `o.ko` en `o.fill`. Die zijn allemaal optioneel.
