'use strict';

const $ = (id) => document.getElementById(id);
const SYSTEM_FONTS = ['Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype', 'Segoe UI', 'Arial', 'Calibri', 'Verdana', 'Trebuchet MS'];

const state = {
  catalog: null,
  serviceTypes: [],
  orgs: [],
  org: null,          // current organization
  templates: [],
  tpl: null,          // current template
  fonts: [],          // uploaded font assets for current org
  texts: [],          // the current church's saved texts
  builtin: [],        // built-in public-domain texts
  catechisms: [],     // available catechisms
  logoUrl: null,      // data URL of current org's logo
  side: 0,            // which side of the sheet the preview shows (0 outside, 1 inside)
  view: 'home',       // which screen is showing: home | wizard | editor
  caret: null,        // last cursor position in the body text box (null = add things at the end)
  dialogOrgId: null   // org being edited in the dialog (null = new)
};

const loadedFonts = new Set();

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function fillSelect(sel, items, valueKey = 'id', labelKey = 'name') {
  sel.innerHTML = '';
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it[valueKey];
    o.textContent = it[labelKey];
    sel.appendChild(o);
  }
}

// Debounce that also lets us run any pending call immediately (flush),
// so an export never uses stale saved data.
function debounce(fn, ms) {
  let t = null;
  let pending = null;
  const run = (...a) => { pending = a; clearTimeout(t); t = setTimeout(() => { t = null; const p = pending; pending = null; return fn(...p); }, ms); };
  run.flush = async () => {
    if (t === null) return;
    clearTimeout(t); t = null;
    const p = pending; pending = null;
    await fn(...p);
  };
  return run;
}

// ---------- fonts & logo ----------

async function loadOrgFonts(orgId) {
  state.fonts = await window.api.assets.list(orgId, 'font');
  for (const f of state.fonts) {
    const key = `${f.id}:${f.name}`;
    if (loadedFonts.has(key)) continue;
    const d = await window.api.assets.data(f.id);
    if (!d) continue;
    try {
      const face = new FontFace(f.name, `url(data:${d.mime};base64,${d.base64})`);
      await face.load();
      document.fonts.add(face);
      loadedFonts.add(key);
    } catch (e) {
      console.warn('Could not load font', f.name, e);
    }
  }
}

async function loadLogo(org) {
  state.logoUrl = null;
  if (org && org.logo_asset_id) {
    const d = await window.api.assets.data(org.logo_asset_id);
    if (d) state.logoUrl = `data:${d.mime};base64,${d.base64}`;
  }
}

function fontOptions() {
  return [...SYSTEM_FONTS, ...state.fonts.map((f) => f.name)].map((n) => ({ id: n, name: n }));
}

// ---------- preview ----------

function currentContent() {
  return {
    title: $('title').value,
    subtitle: $('subtitle').value,
    date: $('date').value,
    body: $('body').value,
    plain: !!(state.tpl && state.tpl.content && state.tpl.content.plain), // inserts have no cover header
    sheetMode: (state.tpl && state.tpl.content && state.tpl.content.sheetMode) || 'service'
  };
}

function render() {
  const has = state.org && state.tpl;
  $('empty').hidden = !!state.org;
  $('sheetWrap').hidden = !has;
  $('sizeLabel').hidden = !has;
  $('editor').hidden = !state.tpl;
  if (!has) { $('fitWarn').hidden = true; $('stepper').hidden = true; return; }

  const f = state.catalog.formats.find((x) => x.id === $('format').value);
  const c = state.catalog.colors.find((x) => x.id === $('color').value);
  const w = state.catalog.weights.find((x) => x.id === $('weight').value);
  const org = state.org;
  const geo = Layout.geometry(f);

  $('formatNote').textContent = f.note;

  // Flow the text across pages and work out the printed sheets.
  const layout = Layout.paginate(document, geo, { org, content: currentContent(), logoUrl: state.logoUrl });
  const nSides = layout.sides.length;
  if (state.side >= nSides) state.side = nSides - 1;
  if (state.side < 0) state.side = 0;

  // Stepper: browse every printed side. Hidden when there is only one.
  $('stepper').hidden = nSides < 2;
  $('stepPrev').disabled = state.side === 0;
  $('stepNext').disabled = state.side === nSides - 1;
  let sideName;
  if (geo.kind === 'flat') sideName = `Page ${state.side + 1} of ${nSides}`;
  else if (geo.kind === 'trifold') sideName = state.side === 0 ? 'Outside' : 'Inside';
  else sideName = `Sheet ${Math.floor(state.side / 2) + 1} of ${nSides / 2} · ${state.side % 2 === 0 ? 'Outside' : 'Inside'}`;
  $('stepLabel').textContent = sideName;

  const stage = document.querySelector('.stage');
  const toggleH = nSides > 1 ? 50 : 0;
  const scale = Math.max(10, Math.min((stage.clientWidth - 64) / f.width, (stage.clientHeight - 110 - toggleH) / f.height));
  const sheet = $('sheet');
  sheet.style.width = f.width * scale + 'px';
  sheet.style.height = f.height * scale + 'px';
  sheet.style.background = c.hex;
  sheet.style.fontSize = scale * 0.17 + 'px'; // same 0.17in-per-em ratio the PDF uses
  Layout.setVars(sheet, org);
  const t = w.thickness;
  sheet.style.boxShadow = `0 ${t}px ${t * 2}px rgba(0,0,0,.35), ${t}px ${t * 1.5}px 0 rgba(0,0,0,.18), 0 ${t * 6}px ${t * 14}px rgba(0,0,0,.4)`;

  sheet.innerHTML = Layout.sideHtml(layout, state.side);
  const fitOverflow = Layout.fitAll(sheet);
  $('fitWarn').hidden = !(fitOverflow || layout.overflow);
  $('fitWarn').textContent = geo.kind === 'trifold' && layout.overflow
    ? "Too much text for a tri-fold. Shorten it or choose a booklet format."
    : "Some text doesn't fit. Shorten it or choose a bigger format.";

  const nPages = layout.pages.length;
  $('sizeLabel').textContent = `${f.width}" × ${f.height}" flat · ${nPages} page${nPages === 1 ? '' : 's'} · ${c.name} · ${w.name}`;
}

