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

      // page navigation: front cover, inside pages, back cover, then the printed sheets
      console.log('NAV', await ev(`[...document.querySelectorAll('#navChips .navChip')].map((b) => b.textContent).join(' | ')`));
      await ev(`document.querySelector('#navChips .navChip:nth-child(2)').click()`); await sleep(500);
      await shot('ui-pages');
      await ev(`document.querySelector('#navChips .navChip:last-child').click()`); await sleep(400);
      console.log('NAV-BACK', await ev(`document.querySelector('#sheet [data-role=back]') ? 'back shown' : 'NO BACK'`));
      await ev(`document.getElementById('navMode').click()`); await sleep(500);
      console.log('NAV-PRINT', await ev(`[...document.querySelectorAll('#navChips .navChip')].map((b) => b.textContent).join(' | ')`));
      await ev(`document.getElementById('navMode').click()`); await sleep(400);
      await ev(`document.querySelector('#navChips .navChip:first-child').click()`); await sleep(300);

      // a free text box on the back page, then undo and redo it
      await ev(`document.getElementById('boxPanel').open = true`); await sleep(300);
      await click('#boxAddText'); await sleep(600);
      await ev(`(() => { const t = document.getElementById('bx_text'); t.value = '# Potluck Sunday\\nBring a dish to share after worship.'; t.dispatchEvent(new Event('input')); })()`);
      await sleep(900);
      await ev(`document.querySelector('.sidebar').scrollTop = 99999`); await sleep(300);
      await shot('ui-boxes');
      console.log('UNDO', await ev(`(() => { const a = document.getElementById('undoBtn').disabled; document.getElementById('undoBtn').click(); return JSON.stringify({ disabledBefore: a, boxes: (state.tpl.content.boxes || []).length }); })()`));
      await sleep(500);
      await ev(`document.getElementById('redoBtn').click()`); await sleep(500);
      console.log('REDO', await ev(`(state.tpl.content.boxes || []).length`));
      await ev(`document.getElementById('boxPanel').open = false`); await sleep(300);
      console.log('CHECKS', await ev(`document.getElementById('checks').innerText`));

      // 3. the cover designer
      await click('#coverOpen'); await sleep(900);
      await shot('ui-cover');
      await ev(`document.querySelector('#cv_styles .cvStyle[data-id="custom"]').click()`); await sleep(900);
      await ev(`document.querySelector('#cv_pieces .piece:nth-child(7)').click()`); await sleep(400);
      await ev(`document.querySelector('#cv_pieceBtns [data-a="bigger"]').click()`); await sleep(700);
      await shot('ui-cover-custom');
      await ev(`document.querySelector('#cv_styles .cvStyle[data-id="picture"]').click()`); await sleep(400);
      await click('#cv_done'); await sleep(400);

      // the back page designer
      await click('#backOpen'); await sleep(700);
      await ev(`document.querySelector('#bk_styles .cvStyle[data-id="announce"]').click()`); await sleep(500);
      await ev(`(() => { const t = document.getElementById('bk_text'); t.value = '# Announcements\\n- Potluck after worship next Sunday\\n- Nursery volunteers are needed\\n- Pray for our missionaries this month\\n\\n# This week\\n[table]\\nToday | 9:00 AM | Sunday School\\nToday | 10:00 AM | Morning Worship\\nTuesday | 7:00 PM | Young Adults\\nWednesday | 10:00 AM | Women\\'s Bible Study\\n[/table]'; t.dispatchEvent(new Event('input')); })()`);
      await sleep(900);
      await shot('ui-back');
      await click('#bk_done'); await sleep(300);

      // lists, tables and Bible passages
      await click('#namesOpen'); await sleep(500);
      await ev(`(() => { const k = document.getElementById('nm_kind'); k.value = 'scripture'; k.dispatchEvent(new Event('change')); })()`); await sleep(300);
      await shot('ui-insert');
      await click('#nm_cancel'); await sleep(300);

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
      // end to end: the Literary Night program from the school wizard
      await ev(`(window.confirm = () => true, document.getElementById('orgDialog').open && document.getElementById('orgDialog').close(), 0)`);
      try {
        await click('#homeBtn'); await sleep(400);
        const fresh = main._db().createOrg({ name: 'Fresh Start Academy', kind: 'school' });
        await ev(`(async () => { await refreshOrgs(${fresh.id}); })()`); await sleep(1800);
        console.log('LIT start', await ev(`state.view + ' org=' + state.org.name + ' tpls=' + state.templates.length`));
        await click('#newProgram'); await sleep(400);
        console.log('LIT wiz1', (await ev(`document.getElementById('wizBody').innerText`)).slice(0, 120).replace(/\n/g, ' / '));
        await ev(`[...document.querySelectorAll('#wizBody .choice')].find(b => /School program/.test(b.textContent)).click()`); await sleep(500);
        console.log('LIT wiz2', (await ev(`document.getElementById('wizBody').innerText`)).slice(0, 160).replace(/\n/g, ' / '), await ev(`document.getElementById('wizNext').textContent`));
        await ev(`document.querySelector('input[name="wq_kind"][value="showcase"]').click()`); await sleep(500);
        for (let i = 0; i < 6; i++) {
          if (await ev(`state.view === 'editor'`)) break;
          await click('#wizNext'); await sleep(600);
        }
        console.log('LIT view', await ev(`state.view`), await ev(`state.tpl ? state.tpl.content.title : 'NO TEMPLATE'`));
        await sleep(800);
        console.log('LIT chips', await ev(`[...document.querySelectorAll('#navChips .navChip')].map(b => b.textContent).join(' | ')`));
        await shot('lit-front');
        console.log('LIT side before', await ev(`state.side`));
        await ev(`document.querySelector('#navChips .navChip:nth-child(2)').click()`);
        for (let k = 0; k < 4; k++) { await sleep(300); console.log('LIT side after', k, await ev(`state.side + ' views=' + (state.views || []).length + ' on=' + document.querySelector('#navChips .navChip.on').textContent`)); }
        await shot('lit-inside');
        console.log('LIT checks', (await ev(`document.getElementById('checks').innerText`)).replace(/\n/g, ' / '));
        await ev(`document.querySelector('#navChips .navChip:last-child').click()`); await sleep(500);
        await shot('lit-back');
        console.log('LIT body', JSON.stringify((await ev(`state.tpl.content.body`)).slice(0, 400)));
        await click('#sheetOpen'); await sleep(900);
        await shot('lit-sheet');
        await click('#sh_close'); await sleep(300);
      } catch (e) { console.log('LIT-ERROR', e && e.message); }
      // PDF export with crop marks and as a one-sheet test page
      const tid = await ev('state.tpl.id');
      for (const [label, opts] of [['plain', {}], ['crop', { crop: true }], ['test', { test: true }]]) {
        const out = path.join(os.tmpdir(), `pp-${label}.pdf`);
        const r = await main.exportPdf({ templateId: tid, mode: 'sheets', includeColor: false, filePath: out, ...opts });
        const pdf = fs.readFileSync(out, 'latin1');
        const box = (pdf.match(/\/MediaBox\s*\[([^\]]+)\]/) || [])[1];
        console.log('PDF', label, 'sheets=' + r.sheets, 'mediabox=' + box);
      }
    } catch (e) {
      console.log('ERROR', e && e.stack || e);
    }
    app.quit();
  });
});
