// usage: node render.js <cards.json> <outDir>
// Image paths in the JSON ("image" on any card) are resolved relative to the JSON file.
// A cover/outro with an image becomes a full-bleed photo card; other card types get a top banner.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Cloud containers ship Playwright under /opt/node-tools; a local npm install also works.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node-tools/node_modules/playwright'));
}

const [, , jsonPath, outDir] = process.argv;
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const baseDir = path.dirname(path.resolve(jsonPath));
const fontDir = path.join(__dirname, 'fonts');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
const img = (p) => `url('file://${path.resolve(baseDir, p)}')`;
const A = data.accent;
const total = data.cards.length;

const css = `
@font-face{font-family:K;font-weight:400;src:url(file://${fontDir}/nskr-400.woff2) format('woff2')}
@font-face{font-family:K;font-weight:700;src:url(file://${fontDir}/nskr-700.woff2) format('woff2')}
@font-face{font-family:K;font-weight:900;src:url(file://${fontDir}/nskr-900.woff2) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#ddd}
.card{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:K;color:#141824;
  background:#F6F4EF;padding:110px 96px;display:flex;flex-direction:column;letter-spacing:-0.02em;word-break:keep-all}
.card > :not(.bg):not(.aimark){position:relative;z-index:1}
.card.dark{background:${A};color:#fff}
.card.photo{background:#000;color:#fff}
.bg{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}
.bg::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,.2) 45%,rgba(0,0,0,.85) 70%,rgba(0,0,0,.95) 100%)}
.soften .bg::before{content:'';position:absolute;inset:-60px;backdrop-filter:blur(26px) saturate(.45) brightness(.5);
  -webkit-mask-image:radial-gradient(ellipse 30% 34% at var(--fx,80%) var(--fy,36%),transparent 55%,#000 100%);
  mask-image:radial-gradient(ellipse 30% 34% at var(--fx,80%) var(--fy,36%),transparent 55%,#000 100%)}
.soften .bg::after{background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,.2) 45%,rgba(0,0,0,.85) 70%,rgba(0,0,0,.95) 100%),
  linear-gradient(90deg,rgba(6,8,20,.7) 0%,rgba(6,8,20,.35) 40%,rgba(0,0,0,0) 62%)}
.top{display:flex;justify-content:space-between;font-size:30px;font-weight:700;opacity:.55}
.photo .top{opacity:.85}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.photo .body{justify-content:flex-end;padding-bottom:40px}
.withimg .body{justify-content:flex-start}
.banner{flex:none;height:340px;border-radius:28px;background-size:cover;background-position:center;margin:32px 0 40px}
.aimark{position:absolute;right:96px;bottom:52px;font-size:22px;opacity:.5;z-index:1}
.kicker{display:inline-block;align-self:flex-start;background:#fff;color:${A};font-weight:900;font-size:40px;padding:12px 30px 16px;border-radius:999px;margin-bottom:56px}
.photo .kicker{background:${A};color:#fff}
.cover h1{font-size:122px;line-height:1.18;font-weight:900}
.cover .sub{font-size:42px;margin-top:56px;opacity:.85;font-weight:400;line-height:1.5}
.big .label{font-size:48px;font-weight:700;color:${A}}
.big .value{font-size:190px;font-weight:900;line-height:1.1;margin:24px 0 40px}
.big .note{font-size:44px;font-weight:700;background:#fff;border-radius:24px;padding:36px 40px;line-height:1.4}
h2{font-size:84px;font-weight:900;line-height:1.2;margin-bottom:64px}
.withimg h2{font-size:72px;margin-bottom:28px}
table{width:100%;border-collapse:collapse;font-size:46px}
td{padding:46px 0;border-bottom:3px solid #14182422}
td.k{font-weight:900;width:26%} td.h{opacity:.55;width:28%} td.v{text-align:right;font-weight:900;color:${A}}
.item{display:flex;align-items:center;gap:36px;margin-bottom:58px}
.withimg .item{margin-bottom:38px}
.num{flex:none;width:84px;height:84px;border-radius:50%;background:${A};color:#fff;font-weight:900;font-size:44px;line-height:1;display:flex;align-items:center;justify-content:center;padding-bottom:6px;margin-top:3px}
.item b{display:block;font-size:52px;font-weight:900;line-height:1.3;margin-bottom:8px}
.withimg .item b{font-size:46px;margin-bottom:4px}
.item span{display:block;font-size:40px;line-height:1.45;opacity:.75}
.withimg .item span{font-size:36px}
.foot{font-size:32px;opacity:.6;line-height:1.5}
.tl{display:flex;gap:40px;padding:40px 0;border-bottom:3px solid #14182422}
.withimg .tl{padding:22px 0}
.tl .d{flex:none;width:150px;font-size:44px;font-weight:900;color:${A}}
.tl b{display:block;font-size:46px;font-weight:900;margin-bottom:10px}
.tl span{font-size:38px;line-height:1.45;opacity:.75}
.withimg .tl span{font-size:34px}
.outro h1{font-size:110px;line-height:1.2;font-weight:900}
.outro .sub{font-size:44px;margin-top:48px;opacity:.9}
.source{font-size:28px;opacity:.7}
`;

