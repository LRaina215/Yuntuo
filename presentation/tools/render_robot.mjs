// 渲染透明底整车图：node tools/render_robot.mjs [整车 GLB] [视图名]
// 默认读取 ../Structure/YunTuo_full_assembly_20261029/YunTuo_full_assembly.glb（相对总仓库所在目录）。
// 依赖 playwright-core（D:/tools/pptx_build/node_modules）与本机 Chrome。
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(process.env.PPTX_BUILD_NODE || 'D:/tools/pptx_build/node_modules/');
const { chromium } = require('playwright-core');
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const glb = resolve(process.argv[2] || resolve(root, '../../Structure/YunTuo_full_assembly_20261029/YunTuo_full_assembly.glb'));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const views = [
  { name: 'robot-hero', w: 2400, h: 1800, theta: 2.38, phi: 1.12, zoom: 0.8 },
  { name: 'robot-front', w: 2400, h: 1800, theta: 3.6, phi: 1.18, zoom: 0.8 },
];

const model = readFileSync(glb).toString('base64');
const browser = await chromium.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(here, 'render_robot.html')).href);
for (const v of views.filter(v => !process.argv[3] || v.name === process.argv[3])) {
  const url = await page.evaluate(([m, o]) => renderRobot(m, o), [model, v]);
  writeFileSync(resolve(root, 'assets', `${v.name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  await page.evaluate(() => document.querySelectorAll('canvas').forEach(c => c.remove()));
  console.log('wrote', v.name, 'from', glb);
}
await browser.close();
