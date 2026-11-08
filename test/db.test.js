'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { open } = require('../src/main/db');

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-test-'));
  const file = path.join(dir, 'test.db');
  return { db: open(file), dir };
}

test('organizations: create, update, list, delete', () => {
  const { db, dir } = tempDb();
  const a = db.createOrg({ name: 'Grace Church' });
  db.createOrg({ name: 'Grace School', primary_color: '#aa0000' });
  assert.strictEqual(db.listOrgs().length, 2);
  assert.strictEqual(a.heading_font, 'Georgia');

  const u = db.updateOrg(a.id, { phone: '555-1234', bogus: 'ignored' });
  assert.strictEqual(u.phone, '555-1234');
  assert.strictEqual(u.bogus, undefined);

  assert.throws(() => db.createOrg({ name: '   ' }));
  assert.throws(() => db.updateOrg(a.id, { name: '' }));

  db.deleteOrg(a.id);
  assert.strictEqual(db.listOrgs().length, 1);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('assets: stored per organization, cascade on delete, logo cleared', () => {
  const { db, dir } = tempDb();
  const org = db.createOrg({ name: 'Org' });
  const logo = db.addAsset({ orgId: org.id, kind: 'logo', name: 'logo.png', mime: 'image/png', data: Buffer.from([1, 2, 3]) });
  db.addAsset({ orgId: org.id, kind: 'font', name: 'My Font', mime: 'font/ttf', data: Buffer.from([9]) });
  db.updateOrg(org.id, { logo_asset_id: logo.id });

  assert.strictEqual(db.listAssets(org.id).length, 2);
  assert.strictEqual(db.listAssets(org.id, 'font').length, 1);
  assert.strictEqual(db.getAssetData(logo.id).base64, Buffer.from([1, 2, 3]).toString('base64'));

  db.deleteAsset(logo.id);
  assert.strictEqual(db.getOrg(org.id).logo_asset_id, null);

  db.deleteOrg(org.id);
  assert.strictEqual(db.listAssets(org.id).length, 0);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('templates: content round-trips as JSON, duplicate, cascade', () => {
  const { db, dir } = tempDb();
  const org = db.createOrg({ name: 'Org' });
  const t = db.createTemplate(org.id, {
    name: 'Morning', service_type: 'morning', content: { title: 'Hi', items: ['a', 'b'] }
  });
  assert.deepStrictEqual(t.content.items, ['a', 'b']);

  const u = db.updateTemplate(t.id, { format_id: 'legal', content: { title: 'Changed' } });
  assert.strictEqual(u.format_id, 'legal');
  assert.strictEqual(u.content.title, 'Changed');

  const copy = db.duplicateTemplate(t.id);
  assert.strictEqual(copy.name, 'Morning (copy)');
  assert.strictEqual(db.listTemplates(org.id).length, 2);

  db.deleteOrg(org.id);
  assert.strictEqual(db.listTemplates(org.id).length, 0);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('settings and migration version persist across reopen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-test-'));
  const file = path.join(dir, 'p.db');
  let db = open(file);
  db.setSetting('lastOrg', 7);
  db.close();
  db = open(file);
  assert.strictEqual(db.getSetting('lastOrg'), '7');
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('text library: per-organization texts, update, delete, cascade', () => {
  const { db, dir } = tempDb();
  const a = db.createOrg({ name: 'A' });
  const b = db.createOrg({ name: 'B' });
  const t = db.createText(a.id, { name: "Apostles' Creed (our wording)", body: 'I believe...' });
  db.createText(b.id, { name: 'Other', body: 'x' });
  assert.strictEqual(db.listTexts(a.id).length, 1);
  assert.strictEqual(db.updateText(t.id, { name: 'Creed', body: 'changed' }).body, 'changed');
  assert.throws(() => db.createText(a.id, { name: ' ', body: 'x' }));
  db.deleteOrg(a.id);
  assert.strictEqual(db.listTexts(a.id).length, 0);
  assert.strictEqual(db.listTexts(b.id).length, 1);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