function inner(c) {
  const banner = c.image && c.type !== 'cover' && c.type !== 'outro' ? `<div class="banner" style="background-image:${img(c.image)}"></div>` : '';
  switch (c.type) {
    case 'cover':
      return `<div class="body cover"><div class="kicker">${esc(c.kicker)}</div><h1>${esc(c.title)}</h1><div class="sub">${esc(c.sub)}</div></div>`;
    case 'big':
      return `<div class="body big">${banner}<div class="label">${esc(c.label)}</div><div class="value">${esc(c.value)}</div><div class="note">${esc(c.note)}</div></div><div class="foot">${esc(c.foot)}</div>`;
    case 'table':
      return `<div class="body">${banner}<h2>${esc(c.title)}</h2><table>${c.rows.map((r) => `<tr><td class="k">${esc(r[0])}</td><td class="h">${esc(r[1])}</td><td class="v">${esc(r[2])}</td></tr>`).join('')}</table></div><div class="foot">${esc(c.foot)}</div>`;
    case 'list':
      return `<div class="body">${banner}<h2>${esc(c.title)}</h2>${c.items.map((it, i) => `<div class="item"><div class="num">${i + 1}</div><div><b>${esc(it[0])}</b><span>${esc(it[1])}</span></div></div>`).join('')}</div>`;
    case 'timeline':
      return `<div class="body">${banner}<h2>${esc(c.title)}</h2>${c.rows.map((r) => `<div class="tl"><div class="d">${esc(r[0])}</div><div><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div></div>`).join('')}</div>${c.foot ? `<div class="foot">${esc(c.foot)}</div>` : ''}`;
    case 'outro':
      return `<div class="body outro"><h1>${esc(c.title)}</h1><div class="sub">${esc(c.sub)}</div></div><div class="source">${esc(c.source)}</div>`;
  }
}

const html = `<!doctype html><meta charset="utf-8"><style>${css}</style>` +
  data.cards.map((c, i) => {
    const full = c.image && (c.type === 'cover' || c.type === 'outro');
    const cls = full ? `photo${c.soften ? ' soften' : ''}` : c.image ? 'withimg' : c.type === 'cover' || c.type === 'outro' ? 'dark' : '';
    const focus = c.focus ? `;--fx:${c.focus[0]};--fy:${c.focus[1]}` : '';
    const bg = full ? `<div class="bg" style="background-image:${img(c.image)}${focus}"></div>` : '';
    const mark = c.image ? `<div class="aimark">${esc(c.credit || 'AI 생성 이미지')}</div>` : '';
    return `<section class="card ${cls}" id="c${i}">${bg}<div class="top"><span>${esc(data.handle)}</span><span>${i + 1} / ${total}</span></div>${inner(c)}${mark}</section>`;
  }).join('');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(os.tmpdir(), `cards-${process.pid}.html`);
  fs.writeFileSync(htmlPath, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto('file://' + htmlPath);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  for (let i = 0; i < total; i++) {
    await page.locator('#c' + i).screenshot({ path: path.join(outDir, `card-${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  console.log('rendered', total);
})();
