'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { FORMATS, WEIGHTS, COLORS } = require('../shared/paper');
const { SERVICE_TYPES } = require('../shared/presets');
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
    title: 'Bulletin Formatter',
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
  for (const id of ['morning', 'evening']) {
    const s = SERVICE_TYPES.find((x) => x.id === id);
    db.createTemplate(orgId, {
      name: s.name,
      service_type: s.id,
      format_id: org.default_format_id,
      color_id: org.default_color_id,
      weight_id: org.default_weight_id,
      content: { title: s.title, subtitle: s.subtitle, date: '', items: s.items }
    });
  }
}

function registerIpc() {
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
  ipcMain.handle('assets:pick', async (e, orgId, kind) => {
    const exts = kind === 'font' ? FONT_EXT : IMAGE_EXT;
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showOpenDialog(win, {
      title: kind === 'font' ? 'Choose a font file' : 'Choose a logo image',
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
      content: { title: s.title, subtitle: s.subtitle, date: '', items: s.items }
    });
  });
  ipcMain.handle('templates:update', (_e, id, data) => db.updateTemplate(id, data));
  ipcMain.handle('templates:duplicate', (_e, id) => db.duplicateTemplate(id));
  ipcMain.handle('templates:delete', (_e, id) => db.deleteTemplate(id));

  ipcMain.handle('settings:get', (_e, key) => db.getSetting(key));
  ipcMain.handle('settings:set', (_e, key, value) => db.setSetting(key, value));
}

app.whenReady().then(() => {
  const dbFile = process.env.BF_DB || path.join(app.getPath('userData'), 'bulletin-formatter.db');
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
