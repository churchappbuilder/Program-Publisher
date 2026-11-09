'use strict';

// Local database layer. Uses Node's built-in SQLite (node:sqlite), so there
// are no native add-ons to compile. Everything lives in one file on the
// user's own computer.

const { DatabaseSync } = require('node:sqlite');

// Each entry upgrades the schema by one version. Never edit an old entry;
// add a new one instead so existing users' databases migrate safely.
const MIGRATIONS = [
  `
  CREATE TABLE organizations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    primary_color TEXT NOT NULL DEFAULT '#1f3a5f',
    accent_color TEXT NOT NULL DEFAULT '#b08d3c',
    heading_font TEXT NOT NULL DEFAULT 'Georgia',
    body_font TEXT NOT NULL DEFAULT 'Segoe UI',
    default_format_id TEXT NOT NULL DEFAULT 'letter-bifold',
    default_color_id TEXT NOT NULL DEFAULT 'white',
    default_weight_id TEXT NOT NULL DEFAULT '24bond',
    logo_asset_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE assets (
    id INTEGER PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('logo','font','image')),
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX assets_org ON assets(org_id, kind);
  CREATE TABLE templates (
    id INTEGER PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL DEFAULT 'general',
    format_id TEXT NOT NULL DEFAULT 'letter-bifold',
    color_id TEXT NOT NULL DEFAULT 'white',
    weight_id TEXT NOT NULL DEFAULT '24bond',
    content TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX templates_org ON templates(org_id);
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // v2: a library of reusable texts (creeds, catechism questions, a church's own wording…)
  `
  CREATE TABLE org_texts (
    id INTEGER PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX org_texts_org ON org_texts(org_id);
  `,
  // v3: what kind of organization this is (church, school, other), so the app can show the right tools
  `
  ALTER TABLE organizations ADD COLUMN kind TEXT NOT NULL DEFAULT 'church';
  `,
  // v4: what kind of logo an uploaded logo is (shield, banner, seal…), so a cover can use the right one
  `
  ALTER TABLE assets ADD COLUMN role TEXT NOT NULL DEFAULT '';
  `
];

const ORG_FIELDS = [
  'name', 'kind', 'tagline', 'address', 'phone', 'website', 'email',
  'primary_color', 'accent_color', 'heading_font', 'body_font',
  'default_format_id', 'default_color_id', 'default_weight_id', 'logo_asset_id'
];
const TEMPLATE_FIELDS = ['name', 'service_type', 'format_id', 'color_id', 'weight_id'];

function plain(row) {
  return row ? { ...row } : null;
}

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

function pick(data, allowed) {
  const out = {};
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
  return out;
}

function open(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  migrate(db);

  function update(table, id, fields, extra = '') {
    const keys = Object.keys(fields);
    if (keys.length === 0 && !extra) return;
    const sets = keys.map((k) => `${k} = ?`);
    if (extra) sets.push(extra);
    db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
  }

  const api = {
    close: () => db.close(),

    // ---- organizations ----
    listOrgs: () => db.prepare('SELECT * FROM organizations ORDER BY name COLLATE NOCASE').all().map(plain),
    getOrg: (id) => plain(db.prepare('SELECT * FROM organizations WHERE id = ?').get(id)),
    createOrg(data) {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('Organization name is required.');
      const fields = { ...pick(data, ORG_FIELDS), name };
      const keys = Object.keys(fields);
      const r = db
        .prepare(`INSERT INTO organizations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .run(...keys.map((k) => fields[k]));
      return api.getOrg(Number(r.lastInsertRowid));
    },
    updateOrg(id, data) {
      const fields = pick(data, ORG_FIELDS);
      if ('name' in fields && !String(fields.name).trim()) throw new Error('Organization name is required.');
      update('organizations', id, fields);
      return api.getOrg(id);
    },
    deleteOrg(id) {
      db.prepare('DELETE FROM organizations WHERE id = ?').run(id);
    },

    // ---- assets (logos, fonts, images) ----
    listAssets(orgId, kind) {
      const sql = 'SELECT id, org_id, kind, name, role, mime, length(data) AS size FROM assets WHERE org_id = ?' +
        (kind ? ' AND kind = ?' : '') + ' ORDER BY name COLLATE NOCASE';
      return db.prepare(sql).all(...(kind ? [orgId, kind] : [orgId])).map(plain);
    },
    addAsset({ orgId, kind, name, mime, data, role }) {
      const r = db
        .prepare('INSERT INTO assets (org_id, kind, name, role, mime, data) VALUES (?,?,?,?,?,?)')
        .run(orgId, kind, name, role || '', mime, data);
      const id = Number(r.lastInsertRowid);
      return api.listAssets(orgId).find((a) => a.id === id);
    },
    // Rename an uploaded logo or say what kind it is (shield, banner, seal...).
    updateAsset(id, data) {
      const row = db.prepare('SELECT org_id FROM assets WHERE id = ?').get(id);
      if (!row) throw new Error('Picture not found.');
      const name = String(data.name == null ? '' : data.name).trim();
      if ('name' in data && !name) throw new Error('A logo needs a name.');
      if ('name' in data) db.prepare('UPDATE assets SET name = ? WHERE id = ?').run(name, id);
      if ('role' in data) db.prepare('UPDATE assets SET role = ? WHERE id = ?').run(String(data.role || ''), id);
      return api.listAssets(row.org_id).find((a) => a.id === id);
    },
    getAssetData(id) {
      const row = db.prepare('SELECT mime, data FROM assets WHERE id = ?').get(id);
      return row ? { mime: row.mime, base64: Buffer.from(row.data).toString('base64') } : null;
    },
    deleteAsset(id) {
      db.prepare('UPDATE organizations SET logo_asset_id = NULL WHERE logo_asset_id = ?').run(id);
      db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    },

    // ---- templates ----
    listTemplates: (orgId) =>
      db.prepare('SELECT * FROM templates WHERE org_id = ? ORDER BY name COLLATE NOCASE').all(orgId).map(parseTemplate),
    getTemplate: (id) => parseTemplate(db.prepare('SELECT * FROM templates WHERE id = ?').get(id)),
    createTemplate(orgId, data) {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('Template name is required.');
      const fields = { ...pick(data, TEMPLATE_FIELDS), name, org_id: orgId, content: JSON.stringify(data.content || {}) };
      const keys = Object.keys(fields);
      const r = db
        .prepare(`INSERT INTO templates (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .run(...keys.map((k) => fields[k]));
      return api.getTemplate(Number(r.lastInsertRowid));
    },
    updateTemplate(id, data) {
      const fields = pick(data, TEMPLATE_FIELDS);
      if ('name' in fields && !String(fields.name).trim()) throw new Error('Template name is required.');
      if ('content' in data) fields.content = JSON.stringify(data.content || {});
      update('templates', id, fields, "updated_at = CURRENT_TIMESTAMP");
      return api.getTemplate(id);
    },
    duplicateTemplate(id) {
      const t = api.getTemplate(id);
      if (!t) throw new Error('Template not found.');
      return api.createTemplate(t.org_id, { ...t, name: `${t.name} (copy)` });
    },
    deleteTemplate(id) {
      db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    },

    // ---- text library (per organization) ----
    listTexts: (orgId) =>
      db.prepare('SELECT id, org_id, name, body FROM org_texts WHERE org_id = ? ORDER BY name COLLATE NOCASE').all(orgId).map(plain),
    getText: (id) => plain(db.prepare('SELECT id, org_id, name, body FROM org_texts WHERE id = ?').get(id)),
    createText(orgId, data) {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('A text needs a name.');
      const r = db.prepare('INSERT INTO org_texts (org_id, name, body) VALUES (?,?,?)').run(orgId, name, String(data.body || ''));
      return api.getText(Number(r.lastInsertRowid));
    },
    updateText(id, data) {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('A text needs a name.');
      db.prepare('UPDATE org_texts SET name = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, String(data.body || ''), id);
      return api.getText(id);
    },
    deleteText(id) {
      db.prepare('DELETE FROM org_texts WHERE id = ?').run(id);
    },

    // ---- settings ----
    getSetting(key) {
      const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return r ? r.value : null;
    },
    setSetting(key, value) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run(key, String(value));
    }
  };

  return api;
}

function parseTemplate(row) {
  if (!row) return null;
  const t = { ...row };
  try {
    t.content = JSON.parse(t.content);
  } catch {
    t.content = {};
  }
  return t;
}

module.exports = { open };
