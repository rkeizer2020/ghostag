"""Builds time-blender-v2.html: the preview page with the character module inlined.
Run: python3 timeblends/build.py"""
from pathlib import Path
here = Path(__file__).parent
src = (here / 'time-blender-v2.js').read_text()
page = (here / 'preview.template.html').read_text()
assert '</script' not in src.lower()
(here / 'time-blender-v2.html').write_text(page.replace('/*@@HERO@@*/', src.strip()))
print('wrote', here / 'time-blender-v2.html')
