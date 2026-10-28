"""Build an offline, single-file project introduction. Python standard library only."""
from pathlib import Path
import base64

root=Path(__file__).resolve().parents[1]
def data_url(path,mime):
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')
template=(root/'src/template.html').read_text(encoding='utf-8')
chy=root/'assets/chy-logo.png'
if chy.exists():
    chy_html='<img src="'+data_url(chy,'image/png')+'" alt="CHY Logo">'
else:
    chy_html='<span class="chy-wordmark" aria-label="CHY">CHY</span>'
replacements={
    '/*__STYLES__*/':(root/'src/styles.css').read_text(encoding='utf-8'),
    '__FPGA_LOGO__':data_url(root/'assets/fpga-competition.jpg','image/jpeg'),
    '__CHY_LOGO__':chy_html,
    '__MINI_CODE__':data_url(root/'assets/miniprogram-code.png','image/png'),
    '/*__THREE__*/':'/*\n'+(root/'vendor/THREE-LICENSE.txt').read_text(encoding='utf-8')+'\n*/\n'+(root/'vendor/three.min.js').read_text(encoding='utf-8'),
    '/*__MODEL__*/':(root/'assets/robot-model.json').read_text(encoding='utf-8'),
    '/*__APP__*/':(root/'src/app.js').read_text(encoding='utf-8'),
}
for key,value in replacements.items():
    if template.count(key)!=1:raise ValueError('Expected exactly one '+key)
    template=template.replace(key,value)
(root/'index.html').write_bytes(template.encode('utf-8'))
print('Built showcase/index.html:',len(template.encode('utf-8')),'bytes')
