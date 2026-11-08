'use strict';

const $ = (id) => document.getElementById(id);
let catalog;

function fill(select, items) {
  select.innerHTML = '';
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it.name;
    select.appendChild(o);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function render() {
  const f = catalog.formats.find((x) => x.id === $('format').value);
  const c = catalog.colors.find((x) => x.id === $('color').value);
  const w = catalog.weights.find((x) => x.id === $('weight').value);

  $('formatNote').textContent = f.note;

  // Scale the sheet to fit the stage while keeping true proportions.
  const stage = document.querySelector('.stage');
  const maxW = stage.clientWidth - 64;
  const maxH = stage.clientHeight - 90;
  const scale = Math.min(maxW / f.width, maxH / f.height); // px per inch
  const sheet = $('sheet');
  sheet.style.width = f.width * scale + 'px';
  sheet.style.height = f.height * scale + 'px';
  sheet.style.background = c.hex;
  sheet.style.fontSize = scale * 0.17 + 'px'; // text scales with the sheet
  const t = w.thickness;
  sheet.style.boxShadow = `0 ${t}px ${t * 2}px rgba(0,0,0,.35), ${t}px ${t * 1.5}px 0 rgba(0,0,0,.18), 0 ${t * 6}px ${t * 14}px rgba(0,0,0,.4)`;

  const org = esc($('orgName').value);
  const title = esc($('title').value);
  const date = esc($('date').value);

  let html = '';
  for (let i = 0; i < f.panels; i++) {
    const isCover = i === 0 || f.panels === 1;
    html += '<div class="panel">';
    if (isCover) {
      html += `<div class="org">${org}</div><h2>${title}</h2><div class="date">${date}</div><div class="rule"></div>` +
        '<ul><li>Welcome &amp; Call to Worship</li><li>Opening Hymn</li><li>Scripture Reading</li><li>Message</li><li>Closing Prayer</li></ul>';
    } else {
      html += `<div class="placeholder">Panel ${i + 1}</div>`;
    }
    html += '</div>';
  }
  sheet.innerHTML = html;

  $('sizeLabel').textContent =
    `${f.width}" × ${f.height}" flat · ${c.name} · ${w.name}`;
}

async function init() {
  catalog = await window.api.getPaperCatalog();
  fill($('format'), catalog.formats);
  fill($('color'), catalog.colors);
  fill($('weight'), catalog.weights);
  $('format').value = 'letter-bifold';

  for (const id of ['format', 'color', 'weight', 'orgName', 'title', 'date']) {
    $(id).addEventListener('input', render);
  }
  window.addEventListener('resize', render);
  render();
}

init();
