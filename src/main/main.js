'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { FORMATS, WEIGHTS, COLORS } = require('../shared/paper');
const { SERVICE_TYPES } = require('../shared/presets');
const { BUILTIN_TEXTS } = require('../shared/texts');
const { CATECHISMS, formatQA } = require('../shared/catechism');
const { open } = require('./db');

let db;

const IMAGE_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
const FONT_EXT = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
const MAX_BYTES = { logo: 10 * 1024 * 1024, font: 20 * 1024 * 1024, image: 10 * 1024 * 1024 };

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'Program Publisher',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  return win;
}

function starterTemplates(orgId, org) {
  // Only churches start with weekly services. A school's programs are one-offs, so it starts empty
  // and picks from the start screen's School templates.
  if (org.kind === 'school' || org.kind === 'other') return;
  for (const id of ['morning', 'evening']) {
    const s = SERVICE_TYPES.find((x) => x.id === id);
    db.createTemplate(orgId, {
      name: s.name,
      service_type: s.id,
      format_id: org.default_format_id,
      color_id: org.default_color_id,
      weight_id: org.default_weight_id,
      content: { title: s.title, subtitle: s.subtitle, date: '', body: s.body, sheetMode: s.sheetMode || 'service' }
    });
  }
}

// ---------- PDF export ----------
// A hidden window renders the bulletin at true size, then Chromium saves it as PDF.

const printJobs = new Map(); // webContents id -> { job, resolve }

