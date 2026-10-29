// 将 slides.html 逐页截图：node tools/shoot.mjs <输出目录> [页号...]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(process.env.PPTX_BUILD_NODE || 'D:/tools/pptx_build/node_modules/');
const { chromium } = require('playwright-core');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || resolve(root, 'png'));
const only = process.argv.slice(3).map(Number);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve(root, 'slides.html')).href + '#export');
await page.evaluate(() => document.fonts.ready);
const slides = await page.locator('section.slide').all();
for (let i = 0; i < slides.length; i++) {
  if (only.length && !only.includes(i + 1)) continue;
  const file = resolve(out, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await slides[i].screenshot({ path: file });
  console.log(file);
}
await browser.close();