// ---------- templates ----------

function fillEditor(tpl) {
  state.tpl = tpl;
  if (!tpl) { render(); return; }
  $('tplName').value = tpl.name;
  $('title').value = tpl.content.title || '';
  $('subtitle').value = tpl.content.subtitle || '';
  $('date').value = tpl.content.date || '';
  $('body').value = Layout.normContent(tpl.content).body; // older templates are converted on the fly
  state.side = 0;
  state.caret = null;
  $('stageMsg').textContent = '';
  $('editor').classList.toggle('isInsert', !!tpl.content.plain);
  $('format').value = tpl.format_id;
  $('color').value = tpl.color_id;
  $('weight').value = tpl.weight_id;
  render();
}

async function refreshTemplates(selectId) {
  state.templates = state.org ? await window.api.templates.list(state.org.id) : [];
  const sel = $('tplSelect');
  sel.innerHTML = '';
  for (const t of state.templates) {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.name;
    sel.appendChild(o);
  }
  const pick = state.templates.find((t) => t.id === selectId) || state.templates[0] || null;
  if (pick) sel.value = pick.id;
  fillEditor(pick);
}

const saveTemplate = debounce(async () => {
  if (!state.tpl) return;
  const updated = await window.api.templates.update(state.tpl.id, {
    name: $('tplName').value.trim() || state.tpl.name,
    format_id: $('format').value,
    color_id: $('color').value,
    weight_id: $('weight').value,
    content: currentContent()
  });
  state.tpl = updated;
  const opt = $('tplSelect').querySelector(`option[value="${updated.id}"]`);
  if (opt) opt.textContent = updated.name;
}, 400);

function onEdit() { render(); saveTemplate(); }

// ---------- text library ----------

function refreshTextSelect() {
  const sel = $('textSelect');
  sel.innerHTML = '';
  const add = (parent, value, label) => {
    const o = document.createElement('option');
    o.value = value; o.textContent = label; parent.appendChild(o);
  };
  if (state.texts.length) {
    const g = document.createElement('optgroup');
    g.label = "Your church's texts";
    for (const t of state.texts) add(g, 'org:' + t.id, t.name);
    sel.appendChild(g);
  }
  const groups = [...new Set(state.builtin.map((t) => t.group))];
  for (const name of groups) {
    const g = document.createElement('optgroup');
    g.label = name + ' (built-in)';
    for (const t of state.builtin.filter((x) => x.group === name)) add(g, 'bi:' + t.id, t.name);
    sel.appendChild(g);
  }
}

function findText(value) {
  const [kind, id] = String(value).split(':');
  if (kind === 'org') return state.texts.find((t) => t.id === Number(id)) || null;
  return state.builtin.find((t) => t.id === id) || null;
}

// Put text into the body at the cursor, separated from its neighbors by blank lines.
function insertIntoBody(text) {
  const ta = $('body');
  // If the person was typing in the text box, add it where they left the cursor.
  // Otherwise (they just pressed a button) add it at the end, never in a surprising place.
  const at = state.caret || { s: ta.value.length, e: ta.value.length };
  const before = ta.value.slice(0, at.s).replace(/\n*$/, '');
  const after = ta.value.slice(at.e).replace(/^\n*/, '');
  const head = before ? before + '\n\n' : '';
  ta.value = head + text.trim() + (after ? '\n\n' + after : '\n');
  const caret = (head + text.trim()).length + 1;
  ta.focus();
  ta.setSelectionRange(caret, caret);
  onEdit();
}

const tl = { id: null }; // id of the church text being edited in the library dialog (null = new)

function tlMessage(msg) {
  $('tl_msg').textContent = msg || '';
  $('tl_msg').hidden = !msg;
}

function tlFill(t) {
  tl.id = t ? t.id : null;
  $('tl_name').value = t ? t.name : '';
  $('tl_body').value = t ? t.body : '';
  $('tl_list').value = t ? String(t.id) : '';
}

async function tlRefresh(selectId) {
  state.texts = await window.api.texts.list(state.org.id);
  const list = $('tl_list');
  list.innerHTML = '';
  for (const t of state.texts) {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name; list.appendChild(o);
  }
  refreshTextSelect();
  tlFill(state.texts.find((t) => t.id === selectId) || null);
}

