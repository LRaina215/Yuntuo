"""Build an offline, single-file project introduction. Python standard library only."""
from pathlib import Path
import base64
import json

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
    '/*__STYLES__*/':'\n'.join((root/'src'/name).read_text(encoding='utf-8') for name in ['styles.css','motion.css','presentation.css']),
    '__FPGA_LOGO__':data_url(root/'assets/fpga-competition.jpg','image/jpeg'),
    '__CHY_LOGO__':chy_html,
    '__YUNTUO_LOGO__':data_url(root/'assets/yuntuo-avatar-dark.svg','image/svg+xml'),
    '__MINI_CODE__':data_url(root/'assets/miniprogram-code.png','image/png'),
    '/*__THREE__*/':'/*\n'+(root/'vendor/THREE-LICENSE.txt').read_text(encoding='utf-8')+'\n*/\n'+(root/'vendor/three.min.js').read_text(encoding='utf-8'),
    '/*__MODEL__*/':(root/'assets/robot-model.json').read_text(encoding='utf-8'),
    '/*__SCREENS__*/':json.dumps([
        {'key':'web','title':'Web 控制台','source':'lingxunrobot.cn · 线上界面截图','src':data_url(root/'assets/web-console.png','image/png')},
        {'key':'mini-home','title':'微信小程序 · 总览','source':'微信开发者工具截图','src':data_url(root/'assets/miniprogram-home.jpg','image/jpeg')},
        {'key':'mini-assistant','title':'微信小程序 · 语音助手','source':'微信开发者工具截图','src':data_url(root/'assets/miniprogram-assistant.jpg','image/jpeg')},
    ],ensure_ascii=False,separators=(',',':')),
    '/*__APP__*/':(root/'src/app.js').read_text(encoding='utf-8'),
}
for key,value in replacements.items():
    if key not in template:raise ValueError('Missing placeholder '+key)
    template=template.replace(key,value)
(root/'index.html').write_bytes(template.encode('utf-8'))
print('Built showcase/index.html:',len(template.encode('utf-8')),'bytes')
