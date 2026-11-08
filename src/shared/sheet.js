'use strict';

// Weekly fill-in sheet: a spreadsheet-style view of a bulletin's body.
//
// The sheet edits the SAME text as the body box, so there is nothing to keep in sync:
//   - each order-of-service line ("+ Opening Hymn | Holy, Holy, Holy | 77") becomes a row of cells
//   - headings become section rows
//   - everything else (prayers, paragraphs, announcements…) is kept untouched as a "text block"
// Pasting a block of cells copied from Excel fills the rows.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout'));
  else root.Sheet = factory(root.Layout);
})(typeof self !== 'undefined' ? self : this, function (Layout) {
  const MODES = {
    service: {
      name: 'Order of service',
      columns: ['Item', 'Detail (hymn title…)', 'Right side (number, reading, name)'],
      stand: true
    },
    concert: {
      name: 'Concert program',
      columns: ['Piece', 'Note (arranger, work…)', 'Composer', 'Years (1732–1809)'],
      stand: false
    }
  };

  const YEARS_RE = /^(.*?)\s*\(([^)]*)\)\s*$/;

  // Concert mode splits the right-hand text into composer + years.
  function splitComposer(right) {
    const m = String(right || '').match(YEARS_RE);
    return m ? { composer: m[1], years: m[2] } : { composer: String(right || ''), years: '' };
  }

  function joinComposer(composer, years) {
    const c = String(composer || '').trim();
    const y = String(years || '').trim();
    return y ? (c ? `${c} (${y})` : `(${y})`) : c;
  }

  function parseRows(body) {
    const lines = String(body || '').replace(/\r/g, '').split('\n');
    const rows = [];
    let run = [];
    const flush = () => {
      while (run.length && !run[0].trim()) run.shift();
      while (run.length && !run[run.length - 1].trim()) run.pop();
      if (run.length) rows.push({ type: 'other', lines: run });
      run = [];
    };
    for (const line of lines) {
      const kind = Layout.classifyLine(line);
      if (kind === 'sec' || kind === 'sub') {
        flush();
        rows.push({ type: 'heading', level: kind === 'sec' ? 1 : 2, text: line.trim().replace(/^#{1,2}\s+/, '') });
      } else if (kind === 'item') {
        flush();
        rows.push({ type: 'item', ...Layout.parseItemLine(line) });
      } else {
        run.push(line);
      }
    }
    flush();
    return rows;
  }

  function buildBody(rows) {
    const out = [];
    const gap = () => { if (out.length && out[out.length - 1] !== '') out.push(''); };
    for (const r of rows) {
      if (r.type === 'heading') {
        gap();
        out.push('#'.repeat(r.level || 1) + ' ' + String(r.text || '').trim());
      } else if (r.type === 'item') {
        out.push(Layout.formatItemLine(r));
      } else {
        gap();
        out.push(...r.lines);
        out.push('');
      }
    }
    return out.join('\n').replace(/\n+$/, '');
  }

  // The text cells of an item row, for the given mode.
  function cells(row, mode) {
    if (mode === 'concert') {
      const s = splitComposer(row.right);
      return [row.label || '', row.mid || '', s.composer, s.years];
    }
    return [row.label || '', row.mid || '', row.right || ''];
  }

  function setCell(row, col, value, mode) {
    const v = String(value);
    if (col === 0) row.label = v;
    else if (col === 1) row.mid = v;
    else if (mode === 'concert') {
      const s = splitComposer(row.right);
      if (col === 2) row.right = joinComposer(v, s.years);
      else if (col === 3) row.right = joinComposer(s.composer, v);
    } else if (col === 2) row.right = v;
  }

  function newItem() {
    return { type: 'item', stand: false, label: '', mid: '', right: '' };
  }

  // Excel/Sheets copy cells as tab-separated rows. Returns the rows with pasted cells filled in,
  // starting at the item row at/after rowIdx and the given column. Extra pasted rows fill the
  // following item rows, then add new ones. Returns null for a single cell (let normal paste happen).
  function applyPaste(rows, rowIdx, col, text, mode) {
    const clip = String(text || '').replace(/\r/g, '').replace(/\n+$/, '');
    if (!clip.includes('\t') && !clip.includes('\n')) return null;
    const data = clip.split('\n').map((r) => r.split('\t'));
    const ncols = MODES[mode].columns.length;
    const out = rows.map((r) => ({ ...r, lines: r.lines ? [...r.lines] : undefined }));
    const targets = [];
    for (let i = rowIdx; i < out.length; i++) if (out[i].type === 'item') targets.push(i);
    data.forEach((cellsRow, k) => {
      let idx = targets[k];
      if (idx === undefined) { out.push(newItem()); idx = out.length - 1; }
      cellsRow.forEach((val, j) => {
        const c = col + j;
        if (c < ncols) setCell(out[idx], c, val.trim(), mode);
      });
    });
    return out;
  }

  // Copy the item rows as tab-separated text (paste into Excel, edit, paste back).
  function toTable(rows, mode) {
    return rows.filter((r) => r.type === 'item').map((r) => cells(r, mode).join('\t')).join('\n');
  }

  return { MODES, parseRows, buildBody, cells, setCell, newItem, applyPaste, toTable, splitComposer, joinComposer };
});