function cleanError(e) {
  return String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

async function openTextLibrary() {
  if (!state.org) return;
  const sel = $('body').value.slice($('body').selectionStart, $('body').selectionEnd);
  tlMessage('');
  const bi = $('tl_builtin');
  bi.innerHTML = '';
  for (const t of state.builtin) {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name; bi.appendChild(o);
  }
  $('tl_source').textContent = state.builtin.length ? 'Source: ' + state.builtin[0].source : '';
  await tlRefresh();
  if (sel.trim()) $('tl_body').value = sel.trim(); // start a new text from the highlighted lines
  $('textDialog').showModal();
}

// ---------- weekly fill-in sheet ----------
// A spreadsheet-style view of the same body text. Edits write straight back to the body box.

const sh = { rows: [], mode: 'service' };

function sheetSync() {
  $('body').value = Sheet.buildBody(sh.rows);
  onEdit();
}

function sheetMsg(msg) { $('sh_msg').textContent = msg || ''; }

function renderSheet() {
  const m = Sheet.MODES[sh.mode];
  const span = m.columns.length + (m.stand ? 1 : 0);
  const e = Layout.esc;
  let html = '<thead><tr>' + (m.stand ? '<th class="c-stand" title="Standing">▲</th>' : '') +
    m.columns.map((c) => `<th>${e(c)}</th>`).join('') + '<th></th></tr></thead><tbody>';
  sh.rows.forEach((r, i) => {
    const btn = (act, label, title, cls) => `<button type="button" data-act="${act}" data-i="${i}" title="${title}"${cls ? ` class="${cls}"` : ''}>${label}</button>`;
    const ctl = `<td class="ctl">${btn('up', '↑', 'Move up')}${btn('down', '↓', 'Move down')}${btn('add', '+', 'Add an item below')}${btn('del', '✕', 'Remove this row', 'danger')}</td>`;
    if (r.type === 'heading') {
      html += `<tr class="h"><td colspan="${span}"><input type="text" data-i="${i}" data-kind="head" value="${e(r.text)}" placeholder="Section heading"></td>${ctl}</tr>`;
    } else if (r.type === 'item') {
      html += '<tr>' + (m.stand ? `<td class="stand"><input type="checkbox" data-i="${i}" data-kind="stand"${r.stand ? ' checked' : ''} title="Standing"></td>` : '') +
        Sheet.cells(r, sh.mode).map((v, c) => `<td><input type="text" data-i="${i}" data-c="${c}" value="${e(v)}"></td>`).join('') + ctl + '</tr>';
    } else {
      const first = (r.lines.find((l) => l.trim()) || '').trim().slice(0, 90);
      html += `<tr class="o"><td colspan="${span}">Text block (${r.lines.filter((l) => l.trim()).length} lines, not edited here): ${e(first)}</td>${ctl}</tr>`;
    }
  });
  $('sh_table').innerHTML = html + '</tbody>';
}

function openSheet() {
  if (!state.tpl) return;
  sh.rows = Sheet.parseRows($('body').value);
  sh.mode = (state.tpl.content && state.tpl.content.sheetMode) || 'service';
  fillSelect($('sh_mode'), Object.entries(Sheet.MODES).map(([id, m]) => ({ id, name: m.name })));
  $('sh_mode').value = sh.mode;
  $('sh_date').value = $('date').value;
  $('sh_title').value = $('title').value;
  sheetMsg('');
  renderSheet();
  $('sheetDialog').showModal();
}

function wireSheet() {
  $('sheetOpen').onclick = openSheet;
  $('sh_close').onclick = () => $('sheetDialog').close();
  $('sh_date').addEventListener('input', () => { $('date').value = $('sh_date').value; onEdit(); });
  $('sh_title').addEventListener('input', () => { $('title').value = $('sh_title').value; onEdit(); });
  $('sh_mode').addEventListener('change', () => {
    sh.mode = $('sh_mode').value;
    state.tpl.content.sheetMode = sh.mode;
    renderSheet();
    onEdit();
  });

  const table = $('sh_table');
  table.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.i === undefined) return;
    const row = sh.rows[Number(t.dataset.i)];
    if (t.dataset.kind === 'head') row.text = t.value;
    else if (t.dataset.c !== undefined) Sheet.setCell(row, Number(t.dataset.c), t.value, sh.mode);
    else return;
    sheetSync();
  });
  table.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.kind !== 'stand') return;
    sh.rows[Number(t.dataset.i)].stand = t.checked;
    sheetSync();
  });
  table.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    const act = b.dataset.act;
    if (act === 'up' && i > 0) [sh.rows[i - 1], sh.rows[i]] = [sh.rows[i], sh.rows[i - 1]];
    else if (act === 'down' && i < sh.rows.length - 1) [sh.rows[i + 1], sh.rows[i]] = [sh.rows[i], sh.rows[i + 1]];
    else if (act === 'add') sh.rows.splice(i + 1, 0, Sheet.newItem());
    else if (act === 'del') {
      const r = sh.rows[i];
      if (r.type === 'other' && !confirm('Remove this block of text from the bulletin?')) return;
      sh.rows.splice(i, 1);
    } else return;
    renderSheet();
    sheetSync();
  });
  // Pasting a block of cells copied from Excel or Google Sheets fills the grid.
  table.addEventListener('paste', (ev) => {
    const t = ev.target;
    if (t.dataset.c === undefined) return;
    const text = ev.clipboardData.getData('text/plain');
    const out = Sheet.applyPaste(sh.rows, Number(t.dataset.i), Number(t.dataset.c), text, sh.mode);
    if (!out) return; // a single value: normal paste
    ev.preventDefault();
    const added = out.length - sh.rows.length;
    sh.rows = out;
    renderSheet();
    sheetSync();
    const n = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').length;
    sheetMsg(`Pasted ${n} row${n === 1 ? '' : 's'}${added > 0 ? `, added ${added} new` : ''}.`);
  });

  $('sh_addItem').onclick = () => {
    sh.rows.push(Sheet.newItem());
    renderSheet();
    sheetSync();
    const inputs = $('sh_table').querySelectorAll('input[type=text][data-c="0"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
    $('sh_table').parentElement.scrollTop = 1e6;
  };
  $('sh_addHead').onclick = () => {
    sh.rows.push({ type: 'heading', level: 1, text: 'New section' });
    renderSheet();
    sheetSync();
    $('sh_table').parentElement.scrollTop = 1e6;
  };
  $('sh_copy').onclick = async () => {
    const text = Sheet.toTable(sh.rows, sh.mode);
    try {
      await navigator.clipboard.writeText(text);
      sheetMsg(`Copied ${text ? text.split('\n').length : 0} rows. Paste them into Excel, edit, and paste back.`);
    } catch (e) {
      sheetMsg('Could not copy to the clipboard.');
    }
  };
}

