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
  logoUrl: null,      // data URL of current org's logo
  side: 0,            // which side of the sheet the preview shows (0 outside, 1 inside)
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
    body: $('body').value
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

// ---------- organizations ----------

async function selectOrg(id) {
  state.org = state.orgs.find((o) => o.id === id) || null;
  if (state.org) {
    await window.api.settings.set('lastOrg', state.org.id);
    $('orgSelect').value = state.org.id;
    await loadOrgFonts(state.org.id);
    await loadLogo(state.org);
  } else {
    state.fonts = []; state.logoUrl = null;
  }
  $('orgManage').disabled = !state.org;
  await refreshTemplates();
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
  $('orgDialogTitle').textContent = org ? 'Edit organization' : 'New organization';
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
  fillSelect($('format'), state.catalog.formats);
  fillSelect($('color'), state.catalog.colors);
  fillSelect($('weight'), state.catalog.weights);
  fillSelect($('tplNewType'), state.serviceTypes, 'id', 'label');

  for (const id of ['tplName', 'title', 'subtitle', 'date', 'body', 'format', 'color', 'weight']) {
    $(id).addEventListener('input', onEdit);
  }
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
  $('exportBtn').onclick = async () => {
    if (!state.tpl) return;
    const msg = $('exportMsg');
    $('exportBtn').disabled = true;
    msg.textContent = 'Preparing PDF…';
    try {
      await saveTemplate.flush();
      const r = await window.api.exportPdf(state.tpl.id, {
        mode: $('exportMode').value,
        includeColor: $('exportColor').checked
      });
      if (!r) msg.textContent = '';
      else {
        const f = state.catalog.formats.find((x) => x.id === state.tpl.format_id);
        msg.textContent = `Saved ${r.sheets} PDF page${r.sheets === 1 ? '' : 's'}.` +
          (r.foldNote ? ' Print double-sided, flipping on the short edge, then fold.' : '') +
          (r.overflow ? ' Warning: some text was too long and may be cut off.' : '');
      }
    } catch (e) {
      msg.textContent = 'Export failed: ' + e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    } finally {
      $('exportBtn').disabled = false;
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

  window.addEventListener('resize', render);

  const last = Number(await window.api.settings.get('lastOrg'));
  await refreshOrgs(last || undefined);
  if (state.orgs.length === 0) openOrgDialog(null);
}

init();
