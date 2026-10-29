// slides.html → 可编辑 PPTX：node tools/html2pptx.mjs [输出.pptx]
// data-ppt="text|shape|img|line" 的元素按浏览器中的实际位置转成 PPT 文本框、形状、图片和箭头；
// 其余装饰（光晕、点阵）隐藏上述元素后截图，作为每页背景图。
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(process.env.PPTX_BUILD_NODE || 'D:/tools/pptx_build/node_modules/');
const { chromium } = require('playwright-core');
const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || resolve(root, 'yuntuo_tech_intro.pptx'));
const tmp = resolve(process.env.HTML2PPTX_TMP || 'D:/tools/tmp/html2pptx');
mkdirSync(tmp, { recursive: true });
const IN = v => +(v / 144).toFixed(4);           // 1920 px 画布 = 13.333 in
const PT = v => +(v / 2).toFixed(2);             // 1 px = 0.5 pt
const YAHEI = 'Microsoft YaHei', BAHN = 'Bahnschrift';
const isCJK = ch => /[\u2E80-\u9FFF\u3000-\u303F\uFF00-\uFFEF\u201C\u201D]/.test(ch);

function extract(section) {
  const base = section.getBoundingClientRect();
  const rgba = s => {
    const m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    return { hex: [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(), a };
  };
  const items = [];
  for (const el of section.querySelectorAll('[data-ppt]')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), type = el.dataset.ppt;
    const box = { type, x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    if (type === 'shape') {
      const bw = cs.borderTopStyle === 'none' ? 0 : parseFloat(cs.borderTopWidth);
      items.push({ ...box, fill: rgba(cs.backgroundColor), border: bw ? { w: bw, c: rgba(cs.borderTopColor) } : null, radius: parseFloat(cs.borderTopLeftRadius) || 0 });
    } else if (type === 'img') {
      items.push({ ...box, src: el.getAttribute('src') });
    } else if (type === 'line') {
      items.push({ ...box, cls: [...el.classList], c: rgba(cs.backgroundColor) });
    } else if (type === 'text') {
      // 浏览器自动换行的位置也转成显式换行，PPT 中每行内容与网页一致。
      const runs = [], range = document.createRange();
      let last = null;
      const walk = n => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) {
            const s = getComputedStyle(c.parentElement), size = parseFloat(s.fontSize);
            const style = { color: rgba(s.color).hex, size, bold: +s.fontWeight >= 600, font: s.fontFamily, ls: parseFloat(s.letterSpacing) || 0 };
            const src = c.textContent;
            let chunk = '';
            for (let k = 0; k < src.length; k++) {
              if (src[k].trim()) {
                range.setStart(c, k); range.setEnd(c, k + 1);
                const q = range.getClientRects()[0];
                if (q) {
                  // 换行：字符回到左侧且位置下移（同一行内不同字号的文字只会右移）
                  if (last && q.left < last.left && q.top > last.top + 1) {
                    if (chunk.replace(/\s+/g, ' ')) runs.push({ t: chunk.replace(/\s+/g, ' '), ...style });
                    runs.push({ br: true });
                    chunk = '';
                  }
                  last = q;
                }
              }
              chunk += src[k];
            }
            if (chunk.replace(/\s+/g, ' ')) runs.push({ t: chunk.replace(/\s+/g, ' '), ...style });
          } else if (c.nodeName === 'BR') { runs.push({ br: true }); last = null; }
          else if (c.nodeType === 1) walk(c);
        }
      };
      walk(el);
      const lh = parseFloat(cs.lineHeight);
      items.push({ ...box, runs, align: cs.textAlign, lh: isNaN(lh) ? parseFloat(cs.fontSize) * 1.32 : lh });
    }
  }
  return items;
}

function addText(slide, it) {
  const paras = [[]];
  for (const r of it.runs) r.br ? paras.push([]) : paras.at(-1).push(r);
  const runs = [];
  paras.forEach((p, pi) => {
    if (p.length) { p[0].t = p[0].t.replace(/^ /, ''); p.at(-1).t = p.at(-1).t.replace(/ $/, ''); }
    if (!p.length) p.push({ t: '', color: 'ECF3F4', size: it.lh / 1.4, bold: false, font: YAHEI, ls: 0 });
    p.forEach((r, ri) => runs.push({
      text: r.t,
      options: {
        fontFace: r.font.includes(BAHN) ? BAHN : YAHEI, fontSize: PT(r.size), color: r.color, bold: r.bold,
        ...(r.ls ? { charSpacing: PT(r.ls) } : {}),
        ...(ri === p.length - 1 && pi < paras.length - 1 ? { breakLine: true } : {}),
      },
    }));
  });
  const align = { start: 'left', left: 'left', center: 'center', right: 'right', end: 'right' }[it.align] || 'left';
  // 部分渲染器（如 LibreOffice）会在中西文之间自动加宽间距，按中西文交界数预留宽度，避免意外换行。
  const extra = Math.max(0, ...paras.map(p => {
    const s = p.map(r => r.t).join('').replace(/\s+/g, '');
    let n = 0;
    for (let k = 1; k < s.length; k++) if (isCJK(s[k - 1]) !== isCJK(s[k])) n++;
    return n * 0.3 * Math.max(0, ...p.map(r => r.size));
  }));
  const slack = Math.max(10, it.w * 0.04) + extra;
  const x = align === 'left' ? it.x : align === 'center' ? it.x - slack / 2 : it.x - slack;
  slide.addText(runs, {
    x: IN(x), y: IN(it.y), w: IN(it.w + slack), h: IN(it.h + 4), margin: 0, valign: 'top', align,
    lineSpacing: PT(it.lh), paraSpaceBefore: 0, paraSpaceAfter: 0, fit: 'none',
  });
}