// ---------- views: start screen, new-program wizard, editor ----------

function showView(name) {
  state.view = name;
  $('homeView').hidden = name !== 'home';
  $('wizardView').hidden = name !== 'wizard';
  $('editorView').hidden = name !== 'editor';
  $('homeBtn').hidden = name === 'home';
  $('homeView').scrollTop = 0;
  $('wizardView').scrollTop = 0;
  if (name === 'editor') render();   // sizes are only known once the editor is visible
  if (name === 'home') renderHome();
}

// Open one of the current church's templates in the editor.
function openTemplate(id) {
  showView('editor');
  const t = state.templates.find((x) => x.id === id);
  if (!t) return;
  $('tplSelect').value = t.id;
  fillEditor(t);
}

// A small picture of a template, using the organization's own logo, colors and fonts.
// It is laid out at true size and shrunk, so it matches what will print.
function makeThumb(format, colorId, content) {
  const org = state.org;
  const geo = Layout.geometry(format);
  const layout = Layout.paginate(document, geo, { org, content, logoUrl: state.logoUrl });
  const side = geo.kind !== 'flat' && layout.sides.length > 1 ? 1 : 0; // show the inside of folded pieces
  const W = format.width * Layout.PX_PER_IN, H = format.height * Layout.PX_PER_IN;
  const k = Math.min(176 / W, 132 / H);
  const color = state.catalog.colors.find((c) => c.id === colorId) || state.catalog.colors[0];

  const box = document.createElement('div');
  box.className = 'thumbBox';
  box.style.width = Math.round(W * k) + 'px';
  box.style.height = Math.round(H * k) + 'px';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.style.width = W + 'px';
  sheet.style.height = H + 'px';
  sheet.style.background = color.hex;
  sheet.style.fontSize = Layout.PX_PER_IN * Layout.EM_IN + 'px';
  sheet.style.transform = `scale(${k})`;
  Layout.setVars(sheet, org);
  sheet.innerHTML = Layout.sideHtml(layout, side);
  box.appendChild(sheet);
  return { box, sheet };
}

function makeCard(title, sub, thumb, onClick) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  const t = document.createElement('div');
  t.className = 'thumb';
  t.appendChild(thumb.box);
  const meta = document.createElement('div');
  meta.className = 'meta';
  const b = document.createElement('b'); b.textContent = title;
  const s = document.createElement('small'); s.textContent = sub;
  meta.append(b, s);
  card.append(t, meta);
  card.onclick = onClick;
  return card;
}

function formatById(id) {
  return state.catalog.formats.find((f) => f.id === id) || state.catalog.formats.find((f) => f.id === 'letter-bifold');
}

function renderHome() {
  const org = state.org;
  $('homeGreeting').textContent = org ? org.name : 'Welcome to Program Publisher';
  const recent = $('recentList');
  const gallery = $('galleryList');
  recent.innerHTML = '';
  gallery.innerHTML = '';
  if (!org) {
    recent.innerHTML = '<p class="emptyNote">Add an organization to get started.</p>';
    return;
  }

  // Recent: this organization's templates, newest edit first.
  const rec = [...state.templates].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 5);
  if (!rec.length) recent.innerHTML = '<p class="emptyNote">Nothing here yet. Start a new program, or pick a template below.</p>';
  const thumbs = [];
  for (const t of rec) {
    const th = makeThumb(formatById(t.format_id), t.color_id, t.content);
    const when = new Date(String(t.updated_at).replace(' ', 'T') + 'Z');
    const card = makeCard(t.name, 'Edited ' + (isNaN(when) ? '' : when.toLocaleDateString()), th, () => openTemplate(t.id));
    recent.appendChild(card);
    thumbs.push(th);
  }

  // Gallery: starter templates for the chosen tab, shown in the organization's own style.
  const cat = document.querySelector('#galleryTabs button.active').dataset.cat;
  for (const s of state.serviceTypes.filter((x) => x.category === cat || x.category === 'both')) {
    const th = makeThumb(formatById(org.default_format_id), org.default_color_id, { title: s.title, subtitle: s.subtitle, date: '', body: s.body });
    gallery.appendChild(makeCard(s.label, s.desc, th, async () => {
      const made = await window.api.templates.create(org.id, s.id);
      await refreshTemplates(made.id);
      showView('editor');
    }));
    thumbs.push(th);
  }
  for (const th of thumbs) Layout.fitAll(th.sheet); // covers and back pages need the page attached to measure
}

