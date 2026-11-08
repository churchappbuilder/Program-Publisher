'use strict';

// Generates build/icon.png, src/assets/icon.png and build/icon.ico from build/icon.svg.
// Run with:  npx electron build/make-icons.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// Render once at 256px (very small windows fail to load), then scale down.
async function renderMaster() {
  const size = 256;
  const win = new BrowserWindow({
    show: false, width: size, height: size, useContentSize: true,
    frame: false, transparent: true
  });
  const tmp = path.join(__dirname, '_icon-render.html');
  fs.writeFileSync(tmp, `<html><body style="margin:0;background:transparent;overflow:hidden">` +
    `<img src="icon.svg" style="width:${size}px;height:${size}px;display:block"></body></html>`);
  try {
    await win.loadURL(require('url').pathToFileURL(tmp).href);
  } finally {
    fs.unlinkSync(tmp);
  }
  await new Promise((r) => setTimeout(r, 300));
  let img = await win.webContents.capturePage();
  // Normalize in case the display scales (HiDPI).
  if (img.getSize().width !== size) img = img.resize({ width: size, height: size, quality: 'best' });
  win.destroy();
  return img;
}

// ICO container holding PNG images.
function makeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

app.whenReady().then(async () => {
  try {
    const master = await renderMaster();
    const entries = SIZES.map((size) => ({
      size,
      png: (size === 256 ? master : master.resize({ width: size, height: size, quality: 'best' })).toPNG()
    }));
    const big = master.toPNG();
    const root = path.join(__dirname, '..');
    fs.mkdirSync(path.join(root, 'src', 'assets'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), makeIco(entries));
    fs.writeFileSync(path.join(__dirname, 'icon.png'), big);
    fs.writeFileSync(path.join(root, 'src', 'assets', 'icon.png'), big);
    console.log('Icons written:', SIZES.join(', '));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.quit();
});
