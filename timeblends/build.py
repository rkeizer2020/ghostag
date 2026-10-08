"""Builds the two pages from time-blender-v2.js and preview.template.html:
- time-blender-v2.html: the preview page with the character module inlined.
- time-blender-v2-code.html: a plain hand-off page with the instructions and the full code, for the coding chat.
Run: python3 timeblends/build.py"""
import html
from pathlib import Path
here = Path(__file__).parent
src = (here / 'time-blender-v2.js').read_text()
page = (here / 'preview.template.html').read_text()
assert '</script' not in src.lower()
(here / 'time-blender-v2.html').write_text(page.replace('/*@@HERO@@*/', src.strip()))
print('wrote', here / 'time-blender-v2.html')

msg = page.split('const MSG=`', 1)[1].split('----- CODE -----', 1)[0].rstrip()
code_page = f'''<title>Time Blender v2 code</title>
<style>
:root{{--bg:#efe9f0;--fg:#2b1d33;--muted:#6b5870;--panel:#ffffff;--line:#cdbfd2;--accent:#b8613a;--accent-fg:#ffffff}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#1a1220;--fg:#f0e2d6;--muted:#a592a8;--panel:#261a2e;--line:#4a3050;--accent:#d98348;--accent-fg:#1c1226;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#1a1220;--fg:#f0e2d6;--muted:#a592a8;--panel:#261a2e;--line:#4a3050;--accent:#d98348;--accent-fg:#1c1226;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:14px/1.6 'Courier New',monospace;padding-inline:16px;padding-block:24px 40px}}
main{{max-width:980px;margin-inline:auto;display:flex;flex-direction:column;gap:16px}}
h1{{font:700 22px/1.2 Georgia,serif;margin:0}} h2{{font:700 16px/1.2 Georgia,serif;margin:0}}
pre{{background:var(--panel);border:1px solid var(--line);padding:12px;margin:0;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:12px}}
#code{{white-space:pre;max-height:70vh}}
button{{font:700 13px 'Courier New',monospace;background:var(--accent);color:var(--accent-fg);border:0;padding:10px 14px;cursor:pointer;align-self:flex-start}}
.status{{color:var(--muted);font-size:12px}}
</style>
<main>
<h1>Time Blender v2: code voor Timeblends</h1>
<p class="status">Deze pagina bevat de instructies en de volledige personage-code (time-blender-v2.js). Voorbeeld met animaties: zie de pagina "Time Blender v2".</p>
<button id="copy" type="button">Kopieer instructies + code</button><span class="status" id="st" role="status"></span>
<h2>Instructies</h2>
<pre id="msg">{html.escape(msg)}</pre>
<h2>Code: time-blender-v2.js</h2>
<pre id="code">{html.escape(src.strip())}</pre>
</main>
<script>
document.getElementById('copy').onclick=async()=>{{const t=document.getElementById('msg').textContent+'\\n\\n----- CODE -----\\n'+document.getElementById('code').textContent+'\\n',st=document.getElementById('st');
 try{{await navigator.clipboard.writeText(t);st.textContent='Gekopieerd.'}}catch(e){{const r=document.createRange();r.selectNodeContents(document.querySelector('main'));const s=getSelection();s.removeAllRanges();s.addRange(r);st.textContent='Kopiëren mocht niet; alles is geselecteerd, druk op Ctrl+C of Cmd+C.'}}}};
</script>
'''
(here / 'time-blender-v2-code.html').write_text(code_page)
print('wrote', here / 'time-blender-v2-code.html')