// ---------- new program wizard ----------

const wiz = { step: 1, type: null, answers: {}, finish: { title: '', subtitle: '', date: '', formatId: 'letter-bifold' }, built: null };

function wizSteps() {
  return wiz.type === 'other' ? ['What is it?', 'Create'] : ['What is it?', 'Details', 'Create'];
}

function startWizard() {
  wiz.step = 1; wiz.type = null; wiz.answers = {}; wiz.built = null;
  showView('wizard');
  renderWizard();
}

function visibleQuestions() {
  return (Wizard.QUESTIONS[wiz.type] || []).filter((q) => !q.showIf || q.showIf(wiz.answers));
}

function renderWizard() {
  const names = wizSteps();
  const finishStep = names.length;
  $('wizSteps').innerHTML = names.map((n, i) => `<span class="${i + 1 === wiz.step ? 'on' : i + 1 < wiz.step ? 'done' : ''}">${i + 1}. ${Layout.esc(n)}</span>`).join('');
  const body = $('wizBody');
  body.innerHTML = '';
  $('wizBack').hidden = false;
  $('wizNext').hidden = false;

  if (wiz.step === 1) {
    $('wizTitle').textContent = 'What are you making?';
    $('wizHint').textContent = 'Pick one. You can change everything afterwards.';
    const grid = document.createElement('div');
    grid.className = 'choices';
    for (const t of Wizard.TYPES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice';
      b.innerHTML = `<b>${Layout.esc(t.label)}</b><small>${Layout.esc(t.desc)}</small>`;
      b.onclick = () => {
        wiz.type = t.id;
        wiz.answers = Wizard.defaults(t.id);
        wiz.step = 2;
        if (t.id === 'other') { wiz.step = 2; prepareFinish(); }
        renderWizard();
      };
      grid.appendChild(b);
    }
    body.appendChild(grid);
    $('wizNext').hidden = true;
    return;
  }

  if (wiz.step === finishStep) {
    prepareFinish();
    $('wizTitle').textContent = 'Ready to create';
    $('wizHint').textContent = 'This sets up a starting point. You will edit everything on the next screen.';
    const f = wiz.finish;
    const box = document.createElement('div');
    box.className = 'finish';
    box.innerHTML = `<div class="grid2">
        <label>Title <input id="wz_title" type="text" value="${Layout.esc(f.title)}"></label>
        <label>Subtitle <input id="wz_sub" type="text" value="${Layout.esc(f.subtitle)}"></label>
        <label>Date <input id="wz_date" type="text" value="${Layout.esc(f.date)}" placeholder="Sunday, January 4, 2026"></label>
        <label>Paper <select id="wz_fmt"></select></label>
      </div>
      <h3 style="margin-top:14px">It will start with</h3>
      <ol class="outline">${wiz.built.outline.map((h) => `<li>${Layout.esc(h)}</li>`).join('')}</ol>`;
    body.appendChild(box);
    fillSelect($('wz_fmt'), state.catalog.formats);
    $('wz_fmt').value = f.formatId;
    $('wz_title').oninput = () => { f.title = $('wz_title').value; };
    $('wz_sub').oninput = () => { f.subtitle = $('wz_sub').value; };
    $('wz_date').oninput = () => { f.date = $('wz_date').value; };
    $('wz_fmt').onchange = () => { f.formatId = $('wz_fmt').value; };
    $('wizNext').textContent = 'Create program';
    return;
  }

  // Details: the questions for this kind of program.
  $('wizTitle').textContent = Wizard.TYPES.find((t) => t.id === wiz.type).label;
  $('wizHint').textContent = 'Answer what applies. Anything you skip can be added or removed later.';
  $('wizNext').textContent = 'Next';
  for (const q of visibleQuestions()) {
    const fs = document.createElement('fieldset');
    fs.className = 'q';
    fs.innerHTML = `<legend>${Layout.esc(q.label)}</legend>` + (q.hint ? `<p class="hint">${Layout.esc(q.hint)}</p>` : '');
    const opts = document.createElement('div');
    opts.className = 'opts';
    for (const o of q.options) {
      const label = document.createElement('label');
      label.className = 'opt';
      const input = document.createElement('input');
      input.type = q.kind === 'single' ? 'radio' : 'checkbox';
      input.name = 'wq_' + q.id;
      input.value = o.id;
      input.checked = q.kind === 'single' ? wiz.answers[q.id] === o.id : (wiz.answers[q.id] || []).includes(o.id);
      input.onchange = () => {
        if (q.kind === 'single') { wiz.answers[q.id] = o.id; renderWizard(); }
        else {
          const cur = new Set(wiz.answers[q.id] || []);
          if (input.checked) cur.add(o.id); else cur.delete(o.id);
          wiz.answers[q.id] = [...cur];
        }
      };
      label.append(input, document.createTextNode(o.label));
      opts.appendChild(label);
    }
    fs.appendChild(opts);
    body.appendChild(fs);
  }
}

