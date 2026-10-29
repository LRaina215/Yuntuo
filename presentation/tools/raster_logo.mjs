// 将云拓机器人标志（showcase 深色页面版本，与 Web 品牌 SVG 同一几何）栅格化为圆角 PNG。
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(process.env.PPTX_BUILD_NODE || 'D:/tools/pptx_build/node_modules/');
const { chromium } = require('playwright-core');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, '../showcase/assets/yuntuo-avatar-dark.svg'), 'utf-8');
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
// 圆角比例与介绍页 .yuntuo-mark（36px 图标、8px 圆角）一致
await page.setContent(`<style>html,body{margin:0;background:transparent}div{width:512px;height:512px;border-radius:${512 * 8 / 36}px;overflow:hidden}svg{width:512px;height:512px;display:block}</style><div>${svg}</div>`);
await page.locator('div').screenshot({ path: resolve(root, 'assets/yuntuo-mark.png'), omitBackground: true });
await browser.close();
console.log('wrote yuntuo-mark.png');