function addShape(pptx, slide, it) {
  const o = { x: IN(it.x), y: IN(it.y), w: IN(it.w), h: IN(it.h) };
  if (it.fill && it.fill.a > 0) o.fill = { color: it.fill.hex, transparency: Math.round((1 - it.fill.a) * 100) };
  if (it.border) o.line = { color: it.border.c.hex, width: PT(it.border.w), transparency: Math.round((1 - it.border.c.a) * 100) };
  if (it.radius) { o.rectRadius = IN(Math.min(it.radius, it.w / 2, it.h / 2)); slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, o); }
  else slide.addShape(pptx.shapes.RECTANGLE, o);
}

function addLine(pptx, slide, it) {
  const v = it.cls.includes('v'), up = it.cls.includes('up'), both = it.cls.includes('both'), head = !it.cls.includes('plain');
  const line = { color: it.c.hex, width: PT(v ? it.w : it.h) };
  let o;
  if (v) {
    const cx = it.x + it.w / 2;
    o = up ? { x: IN(cx), y: IN(it.y - 14), w: 0, h: IN(it.h + 14) } : { x: IN(cx), y: IN(it.y), w: 0, h: IN(it.h + (head ? 14 : 0)) };
    if (head) line[up ? 'beginArrowType' : 'endArrowType'] = 'triangle';
  } else {
    const cy = it.y + it.h / 2, x0 = both ? it.x - 14 : it.x;
    o = { x: IN(x0), y: IN(cy), w: IN(it.x + it.w + (head ? 14 : 0) - x0), h: 0 };
    if (head) line.endArrowType = 'triangle';
    if (both) line.beginArrowType = 'triangle';
  }
  slide.addShape(pptx.shapes.LINE, { ...o, line });
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve(root, 'slides.html')).href + '#export');
await page.evaluate(() => document.fonts.ready);
const sections = await page.locator('section.slide').all();
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '云拓 YunTuo · 技术方案介绍';
pptx.author = '云拓 YunTuo';
pptx.theme = { headFontFace: YAHEI, bodyFontFace: YAHEI };
for (let i = 0; i < sections.length; i++) {
  const items = await sections[i].evaluate(extract);
  const hide = await page.addStyleTag({ content: '[data-ppt]{visibility:hidden!important}' });
  const bg = resolve(tmp, `bg-${String(i + 1).padStart(2, '0')}.png`);
  await sections[i].screenshot({ path: bg });
  await hide.evaluate(n => n.remove());
  const slide = pptx.addSlide();
  slide.background = { path: bg };
  for (const it of items) {
    if (it.type === 'text') addText(slide, it);
    else if (it.type === 'shape') addShape(pptx, slide, it);
    else if (it.type === 'img') slide.addImage({ path: resolve(root, it.src), x: IN(it.x), y: IN(it.y), w: IN(it.w), h: IN(it.h) });
    else if (it.type === 'line') addLine(pptx, slide, it);
  }
  console.log(`slide ${i + 1}: ${items.length} objects`);
}
await browser.close();

// 同一段落的多个文字块各自带 <a:pPr>，PowerPoint 只认段首一个；CJK 字符统一用微软雅黑；箭头放大到与网页一致。
const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }));
for (const name of Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
  let xml = await zip.file(name).async('string');
  xml = xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (m, body) => {
    let first = true;
    return '<a:p>' + body.replace(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, p => (first ? (first = false, p) : '')) + '</a:p>';
  });
  xml = xml.replaceAll(`<a:ea typeface="${BAHN}"`, `<a:ea typeface="${YAHEI}"`);
  xml = xml.replace(/<a:(head|tail)End type="triangle"\/>/g, '<a:$1End type="triangle" w="lg" len="lg"/>');
  zip.file(name, xml);
}
writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log('wrote', out);