// Build the starting bulletin from the answers so far; keep the title/date the person edits.
function prepareFinish() {
  const textsById = Object.fromEntries(state.builtin.map((t) => [t.id, t]));
  const built = Wizard.build(wiz.type, wiz.answers, textsById);
  const keep = wiz.built && wiz.finish._for === JSON.stringify([wiz.type, wiz.answers]);
  wiz.built = built;
  if (!keep) {
    wiz.finish = { title: built.title, subtitle: built.subtitle, date: '', formatId: built.formatId, _for: JSON.stringify([wiz.type, wiz.answers]) };
  }
}

async function createFromWizard() {
  const org = state.org;
  const f = wiz.finish;
  const b = wiz.built;
  $('wizNext').disabled = true;
  try {
    const t = await window.api.templates.create(org.id, 'general');
    const made = await window.api.templates.update(t.id, {
      name: b.name,
      service_type: wiz.type,
      format_id: f.formatId,
      color_id: org.default_color_id,
      weight_id: org.default_weight_id,
      content: { title: f.title, subtitle: f.subtitle, date: f.date, body: b.body, sheetMode: b.sheetMode }
    });
    await refreshTemplates(made.id);
    showView('editor');
  } finally {
    $('wizNext').disabled = false;
  }
}

function wireHome() {
  $('homeBtn').onclick = () => showView('home');
  $('newProgram').onclick = () => { if (state.org) startWizard(); else openOrgDialog(null); };
  $('allTemplates').onclick = () => { if (state.org) showView('editor'); };
  for (const b of document.querySelectorAll('#galleryTabs button')) {
    b.onclick = () => {
      document.querySelectorAll('#galleryTabs button').forEach((x) => x.classList.toggle('active', x === b));
      renderHome();
    };
  }
  $('wizBack').onclick = () => {
    if (wiz.step <= 1) { showView('home'); return; }
    wiz.step -= 1;
    renderWizard();
  };
  $('wizNext').onclick = async () => {
    if (wiz.step === wizSteps().length) { await createFromWizard(); return; }
    wiz.step += 1;
    renderWizard();
  };
}

// ---------- organizations ----------

async function selectOrg(id) {
  state.org = state.orgs.find((o) => o.id === id) || null;
  if (state.org) {
    await window.api.settings.set('lastOrg', state.org.id);
    $('orgSelect').value = state.org.id;
    await loadOrgFonts(state.org.id);
    await loadLogo(state.org);
    state.texts = await window.api.texts.list(state.org.id);
  } else {
    state.fonts = []; state.logoUrl = null; state.texts = [];
  }
  refreshTextSelect();
  $('orgManage').disabled = !state.org;
  await refreshTemplates();
  if (state.view === 'home') renderHome(); // a different church has its own logo, colors and recent templates
}

async function refreshOrgs(selectId) {
  state.orgs = await window.api.orgs.list();
  fillSelect($('orgSelect'), state.orgs);
  const target = state.orgs.find((o) => o.id === selectId) || state.orgs[0];
  await selectOrg(target ? target.id : null);
}

async function openOrgDialog(orgId) {
  state.dialogOrgId = orgId;
  const org = orgId ? state.orgs.find((o) => o.id === orgId) : null;
  $('orgDialogTitle').textContent = org ? 'Edit your church or school' : 'Set up your church or school';
  $('orgError').hidden = true;
  $('orgDelete').hidden = !org;

  fillSelect($('o_format'), state.catalog.formats);
  fillSelect($('o_color'), state.catalog.colors);
  const fonts = org ? state.fonts : [];
  const fo = [...SYSTEM_FONTS, ...fonts.map((f) => f.name)].map((n) => ({ id: n, name: n }));
  fillSelect($('o_headingFont'), fo);
  fillSelect($('o_bodyFont'), fo);

  const d = org || { name: '', tagline: '', address: '', phone: '', website: '', email: '', primary_color: '#1f3a5f', accent_color: '#b08d3c', heading_font: 'Georgia', body_font: 'Segoe UI', default_format_id: 'letter-bifold', default_color_id: 'white' };
  $('o_name').value = d.name;
  $('o_tagline').value = d.tagline;
  $('o_address').value = d.address;
  $('o_phone').value = d.phone;
  $('o_website').value = d.website;
  $('o_email').value = d.email;
  $('o_primary').value = d.primary_color;
  $('o_accent').value = d.accent_color;
  $('o_headingFont').value = d.heading_font;
  $('o_bodyFont').value = d.body_font;
  $('o_format').value = d.default_format_id;
  $('o_color').value = d.default_color_id;

  // Logo and fonts need a saved organization to attach to.
  document.querySelector('.assets').hidden = !org;
  if (org) { renderLogoBox(); renderFontList(); }
  $('orgDialog').showModal();
}

function renderLogoBox() {
  $('logoPreview').innerHTML = state.logoUrl ? `<img src="${state.logoUrl}" alt="Logo">` : 'No logo';
}

function renderFontList() {
  const ul = $('fontList');
  ul.innerHTML = state.fonts.length ? '' : '<li class="hint">No custom fonts yet.</li>';
  for (const f of state.fonts) {
    const li = document.createElement('li');
    li.innerHTML = `<span style="font-family:'${esc(f.name)}'">${esc(f.name)}</span>`;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn small'; b.textContent = 'Remove';
    b.onclick = async () => {
      await window.api.assets.delete(f.id);
      state.fonts = await window.api.assets.list(state.org.id, 'font');
      renderFontList();
    };
    li.appendChild(b);
    ul.appendChild(li);
  }
}

