'use strict';

// Renders the sample programs in tools/sample-programs.js to pictures for the project's website
// (site/img). It uses the app's own layout engine, so the pictures show exactly what the app makes.
//   npx electron tools/make-gallery.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ORGS, EXAMPLES, dataUrl } = require('./sample-programs');
const { FORMATS, COLORS } = require('../src/shared/paper');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'img');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (p) => 'file:///' + path.join(ROOT, p).replace(/\\/g, '/');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${url('src/shared/bulletin.css')}">
<style>
  html, body { margin: 0; background: #e8e5de; }
  #stage { display: inline-block; padding: 28px; }
  .sheet { box-shadow: 0 2px 4px rgba(0,0,0,.18), 0 14px 34px rgba(0,0,0,.28); }
  #grid { display: inline-flex; gap: 22px; padding: 28px; align-items: flex-start; }
  .cell p { margin: 10px 0 0; text-align: center; font: 600 15px 'Segoe UI', sans-serif; color: #3a3f48; }
</style></head><body>
<div id="stage"></div><div id="grid" hidden></div>
<script src="${url('src/shared/artwork.js')}"></script>
<script src="${url('src/shared/layout.js')}"></script>
<script>
const PPI_DEFAULT = 110;
function build(spec, ppi) {
  const geo = Layout.geometry(spec.format);
  const content = Layout.normContent(spec.content);
  const ctx = { org: spec.org, content: spec.content, logoUrl: spec.logoUrl, coverUrl: null, coverLogoUrl: null };
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  const w = (spec.mode === 'cover' ? geo.pageW : geo.sheetW) * ppi, h = geo.sheetH * ppi;
  // (a spread is two facing pages; for a folded sheet that is exactly the sheet's width)
  sheet.style.cssText = 'width:' + w + 'px;height:' + h + 'px;background:' + spec.paper + ';font-size:' + (ppi * Layout.EM_IN) + 'px;display:flex;overflow:hidden';
  Layout.setVars(sheet, spec.org);
  let sides = 0;
  let pages = 0;
  if (spec.mode === 'cover') {
    sheet.innerHTML = Layout.coverPanel(ctx, content);
  } else if (spec.mode === 'spread') {
    const layout = Layout.paginate(document, geo, ctx);
    pages = layout.pages.length;
    const left = Layout.pageHtml(layout, spec.page);
    const right = spec.page + 1 < layout.pages.length ? Layout.pageHtml(layout, spec.page + 1) : '<div class="panel"></div>';
    sheet.innerHTML = left + right;
  } else {
    const layout = Layout.paginate(document, geo, ctx);
    sides = layout.sides.length;
    sheet.innerHTML = Layout.sideHtml(layout, Math.min(spec.side, layout.sides.length - 1));
  }
  return { sheet, sides, pages };
}
window.draw = (spec) => {
  document.getElementById('grid').hidden = true;
  const stage = document.getElementById('stage'); stage.hidden = false; stage.innerHTML = '';
  const { sheet, sides, pages } = build(spec, spec.ppi || PPI_DEFAULT);
  stage.appendChild(sheet);
  Layout.fitAll(sheet);
  const r = stage.getBoundingClientRect();
  return JSON.stringify({ x: r.left, y: r.top, w: r.width, h: r.height, sides, pages });
};
window.drawGrid = (specs, ppi) => {
  document.getElementById('stage').hidden = true;
  const grid = document.getElementById('grid'); grid.hidden = false; grid.innerHTML = '';
  for (const spec of specs) {
    const cell = document.createElement('div'); cell.className = 'cell';
    const { sheet } = build(spec, ppi);
    cell.appendChild(sheet);
    const p = document.createElement('p'); p.textContent = spec.label; cell.appendChild(p);
    grid.appendChild(cell);
    Layout.fitAll(sheet);
  }
  const r = grid.getBoundingClientRect();
  return JSON.stringify({ x: r.left, y: r.top, w: r.width, h: r.height });
};
</script></body></html>`;

function orgFor(key) {
  const o = ORGS[key];
  return { ...o, logoUrl: dataUrl(o.logos[0].svg) };
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'pp-gallery.html');
  fs.writeFileSync(tmp, html);
  const win = new BrowserWindow({ show: false, width: 1700, height: 1300, webPreferences: { sandbox: false, webSecurity: false } });
  win.webContents.on('console-message', (...a) => { const m = a[0] && a[0].message !== undefined ? a[0] : { level: a[1], message: a[2] }; if (m.level === 'error' || m.level === 3) console.log('PAGE-ERR', m.message); });
  await win.loadFile(tmp);
  await sleep(500);

  const grab = async (name, rectJson, maxW) => {
    const r = JSON.parse(rectJson);
    win.setContentSize(Math.ceil(r.x + r.w + 10), Math.ceil(r.y + r.h + 10));
    await sleep(250);
    let img = await win.webContents.capturePage({ x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.w), height: Math.ceil(r.h) });
    const size = img.getSize();
    if (size.width > maxW) img = img.resize({ width: maxW, quality: 'best' });
    fs.writeFileSync(path.join(OUT, name + '.jpg'), img.toJPEG(86));
    console.log(name, img.getSize().width + 'x' + img.getSize().height);
  };

  const fmt = (id) => FORMATS.find((f) => f.id === id);
  const paper = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
  const meta = [];

  for (const ex of EXAMPLES) {
    const o = orgFor(ex.org);
    const base = { format: fmt(ex.format), paper: paper(ex.color), org: o, logoUrl: o.logoUrl, content: ex.content };
    const cover = JSON.parse(await win.webContents.executeJavaScript(`draw(${JSON.stringify({ ...base, mode: 'cover', side: 0 })})`));
    await grab(ex.id + '-cover', JSON.stringify(cover), 760);
    const s1 = JSON.parse(await win.webContents.executeJavaScript(`draw(${JSON.stringify({ ...base, mode: 'spread', page: 1 })})`));
    await grab(ex.id + '-inside', JSON.stringify(s1), 1500);
    const sides = s1.sides;
    const pageCount = s1.pages;
    let second = false;
    if (pageCount >= 6) {
      const r2 = await win.webContents.executeJavaScript(`draw(${JSON.stringify({ ...base, mode: 'spread', page: 3 })})`);
      await grab(ex.id + '-inside2', r2, 1500);
      second = true;
    }    meta.push({ id: ex.id, group: ex.group, label: ex.label, blurb: ex.blurb, org: o.name, second, pages: pageCount });
  }

  // all the cover layouts side by side
  const grace = orgFor('grace');
  const styles = [
    ['classic', 'Classic', { kind: 'none', id: '' }], ['traditional', 'Traditional', { kind: 'none', id: '' }], ['headerfooter', 'Name on top', { kind: 'none', id: '' }],
    ['picture', 'Picture feature', { kind: 'builtin', id: 'wreath' }], ['full', 'Full-page picture', { kind: 'builtin', id: 'star' }],
    ['banner', 'Color banner', { kind: 'builtin', id: 'wheat' }], ['framed', 'Framed', { kind: 'builtin', id: 'flower' }]
  ];
  const specs = styles.map(([style, label, art]) => ({
    label, mode: 'cover', side: 0, format: fmt('letter-bifold'), paper: '#ffffff', org: grace, logoUrl: grace.logoUrl,
    content: { title: 'Sunday Morning Worship', subtitle: 'The Fourth Sunday of Advent', date: 'December 20, 2026', cover: { style, art, footer: 'Worship at 8:30 and 11:00 am', show: { address: style === 'headerfooter' || style === 'traditional' } } }
  }));
  const grid = await win.webContents.executeJavaScript(`drawGrid(${JSON.stringify(specs)}, 46)`);
  await grab('covers', grid, 1900);

  fs.writeFileSync(path.join(OUT, 'gallery.json'), JSON.stringify(meta, null, 2));
  console.log('done:', meta.length, 'programs');
  app.quit();
});