async function exportPdf({ templateId, mode, includeColor, filePath }) {
  const tpl = db.getTemplate(templateId);
  if (!tpl) throw new Error('Template not found.');
  const org = db.getOrg(tpl.org_id);
  const format = FORMATS.find((f) => f.id === tpl.format_id);
  const color = COLORS.find((c) => c.id === tpl.color_id);
  if (!format) throw new Error('Unknown paper format.');

  let logoUrl = null;
  if (org.logo_asset_id) {
    const d = db.getAssetData(org.logo_asset_id);
    if (d) logoUrl = `data:${d.mime};base64,${d.base64}`;
  }
  let coverUrl = null;
  let coverLogoUrl = null;
  const cv = tpl.content && tpl.content.cover;
  if (cv && cv.logoId) {
    const d = db.getAssetData(Number(cv.logoId));
    if (d) coverLogoUrl = `data:${d.mime};base64,${d.base64}`;
  }
  if (cv && cv.art && cv.art.kind === 'asset' && cv.art.id) {
    const d = db.getAssetData(Number(cv.art.id));
    if (d) coverUrl = `data:${d.mime};base64,${d.base64}`;
  }
  const fonts = db.listAssets(org.id, 'font').map((a) => ({ name: a.name, ...db.getAssetData(a.id) }));

  const job = {
    format, org, content: tpl.content, logoUrl, coverUrl, coverLogoUrl, fonts,
    mode: mode === 'pages' ? 'pages' : 'sheets',
    // Paper color is normally left out: you print on colored stock, you don't print the color.
    paperHex: includeColor && color ? color.hex : '#ffffff'
  };

  const win = new BrowserWindow({
    show: false, width: 1000, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const id = win.webContents.id;
  let timer;
  const ready = new Promise((resolve, reject) => {
    printJobs.set(id, { job, resolve });
    timer = setTimeout(() => reject(new Error('Timed out while preparing the PDF.')), 30000);
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'print.html'));
  try {
    const info = await ready;
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    fs.writeFileSync(filePath, pdf);
    return { filePath, ...info, foldNote: format.panels > 1 && job.mode === 'sheets' };
  } finally {
    clearTimeout(timer);
    printJobs.delete(id);
    win.destroy();
  }
}

function registerIpc() {
  ipcMain.handle('print:getJob', (e) => {
    const p = printJobs.get(e.sender.id);
    return p ? p.job : null;
  });
  ipcMain.handle('print:ready', (e, info) => {
    const p = printJobs.get(e.sender.id);
    if (p) p.resolve(info);
  });
  ipcMain.handle('export:pdf', async (e, templateId, opts) => {
    const tpl = db.getTemplate(templateId);
    if (!tpl) throw new Error('Template not found.');
    const win = BrowserWindow.fromWebContents(e.sender);
    const safe = tpl.name.replace(/[\\/:*?"<>|]+/g, '-');
    const res = await dialog.showSaveDialog(win, {
      title: 'Save bulletin as PDF',
      defaultPath: path.join(app.getPath('documents'), `${safe}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (res.canceled || !res.filePath) return null;
    const result = await exportPdf({ templateId, ...opts, filePath: res.filePath });
    shell.showItemInFolder(result.filePath);
    return result;
  });

  ipcMain.handle('paper:catalog', () => ({ formats: FORMATS, weights: WEIGHTS, colors: COLORS }));
  ipcMain.handle('presets:serviceTypes', () => SERVICE_TYPES);

  ipcMain.handle('orgs:list', () => db.listOrgs());
  ipcMain.handle('orgs:create', (_e, data) => {
    const org = db.createOrg(data);
    starterTemplates(org.id, org);
    return org;
  });
  ipcMain.handle('orgs:update', (_e, id, data) => db.updateOrg(id, data));
  ipcMain.handle('orgs:delete', (_e, id) => db.deleteOrg(id));

  ipcMain.handle('assets:list', (_e, orgId, kind) => db.listAssets(orgId, kind));
  ipcMain.handle('assets:data', (_e, id) => db.getAssetData(id));
  ipcMain.handle('assets:delete', (_e, id) => db.deleteAsset(id));
  ipcMain.handle('assets:update', (_e, id, data) => db.updateAsset(id, data));
  ipcMain.handle('assets:pick', async (e, orgId, kind) => {
    const exts = kind === 'font' ? FONT_EXT : IMAGE_EXT;
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showOpenDialog(win, {
      title: kind === 'font' ? 'Choose a font file' : kind === 'image' ? 'Choose a picture' : 'Choose a logo image',
      properties: ['openFile'],
      filters: [{ name: kind === 'font' ? 'Fonts' : 'Images', extensions: Object.keys(exts) }]
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const file = res.filePaths[0];
    const ext = path.extname(file).slice(1).toLowerCase();
    if (!exts[ext]) throw new Error('That file type is not supported.');
    if (fs.statSync(file).size > MAX_BYTES[kind]) throw new Error('That file is too large.');
    const base = path.basename(file, path.extname(file));
    return db.addAsset({ orgId, kind, name: base, mime: exts[ext], data: fs.readFileSync(file) });
  });

  ipcMain.handle('templates:list', (_e, orgId) => db.listTemplates(orgId));
  ipcMain.handle('templates:create', (_e, orgId, serviceTypeId) => {
    const org = db.getOrg(orgId);
    const s = SERVICE_TYPES.find((x) => x.id === serviceTypeId) || SERVICE_TYPES[SERVICE_TYPES.length - 1];
    return db.createTemplate(orgId, {
      name: s.name,
      service_type: s.id,
      format_id: org.default_format_id,
      color_id: org.default_color_id,
      weight_id: org.default_weight_id,
      content: { title: s.title, subtitle: s.subtitle, date: '', body: s.body, sheetMode: s.sheetMode || 'service' }
    });
  });
  ipcMain.handle('templates:update', (_e, id, data) => db.updateTemplate(id, data));
  ipcMain.handle('templates:duplicate', (_e, id) => db.duplicateTemplate(id));
  ipcMain.handle('templates:delete', (_e, id) => db.deleteTemplate(id));

  ipcMain.handle('app:version', () => require('../../package.json').version);
  ipcMain.handle('catechism:list', () => CATECHISMS);
  ipcMain.handle('catechism:text', (_e, id, from, to, refs) => {
    const meta = CATECHISMS.find((c) => c.id === id);
    if (!meta) throw new Error('Unknown catechism.');
    const file = path.join(__dirname, '..', 'data', 'catechisms', meta.file + '.json');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    return formatQA(doc, from, to, { refs: !!refs });
  });
  ipcMain.handle('texts:builtin', () => BUILTIN_TEXTS);
  ipcMain.handle('texts:list', (_e, orgId) => db.listTexts(orgId));
  ipcMain.handle('texts:create', (_e, orgId, data) => db.createText(orgId, data));
  ipcMain.handle('texts:update', (_e, id, data) => db.updateText(id, data));
  ipcMain.handle('texts:delete', (_e, id) => db.deleteText(id));

  ipcMain.handle('settings:get', (_e, key) => db.getSetting(key));
  ipcMain.handle('settings:set', (_e, key, value) => db.setSetting(key, value));
}

app.whenReady().then(() => {
  const dbFile = process.env.BF_DB || path.join(app.getPath('userData'), 'program-publisher.db');
  db = open(dbFile);
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});

module.exports = { exportPdf, _db: () => db }; // _db is for the automated tests