function showOrgError(msg) {
  $('orgError').textContent = msg;
  $('orgError').hidden = false;
}

async function saveOrg(ev) {
  ev.preventDefault();
  const data = {
    name: $('o_name').value, tagline: $('o_tagline').value, address: $('o_address').value,
    phone: $('o_phone').value, website: $('o_website').value, email: $('o_email').value,
    primary_color: $('o_primary').value, accent_color: $('o_accent').value,
    heading_font: $('o_headingFont').value, body_font: $('o_bodyFont').value,
    default_format_id: $('o_format').value, default_color_id: $('o_color').value
  };
  try {
    let id = state.dialogOrgId;
    if (id) await window.api.orgs.update(id, data);
    else id = (await window.api.orgs.create(data)).id;
    $('orgDialog').close();
    await refreshOrgs(id);
  } catch (e) {
    showOrgError(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  }
}

async function pickAsset(kind) {
  try {
    const asset = await window.api.assets.pick(state.org.id, kind);
    if (!asset) return;
    if (kind === 'logo') {
      state.org = await window.api.orgs.update(state.org.id, { logo_asset_id: asset.id });
      state.orgs = await window.api.orgs.list();
      await loadLogo(state.org);
      renderLogoBox();
    } else {
      await loadOrgFonts(state.org.id);
      const fo = fontOptions();
      const h = $('o_headingFont').value, b = $('o_bodyFont').value;
      fillSelect($('o_headingFont'), fo); fillSelect($('o_bodyFont'), fo);
      $('o_headingFont').value = h; $('o_bodyFont').value = b;
      renderFontList();
    }
  } catch (e) {
    showOrgError(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  }
}

// ---------- init ----------

async function init() {
  state.catalog = await window.api.getPaperCatalog();
  state.serviceTypes = await window.api.getServiceTypes();
  state.builtin = await window.api.texts.builtin();
  $('version').textContent = 'Version ' + await window.api.version();

  // Catechism picker
  state.catechisms = await window.api.catechism.list();
  fillSelect($('catSelect'), state.catechisms);
  const showCatNote = () => {
    const c = state.catechisms.find((x) => x.id === $('catSelect').value);
    $('catNote').textContent = c ? `${c.count} questions. ${c.source}${c.caution ? ' Note: ' + c.caution : ''}` : '';
    $('catTo').max = $('catFrom').max = c ? c.count : '';
  };
  $('catSelect').addEventListener('change', showCatNote);
  showCatNote();
  $('catInsert').onclick = async () => {
    const msg = $('catNote');
    try {
      const text = await window.api.catechism.text($('catSelect').value, $('catFrom').value, $('catTo').value, $('catRefs').checked);
      insertIntoBody(text);
      showCatNote();
    } catch (e) {
      msg.textContent = cleanError(e);
    }
  };
  fillSelect($('format'), state.catalog.formats);
  fillSelect($('color'), state.catalog.colors);
  fillSelect($('weight'), state.catalog.weights);
  fillSelect($('tplNewType'), state.serviceTypes, 'id', 'label');

  for (const id of ['tplName', 'title', 'subtitle', 'date', 'body', 'format', 'color', 'weight']) {
    $(id).addEventListener('input', onEdit);
  }
  // Text library
  $('textInsert').onclick = () => {
    const t = findText($('textSelect').value);
    if (t) insertIntoBody(t.body);
  };
  $('textManage').onclick = openTextLibrary;
  $('tl_close').onclick = () => $('textDialog').close();
  $('tl_list').addEventListener('change', () => {
    tlMessage('');
    tlFill(state.texts.find((t) => t.id === Number($('tl_list').value)) || null);
  });
  $('tl_new').onclick = () => { tlMessage(''); tlFill(null); $('tl_name').focus(); };
  $('tl_builtin').addEventListener('change', () => {
    const t = state.builtin.find((x) => x.id === $('tl_builtin').value);
    $('tl_source').textContent = t ? 'Source: ' + t.source : '';
  });
  $('tl_copy').onclick = async () => {
    const t = state.builtin.find((x) => x.id === $('tl_builtin').value);
    if (!t) return;
    try {
      const made = await window.api.texts.create(state.org.id, { name: t.name, body: t.body });
      tlMessage('');
      await tlRefresh(made.id);
    } catch (e) { tlMessage(cleanError(e)); }
  };
  $('tl_sel').onclick = () => {
    const ta = $('body');
    const s = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
    if (!s) { tlMessage('Highlight some lines in the bulletin body first, then open the library.'); return; }
    tlMessage('');
    $('tl_body').value = s;
  };
  $('tl_save').onclick = async () => {
    try {
      const data = { name: $('tl_name').value, body: $('tl_body').value };
      const saved = tl.id ? await window.api.texts.update(tl.id, data) : await window.api.texts.create(state.org.id, data);
      tlMessage('');
      await tlRefresh(saved.id);
    } catch (e) { tlMessage(cleanError(e)); }
  };
  $('tl_del').onclick = async () => {
    const t = state.texts.find((x) => x.id === tl.id);
    if (!t || !confirm(`Delete "${t.name}" from your church's library? Bulletins that already contain it are not changed.`)) return;
    await window.api.texts.delete(t.id);
    await tlRefresh();
  };

  wireSheet();

  // Weekly workflow
  $('tplNext').onclick = async () => {
    if (!state.tpl) return;
    await saveTemplate.flush();
    const src = state.tpl;
    const copy = await window.api.templates.duplicate(src.id);
    const content = { ...src.content, date: '', body: Layout.clearWeekly(Layout.normContent(src.content).body) };
    const made = await window.api.templates.update(copy.id, { name: `${src.name} (new week)`, content });
    await refreshTemplates(made.id);
  };
  $('tplInsert').onclick = async () => {
    if (!state.tpl) return;
    await saveTemplate.flush();
    const src = state.tpl;
    const fmt = state.catalog.formats.find((x) => x.id === src.format_id);
    const formatId = Layout.insertFormatId(state.catalog.formats, fmt) || 'half-letter';
    const t = await window.api.templates.create(state.org.id, 'general');
    const made = await window.api.templates.update(t.id, {
      name: `Insert for ${src.name}`, service_type: 'insert', format_id: formatId,
      color_id: src.color_id, weight_id: src.weight_id,
      content: { title: '', subtitle: '', date: '', plain: true, body: '' }
    });
    await refreshTemplates(made.id);
  };

  $('stepPrev').onclick = () => { state.side -= 1; render(); };
  $('stepNext').onclick = () => { state.side += 1; render(); };
  // Insert-snippet buttons: put the sample text on its own line at the cursor.
  for (const b of document.querySelectorAll('#snips button')) {
    b.addEventListener('click', () => {
      const ta = $('body');
      const snip = b.dataset.snip;
      const pos = ta.selectionStart;
      const before = ta.value.slice(0, pos);
      const after = ta.value.slice(ta.selectionEnd);
      const lead = before === '' || before.endsWith('\n') ? '' : '\n';
      ta.value = before + lead + snip + '\n' + after;
      const caret = (before + lead + snip + '\n').length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
      onEdit();
    });
  }
  // Keep track of where the person last put the cursor in the text box.
  for (const evName of ['keyup', 'click', 'select', 'input']) {
    $('body').addEventListener(evName, () => {
      const ta = $('body');
      state.caret = { s: ta.selectionStart, e: ta.selectionEnd };
    });
  }

  $('savePdf').onclick = async () => {
    if (!state.tpl) return;
    const msg = $('stageMsg');
    msg.className = 'hint ok';
    $('savePdf').disabled = true;
    msg.textContent = 'Getting your PDF ready…';
    try {
      await saveTemplate.flush();
      const r = await window.api.exportPdf(state.tpl.id, {
        mode: $('exportMode').value,
        includeColor: $('exportColor').checked
      });
      if (!r) msg.textContent = '';
      else {
        msg.textContent = 'Saved! ' +
          (r.foldNote ? 'Print it on both sides of the paper (flip on the short edge), then fold it.' : 'It is ready to print.') +
          (r.overflow ? ' Warning: some text was too long and may be cut off. Shorten it or choose a bigger paper size.' : '');
        if (r.overflow) msg.className = 'hint bad';
      }
    } catch (e) {
      msg.className = 'hint bad';
      msg.textContent = 'Sorry, the PDF could not be saved. ' + cleanError(e);
    } finally {
      $('savePdf').disabled = false;
    }
  };
  $('tplSelect').addEventListener('change', () => {
    fillEditor(state.templates.find((t) => t.id === Number($('tplSelect').value)) || null);
  });
  $('tplNew').onclick = async () => {
    if (!state.org) return;
    const t = await window.api.templates.create(state.org.id, $('tplNewType').value);
    await refreshTemplates(t.id);
  };
  $('tplDup').onclick = async () => {
    if (!state.tpl) return;
    const t = await window.api.templates.duplicate(state.tpl.id);
    await refreshTemplates(t.id);
  };
  $('tplDel').onclick = async () => {
    if (!state.tpl || !confirm(`Delete the template "${state.tpl.name}"? This cannot be undone.`)) return;
    await window.api.templates.delete(state.tpl.id);
    await refreshTemplates();
  };

  $('orgSelect').addEventListener('change', () => selectOrg(Number($('orgSelect').value)));
  $('orgManage').onclick = () => state.org && openOrgDialog(state.org.id);
  $('orgNew').onclick = () => openOrgDialog(null);
  $('orgCancel').onclick = () => $('orgDialog').close();
  $('orgForm').addEventListener('submit', saveOrg);
  $('logoPick').onclick = () => pickAsset('logo');
  $('fontPick').onclick = () => pickAsset('font');
  $('logoClear').onclick = async () => {
    if (!state.org.logo_asset_id) return;
    await window.api.assets.delete(state.org.logo_asset_id);
    state.org = await window.api.orgs.update(state.org.id, {});
    state.orgs = await window.api.orgs.list();
    await loadLogo(state.org);
    renderLogoBox();
  };
  $('orgDelete').onclick = async () => {
    const o = state.org;
    if (!o || !confirm(`Delete "${o.name}" with all its templates, logos and fonts? This cannot be undone.`)) return;
    await window.api.orgs.delete(o.id);
    $('orgDialog').close();
    await refreshOrgs();
  };

  window.addEventListener('resize', () => { if (state.view === 'editor') render(); });
  wireHome();

  const last = Number(await window.api.settings.get('lastOrg'));
  await refreshOrgs(last || undefined);
  showView('home');
  if (state.orgs.length === 0) openOrgDialog(null);
}

init();
