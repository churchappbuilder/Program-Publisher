'use strict';

// Takes the screenshots of the app shown on the project's website (site/img/ui-*.jpg) by running the real
// app with the invented sample churches and schools from tools/sample-programs.js.
//   npx electron tools/make-screenshots.js
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'img');
fs.mkdirSync(OUT, { recursive: true });
process.env.BF_DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pp-shots-')), 'shots.db');

const main = require(path.join(ROOT, 'src', 'main', 'main.js'));
const { ORGS, EXAMPLES } = require('./sample-programs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function seed() {
  const db = main._db();
  const ids = {};
  for (const [key, o] of Object.entries(ORGS)) {
    const org = db.createOrg({ name: o.name, kind: o.kind, tagline: o.tagline, address: o.address, phone: o.phone, website: o.website,
      primary_color: o.primary_color, accent_color: o.accent_color, heading_font: o.heading_font, body_font: o.body_font });
    ids[key] = org.id;
    let first = null;
    for (const l of o.logos) {
      const a = db.addAsset({ orgId: org.id, kind: 'logo', name: l.name, role: l.role, mime: 'image/svg+xml', data: Buffer.from(l.svg) });
      if (!first) first = a;
    }
    db.updateOrg(org.id, { logo_asset_id: first.id });
  }
  const { FORMATS } = require('../src/shared/paper');
  for (const ex of EXAMPLES) {
    db.createTemplate(ids[ex.org], { name: ex.label, service_type: ex.org === 'heritage' || ex.org === 'cornerstone' ? 'school' : ex.id,
      format_id: ex.format, color_id: ex.color, weight_id: '24bond', content: ex.content });
  }
  return ids;
}

app.whenReady().then(() => {
  // seed before the window opens so the app starts with real-looking data
  const dbReady = new Promise((resolve) => setTimeout(resolve, 600));
  dbReady.then(() => {});
});

let started = false;
app.on('browser-window-created', (_e, win) => {
  win.webContents.on('console-message', (...a) => {
    const m = a[0] && a[0].message !== undefined ? a[0] : { level: a[1], message: a[2] };
    if (m.level === 'error' || m.level === 3) console.log('PAGE-ERR', m.message);
  });
  win.webContents.once('did-finish-load', async () => {
    if (!win.webContents.getURL().endsWith('index.html') || started) return;
    started = true;
    const ev = (js) => win.webContents.executeJavaScript(js);
    const click = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const shot = async (name) => {
      await sleep(500);
      let img = await win.webContents.capturePage();
      if (img.getSize().width > 1700) img = img.resize({ width: 1700, quality: 'best' });
      fs.writeFileSync(path.join(OUT, name + '.jpg'), img.toJPEG(88));
      console.log(name, img.getSize().width + 'x' + img.getSize().height);
    };
    try {
      win.setContentSize(1440, 900);
      await sleep(1200);
      const ids = seed();
      await ev(`refreshOrgs(${ids.grace})`);
      await ev(`document.getElementById('orgDialog').open && document.getElementById('orgDialog').close()`);
      await sleep(2500);

      // 1. start screen
      await shot('ui-home');

      // 2. the editor with a finished program
      await ev(`openTemplate([...state.templates].find(t => t.name === 'Christmas Eve').id)`);
      await sleep(1500);
      await shot('ui-editor');

      // 3. the cover designer
      await click('#coverOpen'); await sleep(900);
      await shot('ui-cover');
      await click('#cv_done'); await sleep(400);

      // 4. the fill-in sheet
      await click('#sheetOpen'); await sleep(900);
      await shot('ui-sheet');
      await click('#sh_close'); await sleep(300);

      // 5. the New program wizard (a church)
      await click('#homeBtn'); await sleep(900);
      await click('#newProgram'); await sleep(400);
      await ev(`[...document.querySelectorAll('#wizBody .choice')].find(b => /Church service/.test(b.textContent)).click()`); await sleep(400);
      await ev(`document.querySelector('input[name="wq_tradition"][value="lutheran-elca"]').click()`); await sleep(400);
      await ev(`document.querySelector('input[name="wq_service"][value="communion"]').click()`); await sleep(500);
      await shot('ui-wizard');

      // 6. the wizard for a school graduation
      await click('#homeBtn'); await sleep(500);
      await ev(`(async () => { document.getElementById('orgSelect').value = ${ids.heritage}; await selectOrg(${ids.heritage}); })()`); await sleep(2500);
      await shot('ui-home-school');
      await click('#newProgram'); await sleep(400);
      await ev(`[...document.querySelectorAll('#wizBody .choice')].find(b => /School program/.test(b.textContent)).click()`); await sleep(400);
      await ev(`document.querySelector('input[name="wq_kind"][value="graduation"]').click()`); await sleep(300);
      await ev(`document.querySelector('input[name="wq_gradLevel"][value="college"]').click()`); await sleep(500);
      await shot('ui-wizard-school');

      // 7. logos
      await click('#homeBtn'); await sleep(400);
      await ev(`(async () => { document.getElementById('orgSelect').value = ${ids.grace}; await selectOrg(${ids.grace}); })()`); await sleep(1500);
      await click('#orgManage'); await sleep(900);
      await ev(`document.getElementById('logoList').scrollIntoView({ block: 'center' })`); await sleep(500);
      await shot('ui-logos');
    } catch (e) {
      console.log('ERROR', e && e.stack || e);
    }
    app.quit();
  });
});
