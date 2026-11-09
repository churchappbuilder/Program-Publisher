'use strict';

// Shared page layout. Used by BOTH the on-screen preview and the PDF export,
// so what you see is what you print.
//
// Terms:
//   page   = one logical page of the finished piece (a panel when folded)
//   side   = the pages that sit on one side of one printed sheet
//   kind   = flat (one page per sheet) | booklet (folded sheet, any multiple of 4
//            pages) | trifold (6 fixed panels)
//
// The body of a bulletin is plain text with a few simple markers (see parseBody).
// It is flowed across as many pages as it needs.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./artwork'));
  else root.Layout = factory(root.Artwork);
})(typeof self !== 'undefined' ? self : this, function (Artwork) {
  const PX_PER_IN = 96;
  const EM_IN = 0.17; // one em of the sheet's font size, in inches

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // **bold** and *italic* inside a line of text.
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  }

  // ---------- geometry & imposition ----------

  function geometry(format) {
    const panels = format.panels || 1;
    const kind = panels === 1 ? 'flat' : panels === 2 ? 'booklet' : panels === 3 ? 'trifold' : null;
    if (!kind) throw new Error(`Unsupported fold: ${panels} panels`);
    return {
      kind,
      panels,
      sheetW: format.width,
      sheetH: format.height,
      pageW: format.width / panels,
      pageH: format.height
    };
  }

  // Which pages (0-based, left to right) go on each printed side so everything
  // reads in order once folded.
  //   flat:    every page is its own sheet
  //   booklet: nested sheets (saddle stitch). n must be a multiple of 4.
  //            Sheet s: outside = [n-1-2s, 2s], inside = [2s+1, n-2-2s]
  //   trifold: outside = [flap, back, cover], inside = [p2, p3, p4]
  function impose(kind, n) {
    if (kind === 'flat') return Array.from({ length: n }, (_, i) => [i]);
    if (kind === 'trifold') return [[4, 5, 0], [1, 2, 3]];
    if (n % 4 !== 0) throw new Error('A booklet needs a multiple of 4 pages.');
    const sides = [];
    for (let s = 0; s < n / 4; s++) {
      sides.push([n - 1 - 2 * s, 2 * s]);
      sides.push([2 * s + 1, n - 2 - 2 * s]);
    }
    return sides;
  }

  // ---------- content ----------

  function lines(v) {
    return Array.isArray(v) ? v.filter(Boolean) : String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  // Older templates stored separate welcome / items / announcements fields.
  function legacyBody(c) {
    const out = [];
    if (c.welcome) out.push(c.welcome, '');
    const items = lines(c.items);
    if (items.length) { out.push('# Order of Service'); items.forEach((i) => out.push(i + ' |')); out.push(''); }
    const ann = lines(c.announcements);
    if (ann.length) { out.push('# Announcements'); ann.forEach((a) => out.push('- ' + a)); }
    return out.join('\n');
  }

  function normContent(c) {
    c = c || {};
    return {
      title: c.title || '',
      subtitle: c.subtitle || '',
      date: c.date || '',
      body: c.body != null ? String(c.body) : legacyBody(c),
      plain: !!c.plain, // an insert: just the text, no cover header or page numbers
      cover: normCover(c.cover),
      back: normBack(c.back),
      notesPage: c.notesPage !== false, // fill spare pages in a booklet with a Notes page (otherwise they are left blank)
      type: normType(c.type),
      boxes: normBoxes(c.boxes)
    };
  }

  // ---------- text size and margins (kept within safe limits) ----------
  const TEXT_SIZES = [{ id: 'small', label: 'Smaller', scale: 0.9 }, { id: 'normal', label: 'Normal', scale: 1 }, { id: 'large', label: 'Larger', scale: 1.15 }, { id: 'xlarge', label: 'Huge', scale: 1.3 }];
  const MARGINS = [{ id: 'tight', label: 'Tight', margin: 0.8 }, { id: 'normal', label: 'Normal', margin: 1 }, { id: 'wide', label: 'Roomy', margin: 1.3 }];
  function normType(v) {
    v = v || {};
    const num = (n, d, lo, hi) => (Number.isFinite(Number(n)) && n !== '' && n != null ? Math.max(lo, Math.min(hi, Number(n))) : d);
    return { scale: num(v.scale, 1, 0.8, 1.4), margin: num(v.margin, 1, 0.8, 1.5) }; // never smaller than about 8 pt or closer than 0.25 in to the edge
  }

  // ---------- free boxes: text and pictures placed anywhere on a page ----------
  // x, y, w, h are percents of the page. page is the page number counting from 0 (0 = cover).
  function normBoxes(list) {
    if (!Array.isArray(list)) return [];
    const num = (n, d, lo, hi) => (Number.isFinite(Number(n)) && n !== '' && n != null ? Math.max(lo, Math.min(hi, Number(n))) : d);
    return list.filter((b) => b && typeof b === 'object').slice(0, 60).map((b, i) => ({
      id: String(b.id || 'b' + (i + 1)),
      page: Math.max(0, Math.min(99, Math.round(num(b.page, 1, 0, 99)))),
      kind: b.kind === 'image' ? 'image' : 'text',
      x: num(b.x, 10, -5, 100), y: num(b.y, 10, -5, 100), w: num(b.w, 40, 5, 105), h: num(b.h, 20, 3, 105),
      text: String(b.text || ''),
      size: num(b.size, 1, 0.6, 3),
      align: ['left', 'center', 'right'].includes(b.align) ? b.align : 'left',
      bold: !!b.bold,
      assetId: b.assetId ? Number(b.assetId) : '',
      caption: String(b.caption || ''),
      frame: !!b.frame // a thin border (a boxed announcement)
    }));
  }

  function boxHtml(b, ctx) {
    const pos = `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`;
    if (b.kind === 'image') {
      const url = ctx.assetUrls && ctx.assetUrls[b.assetId];
      const img = url ? `<img src="${url}" alt="">` : '<div class="fph">Picture</div>';
      return `<div class="fbox fimg${b.frame ? ' fframe' : ''}" data-box="${esc(b.id)}" style="${pos}">${img}${b.caption ? `<div class="fcap">${inline(b.caption)}</div>` : ''}</div>`;
    }
    const inner = parseBody(b.text).filter((x) => !x.pageBreak).map((x) => x.html).join('');
    return `<div class="fbox ftext${b.frame ? ' fframe' : ''}" data-box="${esc(b.id)}" style="${pos};font-size:${b.size}em;text-align:${b.align};${b.bold ? 'font-weight:700;' : ''}">${inner}</div>`;
  }

  function addBoxes(panelHtml, pageIdx, boxes, ctx) {
    const mine = boxes.filter((b) => b.page === pageIdx);
    if (!mine.length) return panelHtml;
    return panelHtml.replace(/<\/div>$/, mine.map((b) => boxHtml(b, ctx)).join('') + '</div>');
  }

  // ---------- back cover ----------
  const BACK_STYLES = [
    { id: 'name', label: 'Name and address', desc: 'The logo, name and contact details, centered' },
    { id: 'announce', label: 'Announcements', desc: 'Your announcements or other text, with the name and address at the bottom' },
    { id: 'text', label: 'Only my text', desc: 'Just the text you type: announcements, a calendar, a prayer list' },
    { id: 'blank', label: 'Blank', desc: 'Leave the back page empty' }
  ];
  const BACK_DEFAULT_SHOW = { logo: true, name: true, tagline: true, contact: true };

  function normBack(v) {
    v = v || {};
    return {
      style: BACK_STYLES.some((s) => s.id === v.style) ? v.style : 'name',
      show: { ...BACK_DEFAULT_SHOW, ...(v.show || {}) },
      text: String(v.text || '')
    };
  }

  // ---------- covers ----------
  // Six layouts, drawn from how real church and school covers are put together.
  const COVER_STYLES = [
    { id: 'classic', label: 'Classic', desc: 'Name, title and date, centered' },
    { id: 'traditional', label: 'Traditional', desc: 'Formal and centered: logo and name at the top, title and performers, place and date at the bottom' },
    { id: 'headerfooter', label: 'Name on top, details below', desc: 'Name and logo at the top, title in the middle, date and address at the bottom' },
    { id: 'picture', label: 'Picture feature', desc: 'A large picture in the middle with the title around it' },
    { id: 'full', label: 'Full-page picture', desc: 'The picture fills the cover with the title over it' },
    { id: 'banner', label: 'Color banner', desc: 'A colored band across the top with your name' },
    { id: 'framed', label: 'Framed', desc: 'A border around centered text, good with a verse' },
    { id: 'custom', label: 'Your own layout (expert)', desc: 'Drag the logo, name, title and picture wherever you want them' }
  ];

  // Starting positions for the "your own layout" cover. x and y are the center of each piece as a percent
  // of the page, w is its width in percent, s its text size (1 = normal).
  const CUSTOM_PIECES = [
    { id: 'logo', label: 'Logo', x: 50, y: 13, w: 26, s: 1 },
    { id: 'name', label: 'Name', x: 50, y: 26, w: 86, s: 1 },
    { id: 'tagline', label: 'Tagline', x: 50, y: 31, w: 80, s: 1 },
    { id: 'intro', label: 'Line above the title', x: 50, y: 38, w: 80, s: 1 },
    { id: 'title', label: 'Title', x: 50, y: 44, w: 84, s: 1 },
    { id: 'subtitle', label: 'Subtitle', x: 50, y: 50, w: 84, s: 1 },
    { id: 'art', label: 'Picture', x: 50, y: 64, w: 34, s: 1 },
    { id: 'middle', label: 'Performers or details', x: 50, y: 79, w: 80, s: 1 },
    { id: 'quote', label: 'Verse', x: 50, y: 85, w: 80, s: 1 },
    { id: 'date', label: 'Date', x: 50, y: 90, w: 80, s: 1 },
    { id: 'footer', label: 'Extra text', x: 50, y: 94, w: 84, s: 1 },
    { id: 'address', label: 'Address', x: 50, y: 97, w: 84, s: 1 }
  ];
  function normCustom(v) {
    const out = {};
    v = v && typeof v === 'object' ? v : {};
    for (const p of CUSTOM_PIECES) {
      const o = v[p.id] || {};
      const num = (n, d, lo, hi) => (Number.isFinite(Number(n)) && n !== '' && n != null ? Math.max(lo, Math.min(hi, Number(n))) : d);
      out[p.id] = { x: num(o.x, p.x, 0, 100), y: num(o.y, p.y, 0, 100), w: num(o.w, p.w, 8, 100), s: num(o.s, p.s, 0.4, 3), hide: !!o.hide };
    }
    return out;
  }

  const COVER_DEFAULT_SHOW = { logo: true, name: true, tagline: true, date: true, address: false };

  function normCover(v) {
    v = v || {};
    const artKinds = ['none', 'builtin', 'asset'];
    return {
      style: COVER_STYLES.some((s) => s.id === v.style) ? v.style : 'classic',
      art: v.art && artKinds.includes(v.art.kind) ? { kind: v.art.kind, id: v.art.id == null ? '' : v.art.id } : { kind: 'none', id: '' },
      show: { ...COVER_DEFAULT_SHOW, ...(v.show || {}) },
      quote: String(v.quote || ''),
      footer: String(v.footer || ''),
      emphasis: v.emphasis === 'title' ? 'title' : 'name', // what stands out most: the church or school name, or the program title
      intro: String(v.intro || ''),   // a short line above the title, such as 'presents'
      middle: String(v.middle || ''), // performers or details under the title (Traditional layout)
      logoSize: ['small', 'medium', 'large'].includes(v.logoSize) ? v.logoSize : 'large',
      logoId: v.logoId ? Number(v.logoId) : '', // which of the organization's logos to show ('' = the main logo)
      watermark: !!v.watermark, // show the logo faintly behind the text
      custom: normCustom(v.custom) // positions for the "your own layout" style
    };
  }

  // "Next week": keep the structure of a service but blank what changes weekly.
  // On order-of-service lines everything after the first | is dropped
  // (hymn numbers, scripture passages, who is preaching). Everything else is kept.
  // Sections that change every week (announcements, calendars, prayer lists, ...) are reset too, and any
  // Bible passage or note box gets sample text, so the old week's words never reach the new bulletin.
  // allWeekly: treat the whole text as weekly (used for an announcements back page).
  const WEEKLY_HEADING = /announce|this week|calendar|prayer|birthday|anniversar|nursery|greeting|fellowship|upcoming|coming up|schedule|news/i;
  function clearWeekly(text, allWeekly) {
    const out = [];
    let weekly = !!allWeekly;
    let skip = null;      // the kind of block whose lines are being dropped
    let bullet = false;   // one sample bullet has been written for this section
    for (const line of String(text || '').split('\n')) {
      const t = line.trim();
      if (skip) { if (new RegExp('^\\[/' + skip + '\\]$', 'i').test(t)) skip = null; continue; }
      let m;
      if ((m = t.match(/^#\s+(.*)$/))) { weekly = !!allWeekly || WEEKLY_HEADING.test(m[1]); bullet = false; out.push(line); continue; }
      if (/^\[scripture(\s[^\]]*)?\]$/i.test(t)) { out.push('[scripture Passage]', 'Type or paste the verses here, one verse per line.', '[/scripture]'); skip = 'scripture'; continue; }
      if (/^\[note(\s[^\]]*)?\]$/i.test(t)) { out.push(line, 'Write the note here.', '[/note]'); skip = 'note'; continue; }
      if (weekly && /^\[table(\s[^\]]*)?\]$/i.test(t)) { out.push(line, 'Day | Time | Event', '[/table]'); skip = 'table'; continue; }
      if (weekly && /^\[columns(\s[^\]]*)?\]$/i.test(t)) { out.push(line, 'Name', '[/columns]'); skip = 'columns'; continue; }
      if (weekly && /^[-•]\s+/.test(t)) { if (!bullet) { out.push('- New announcement'); bullet = true; } continue; }
      if (!t || /^(#|>|-|\^|\[|={3,})/.test(t)) { out.push(line); continue; }
      const mm = t.match(/^(\+\s+)?(.*)$/);
      const rest = mm[2];
      if (ROLE_RE.test(rest) || !rest.includes('|')) { out.push(line); continue; }
      out.push((mm[1] || '') + rest.split('|')[0].trim() + ' |');
    }
    return out.join('\n');
  }

  // The flat paper format whose size equals one finished page of this format
  // (so an insert fits inside the bulletin). null if the catalog has none.
  function insertFormatId(formats, format) {
    const g = geometry(format);
    const f = formats.find((x) => (x.panels || 1) === 1 &&
      Math.abs(x.width - g.pageW) < 0.03 && Math.abs(x.height - g.pageH) < 0.03);
    return f ? f.id : null;
  }

  // ---------- body markup ----------
  //   # Heading                section heading
  //   ## Subheading            smaller heading
  //   Label | Detail           order-of-service line (detail on the right)
  //   Label | Middle | Right   e.g. hymn: name, then tune/author on the right
  //   Label |                  a label with nothing on the right
  //   + ...                    put a stand marker (▲) in front of a line
  //   > text                   instruction in italics (e.g. Please stand)
  //   Leader: text             speaker label in a left column; People / All /
  //   People: text             Congregation are printed bold. Following lines
  //                            with no label continue the same speaker.
  //   - text                   bullet
  //   ^ text                   centered text
  //   [notes] / [notes 8]      ruled lines for writing
  //   ===                      start a new page
  //   plain lines              a paragraph (line breaks are kept)

  const ROLES = ['leader', 'people', 'all', 'celebrant', 'reader', 'lector', 'minister', 'pastor', 'priest',
    'deacon', 'officiant', 'congregation', 'choir', 'cantor', 'women', 'men', 'presider', 'preacher'];
  const BOLD_ROLES = new Set(['people', 'all', 'congregation']);
  const ROLE_RE = new RegExp('^(' + ROLES.join('|') + ')\\s*:\\s*(.*)$', 'i');

  // What kind of line is this? Mirrors the rules parseBody applies, so other
  // modules (the weekly fill-in sheet) classify lines exactly the same way.
  function classifyLine(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t) return 'blank';
    if (/^={3,}$/.test(t)) return 'break';
    if (/^##\s+/.test(t)) return 'sub';
    if (/^#\s+/.test(t)) return 'sec';
    if (/^>\s?/.test(t)) return 'rubric';
    if (/^\[notes(?:\s+\d+)?\]$/i.test(t)) return 'notes';
    if (/^\[(?:columns|table|scripture|note)(?:\s[^\]]*)?\]$/i.test(t)) return 'cols-open'; // a block that runs until its closing tag
    if (/^\[\/(?:columns|table|scripture|note)\]$/i.test(t)) return 'cols-close';
    if (/^\^\s?/.test(t)) return 'center';
    if (/^[-•]\s+/.test(t)) return 'bullet';
    const body = t.replace(/^\+\s+/, '');
    if (ROLE_RE.test(body)) return 'role';
    if (body.includes('|')) return 'item';
    return 'text';
  }

  // "+ Label | Middle | Right | Note" -> { stand, label, mid, right, note }; null if not an item line.
  // Note is a small line under the right-hand text (a person's title, an arranger).
  function parseItemLine(raw) {
    if (classifyLine(raw) !== 'item') return null;
    let body = String(raw).trim();
    const stand = /^\+\s+/.test(body);
    body = body.replace(/^\+\s+/, '');
    const parts = body.split('|').map((s) => s.trim());
    const it = { stand, label: parts[0], mid: '', right: '', note: '' };
    if (parts.length === 2) it.right = parts[1];
    else if (parts.length === 3) { it.mid = parts[1]; it.right = parts[2]; }
    else if (parts.length >= 4) { it.mid = parts[1]; it.right = parts[2]; it.note = parts.slice(3).join(' | '); }
    return it;
  }

  function formatItemLine(it) {
    const pre = it.stand ? '+ ' : '';
    const label = String(it.label || '').trim();
    const mid = String(it.mid || '').trim();
    const right = String(it.right || '').trim();
    const note = String(it.note || '').trim();
    if (note) return `${pre}${label} | ${mid} | ${right} | ${note}`.replace('|  |', '| |');
    if (mid) return `${pre}${label} | ${mid} | ${right}`.trimEnd();
    if (right) return `${pre}${label} | ${right}`;
    return `${pre}${label} |`;
  }

  // "Composer Name (1756–1791)" -> the composer and the dates (only when the brackets hold a year).
  const YEARS_RE = /^(.*?)\s*\(([^)]*\d{4}[^)]*)\)\s*$/;

  // One line of a program, drawn with dotted leaders to the right-hand text.
  //   right "Composer (1756–1791)" is stacked: composer, then the dates in small type,
  //   and in that case the middle text becomes a line under the title (e.g. "from The Phantom").
  function itemHtml(it, subs) {
    const m = it.right ? it.right.match(YEARS_RE) : null;
    const work = !!(m && m[2]);
    const lines = [];
    if (it.right) lines.push(work ? m[1] : it.right);
    if (work) lines.push(`(${m[2]})`);
    if (it.note) lines.push(it.note);
    const stacked = lines.length > 1;
    const midInRow = it.mid && !work;
    let row = `<div class="item${it.stand ? ' stand' : ''}"><span class="lab">${inline(it.label)}</span>` +
      (midInRow ? `<span class="mid">${inline(it.mid)}</span>` : '') +
      (it.right && !midInRow ? '<span class="fill"></span>' : '');
    if (it.right || it.note) {
      row += stacked
        ? `<span class="rt stack">${lines.map((l, i) => `<span class="${i === 0 ? 'r1' : 'r2'}">${inline(l)}</span>`).join('')}</span>`
        : `<span class="rt">${inline(lines[0] || '')}</span>`;
    }
    row += '</div>';
    const extra = (work && it.mid ? `<div class="worksub">${inline(it.mid)}</div>` : '') +
      (subs && subs.length ? `<div class="subs">${subs.map((s) => `<div>${inline(s)}</div>`).join('')}</div>` : '');
    return extra ? `<div class="entry">${row}${extra}</div>` : row;
  }

  // A block of names (or a roster) printed in columns: [columns 3] ... [/columns].
  // A line is a name; "Name | Hometown" or a tab adds a small detail; ## starts a group heading.
  function colsHtml(n, lines) {
    const out = [];
    for (const raw of lines) {
      const s = raw.trim();
      if (!s) continue;
      let m;
      if ((m = s.match(/^#{1,2}\s+(.*)$/))) { out.push(`<div class="csub">${inline(m[1])}</div>`); continue; }
      const parts = s.split(/\t|\|/).map((p) => p.trim()).filter((p, i) => i === 0 || p);
      out.push(`<div class="nm"><span class="n1">${inline(parts[0])}</span>` + (parts.length > 1 ? `<span class="n2">${inline(parts.slice(1).join(', '))}</span>` : '') + '</div>');
    }
    return `<div class="cols" style="column-count:${n}">${out.join('')}</div>`;
  }
  // A grid for announcements and calendars: [table] ... [/table]. One row per line, cells split by a tab
  // (as pasted from Excel) or |. "[table header]" makes the first row a header; "# text" is a heading row.
  function tableHtml(header, lines) {
    const rows = lines.map((l) => l.trim()).filter(Boolean);
    const cells = (r) => r.split(/\t|\|/).map((c) => c.trim());
    const width = Math.max(1, ...rows.filter((r) => !/^#\s+/.test(r)).map((r) => cells(r).length));
    let head = '';
    let body = rows;
    if (header && rows.length && !/^#\s+/.test(rows[0])) {
      head = '<thead><tr>' + cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>';
      body = rows.slice(1);
    }
    const trs = body.map((r) => {
      const h = r.match(/^#\s+(.*)$/);
      if (h) return `<tr class="grp"><td colspan="${width}">${inline(h[1])}</td></tr>`;
      const cs = cells(r);
      while (cs.length < width) cs.push('');
      return '<tr>' + cs.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
    });
    return `<table class="grid">${head}<tbody>${trs.join('')}</tbody></table>`;
  }

  // A Bible passage printed in the bulletin: [scripture Psalm 95:1-7] ... [/scripture].
  // One verse per line (a leading number becomes a small verse number). Long passages split across pages.
  function scriptureBlocks(ref, lines) {
    const out = [];
    if (ref) out.push({ type: 'scrip-ref', keepNext: true, html: `<div class="scrip-ref">${inline(ref)}</div>` });
    const verses = lines.map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^(\d+)\s+(.*)$/);
      return m ? `<sup class="vn">${m[1]}</sup>${inline(m[2])}` : inline(l);
    });
    for (let i = 0; i < verses.length; i += 3) {
      out.push({ type: 'scrip', html: `<div class="scrip">${verses.slice(i, i + 3).join(' ')}</div>` });
    }
    return out;
  }

  function parseBody(text) {
    const src = String(text || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let para = null;
    let role = null;

    const endPara = () => {
      if (para) {
        blocks.push({ type: 'p', html: `<div class="para">${para.map(inline).join('<br>')}</div>` });
        para = null;
      }
    };
    let lastItem = null; // the program line just read, so indented lines beneath it can attach to it
    let cols = null;     // an open [columns N] block being collected
    const endAll = () => { endPara(); role = null; lastItem = null; };

    // A long list is cut into pieces that each fit on a page; every piece keeps its own columns.
    const pushCols = (n, lines) => {
      const limit = 14 * n;
      let cur = [];
      let count = 0;
      const flush = () => { if (cur.length) { blocks.push({ type: 'cols', html: colsHtml(n, cur) }); cur = []; count = 0; } };
      for (const l of lines) {
        if (!l.trim()) continue;
        if (count >= limit) flush();
        cur.push(l);
        if (!/^#{1,2}\s+/.test(l.trim())) count++;
      }
      flush();
    };

    // Finish whichever block ([columns], [table] or [scripture]) is open.
    const closeBlock = () => {
      if (!cols) return;
      if (cols.kind === 'table') {
        for (let i = 0; i < cols.lines.length; i += 16) blocks.push({ type: 'table', html: tableHtml(cols.header, cols.lines.slice(i, i + 16)) });
      } else if (cols.kind === 'scripture') {
        blocks.push(...scriptureBlocks(cols.ref, cols.lines));
      } else if (cols.kind === 'note') {
        // A teacher's or director's note: a titled box of prose, kept together with what follows its heading.
        const paras = cols.lines.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
        if (paras.length || cols.ref) {
          blocks.push({ type: 'note', html: `<div class="tnote">${cols.ref ? `<div class="tnote-h">${inline(cols.ref)}</div>` : ''}${paras.map((p) => `<p>${p.split('\n').map(inline).join('<br>')}</p>`).join('')}</div>` });
        }
      } else pushCols(cols.n, cols.lines);
      cols = null;
    };

    for (const raw of src) {
      const t = raw.trim();
      if (cols) {
        if (new RegExp('^\\[/' + cols.kind + '\\]$', 'i').test(t)) closeBlock(); else cols.lines.push(raw);
        continue;
      }
      if (!t) { endAll(); continue; }

      // Indented lines right under a program line belong to it (movements, "from ...").
      if (lastItem && /^\s{2,}\S/.test(raw) && classifyLine(t) === 'text') { lastItem.subs.push(t); continue; }

      let m;
      if ((m = t.match(/^\[columns(?:\s+(\d+))?\]$/i))) { endAll(); cols = { kind: 'columns', n: Math.max(1, Math.min(4, Number(m[1] || 2))), lines: [] }; continue; }
      if ((m = t.match(/^\[table(\s+header)?\]$/i))) { endAll(); cols = { kind: 'table', header: !!m[1], lines: [] }; continue; }
      if ((m = t.match(/^\[note(?:\s+(.*))?\]$/i))) { endAll(); cols = { kind: 'note', ref: (m[1] || '').trim(), lines: [] }; continue; }
      if ((m = t.match(/^\[scripture(?:\s+(.*))?\]$/i))) { endAll(); cols = { kind: 'scripture', ref: (m[1] || '').trim(), lines: [] }; continue; }
      if (/^={3,}$/.test(t)) { endAll(); blocks.push({ pageBreak: true }); continue; }
      if ((m = t.match(/^##\s+(.*)$/))) { endAll(); blocks.push({ type: 'sub', keepNext: true, html: `<h4 class="sub">${inline(m[1])}</h4>` }); continue; }
      if ((m = t.match(/^#\s+(.*)$/))) { endAll(); blocks.push({ type: 'sec', keepNext: true, html: `<h3 class="sec">${inline(m[1])}</h3>` }); continue; }
      if ((m = t.match(/^>\s?(.*)$/))) { endAll(); blocks.push({ type: 'rubric', keepNext: true, html: `<div class="rubric">${inline(m[1])}</div>` }); continue; }
      if ((m = t.match(/^\[notes(?:\s+(\d+))?\]$/i))) {
        endAll();
        const n = Math.max(1, Math.min(40, Number(m[1] || 6)));
        blocks.push({ type: 'notes', html: `<div class="notelines" style="height:${(n * 1.55).toFixed(2)}em"></div>` });
        continue;
      }
      if ((m = t.match(/^\^\s?(.*)$/))) { endAll(); blocks.push({ type: 'center', html: `<div class="para center">${inline(m[1])}</div>` }); continue; }
      if ((m = t.match(/^[-•]\s+(.*)$/))) { endAll(); blocks.push({ type: 'bullet', html: `<div class="bul">${inline(m[1])}</div>` }); continue; }

      let stand = false;
      let body = t;
      if (/^\+\s+/.test(body)) { stand = true; body = body.replace(/^\+\s+/, ''); }

      const rm = body.match(ROLE_RE);
      if (rm) {
        endAll();
        role = { type: 'role', role: rm[1], stand, lines: [rm[2]] };
        blocks.push(role);
      } else if (body.includes('|')) {
        endAll();
        const block = { type: 'item', item: parseItemLine(raw), subs: [] };
        blocks.push(block);
        lastItem = block;
      } else if (role) {
        role.lines.push(body);
      } else if (stand) {
        endAll();
        blocks.push({ type: 'p', html: `<div class="para stand">${inline(body)}</div>` });
      } else {
        if (!para) para = [];
        para.push(body);
      }
    }
    endPara();
    closeBlock(); // a block left open at the end

    // A centered line right under a heading (a dean's name, a presiding officer) stays with that heading.
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].type === 'center' && blocks[i - 1].keepNext) blocks[i].keepNext = true;
    }

    for (const b of blocks) {
      if (b.type === 'item') b.html = itemHtml(b.item, b.subs);
      if (b.type === 'role') {
        const bold = BOLD_ROLES.has(b.role.toLowerCase());
        b.html = `<div class="role-row${b.stand ? ' stand' : ''}"><div class="role">${esc(b.role)}</div>` +
          `<div class="say${bold ? ' bold' : ''}">${b.lines.map(inline).join('<br>')}</div></div>`;
      }
    }
    return blocks;
  }

  // ---------- fixed pages ----------

  function logoImg(ctx) {
    return ctx.logoUrl ? `<img class="logo" src="${ctx.logoUrl}" alt="">` : '';
  }

  function headBlock(ctx, c) {
    const { org } = ctx;
    return logoImg(ctx) +
      `<div class="org">${esc(org.name)}</div>` +
      (org.tagline ? `<div class="tagline">${esc(org.tagline)}</div>` : '') +
      '<div class="rule"></div>' +
      `<h2>${esc(c.title)}</h2>` +
      (c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : '') +
      (c.date ? `<div class="date">${esc(c.date)}</div>` : '');
  }

  // ----- cover pieces -----
  const coverLogoImg = (ctx) => { const u = ctx.coverLogoUrl || ctx.logoUrl; return u ? `<img class="logo" src="${u}" alt="">` : ''; };
  const cvName = (ctx, cv) =>
    (cv.show.logo ? coverLogoImg(ctx) : '') +
    (cv.show.name ? `<div class="org">${esc(ctx.org.name)}</div>` : '') +
    (cv.show.tagline && ctx.org.tagline ? `<div class="tagline">${esc(ctx.org.tagline)}</div>` : '');
  const cvTitle = (c) => `<h2>${esc(c.title)}</h2>` + (c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : '');
  const cvDate = (c, cv) => (cv.show.date && c.date ? `<div class="date">${esc(c.date)}</div>` : '');
  const cvQuote = (cv) => (cv.quote.trim() ? `<div class="cvquote">${cv.quote.trim().split('\n').map(inline).join('<br>')}</div>` : '');

  // Extra text at the bottom (times, location) and the address block, as separate pieces.
  function cvFoot(cv) {
    const foot = cv.footer.split('\n').map((s) => s.trim()).filter(Boolean);
    return foot.length ? `<div class="cvfoot">${foot.map((f) => `<div>${inline(f)}</div>`).join('')}</div>` : '';
  }
  function cvAddr(ctx, cv) {
    const o = ctx.org;
    const rows = cv.show.address ? [o.address, o.phone, o.website, o.email].filter(Boolean) : [];
    return rows.length ? `<div class="cvinfo">${rows.map((r) => `<div>${esc(r)}</div>`).join('')}</div>` : '';
  }
  const cvInfo = (ctx, cv) => cvFoot(cv) + cvAddr(ctx, cv);

  // The chosen picture (the church's own, or built-in art that takes the accent color).
  function cvArt(ctx, cv) {
    if (cv.art.kind === 'asset' && ctx.coverUrl) return `<img class="cvimg" src="${ctx.coverUrl}" alt="">`;
    if (cv.art.kind === 'builtin' && Artwork) {
      const s = Artwork.svg(cv.art.id);
      if (s) return `<div class="cvart">${s}</div>`;
    }
    return '';
  }
  const cvPic = (ctx, cv) => { const a = cvArt(ctx, cv); return a ? `<div class="cvpic">${a}</div>` : ''; };

  function coverBody(ctx, c) {
    const cv = c.cover;
    const name = cvName(ctx, cv), title = cvTitle(c), date = cvDate(c, cv), quote = cvQuote(cv), info = cvInfo(ctx, cv), pic = cvPic(ctx, cv);
    const rule = '<div class="rule"></div>';
    switch (cv.style) {
      case 'custom': {
        const inner = {
          logo: cv.show.logo ? coverLogoImg(ctx) : '',
          name: cv.show.name ? `<div class="org">${esc(ctx.org.name)}</div>` : '',
          tagline: cv.show.tagline && ctx.org.tagline ? `<div class="tagline">${esc(ctx.org.tagline)}</div>` : '',
          intro: cv.intro.trim() ? `<div class="cvintro">${inline(cv.intro.trim())}</div>` : '',
          title: c.title ? `<h2>${esc(c.title)}</h2>` : '',
          subtitle: c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : '',
          art: cvArt(ctx, cv),
          middle: cv.middle.trim() ? `<div class="cvmiddle">${cv.middle.trim().split('\n').map((l) => (l.trim() ? `<div>${inline(l.trim())}</div>` : '<div class="gap"></div>')).join('')}</div>` : '',
          quote, date, footer: cvFoot(cv), address: cvAddr(ctx, cv)
        };
        const html = CUSTOM_PIECES.map((p) => {
          const g = cv.custom[p.id];
          if (!inner[p.id] || g.hide) return '';
          return `<div class="cvx cvx-${p.id}" data-el="${p.id}" style="left:${g.x}%;top:${g.y}%;width:${g.w}%;font-size:${g.s}em">${inner[p.id]}</div>`;
        }).join('');
        return { cls: 'cv-custom', html };
      }
      case 'traditional': {
        // Formal and centered, like a concert or commencement program: logo and name on top,
        // the title and the performers in the middle, place and date at the bottom.
        const intro = cv.intro.trim() ? `<div class="cvintro">${inline(cv.intro.trim())}</div>` : '';
        const mid = cv.middle.trim()
          ? `<div class="cvmiddle">${cv.middle.trim().split('\n').map((l) => (l.trim() ? `<div>${inline(l.trim())}</div>` : '<div class="gap"></div>')).join('')}</div>` : '';
        return { cls: 'cv-traditional', html: `<div class="cv-ttop">${name}${intro}</div><div class="cv-tmid">${title}${pic}${mid}${quote}</div><div class="cv-tbot">${cvFoot(cv)}${date}${cvAddr(ctx, cv)}</div>` };
      }
      case 'headerfooter':
        return { cls: 'cv-headerfooter' + (pic ? ' cv-haspic' : ''), html: `<div class="cv-top">${name}</div><div class="cv-mid">${rule}${title}${pic}</div><div class="cv-bot">${date}${quote}${info}</div>` };
      case 'picture':
        return { cls: 'cv-picture' + (pic ? '' : ' cv-nopic'), html: `<div class="cv-head">${name}</div>${pic}<div class="cv-titles">${title}${date}</div>${quote}${info}` };
      case 'full': {
        const art = cvArt(ctx, cv);
        const bleed = cv.art.kind === 'asset' && ctx.coverUrl ? `<div class="cv-bleed">${art}</div>` : `<div class="cv-bleed art">${art}</div>`;
        return { cls: 'cv-full', html: `${bleed}<div class="cv-over"><div class="cv-toptext">${name}</div><div class="cv-band">${title}${date}${quote}${info}</div></div>` };
      }
      case 'banner':
        return { cls: 'cv-banner', html: `<div class="cv-bannerbar">${name}</div><div class="cv-bannerbody">${title}${date}${pic}${quote}${info}</div>` };
      case 'framed':
        return { cls: 'cv-framed', html: `<div class="cv-frame">${name}${rule}${title}${date}${pic}${quote}${info}</div>` };
      default:
        return { cls: 'cv-classic', html: `${name}${rule}${title}${date}${pic}${quote}${info}` };
    }
  }

  // The finished cover page (used by the booklet, and by the cover designer's previews).
  function coverPanel(ctx, content) {
    curType = content.type || curType;
    const b = coverBody(ctx, content);
    const wmUrl = ctx.coverLogoUrl || ctx.logoUrl;
    const wm = content.cover.watermark && wmUrl ? `<div class="cv-water"><img src="${wmUrl}" alt=""></div>` : '';
    return panel('cover', 'cv ' + b.cls + ' emph-' + content.cover.emphasis + ' logo-' + content.cover.logoSize + (wm ? ' cv-wm' : ''), wm + b.html, { fit: content.cover.style !== 'custom' });
  }

  // The back page. Returns the page's CSS class and its contents.
  function backPage(ctx, content) {
    const { org } = ctx;
    const bk = content.back;
    const rows = bk.show.contact ? [org.address, org.phone, org.website, org.email].filter(Boolean) : [];
    const ident = (bk.show.logo ? logoImg(ctx) : '') +
      (bk.show.name ? `<div class="backname">${esc(org.name)}</div>` : '') +
      (bk.show.tagline && org.tagline ? `<div class="tagline">${esc(org.tagline)}</div>` : '') +
      (rows.length ? ((bk.show.name || bk.show.logo) ? '<div class="rule"></div>' : '') + '<div class="contact">' + rows.map((r) => `<div>${esc(r)}</div>`).join('') + '</div>' : '');
    if (bk.style === 'blank') return { cls: 'center', html: '' };
    if (bk.style === 'name') return { cls: 'center', html: ident };
    const text = parseBody(bk.text).filter((b) => !b.pageBreak).map((b) => b.html).join('');
    return { cls: 'flow backflow', html: `<div class="backtext">${text}</div>` + (bk.style === 'announce' && ident ? `<div class="backfoot">${ident}</div>` : '') };
  }

  let curType = { scale: 1, margin: 1 }; // set by paginate/coverPanel before pages are built
  function panel(role, cls, innerHtml, opts) {
    opts = opts || {};
    return `<div class="panel ${cls}" data-role="${role}"${opts.fit ? ' data-fit="1"' : ''} style="--bs:${curType.scale};--mg:${curType.margin}">` +
      `<div class="inner">${innerHtml}</div>` +
      (opts.num ? `<div class="pagenum">${opts.num}</div>` : '') + '</div>';
  }

  // ---------- pagination (needs a DOM to measure text) ----------

  function setVars(el, org) {
    el.style.setProperty('--primary', org.primary_color);
    el.style.setProperty('--accent', org.accent_color);
    el.style.setProperty('--heading-font', `"${org.heading_font}", serif`);
    el.style.setProperty('--body-font', `"${org.body_font}", sans-serif`);
  }

  function paginate(doc, geo, ctx) {
    const content = normContent(ctx.content);
    const c = { ...ctx, content };
    curType = content.type;
    const blocks = parseBody(content.body);
    const head = geo.kind === 'flat' && !content.plain ? `<div class="head">${headBlock(c, content)}</div>` : '';

    // Measure at a fixed scale so pagination never depends on the window size.
    const sheet = doc.createElement('div');
    sheet.className = 'sheet measure';
    sheet.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;` +
      `width:${geo.pageW}in;height:${geo.pageH}in;font-size:${PX_PER_IN * EM_IN}px`;
    setVars(sheet, ctx.org);
    sheet.innerHTML = `<div class="panel flow" style="--bs:${curType.scale};--mg:${curType.margin}"><div class="inner"></div></div>`;
    doc.body.appendChild(sheet);
    const inner = sheet.querySelector('.inner');
    const overflows = () => inner.scrollHeight > inner.clientHeight + 1;

    let overflow = false;
    const done = [];
    let page = [];
    const start = () => (geo.kind === 'flat' && done.length === 0 ? head : '');
    inner.innerHTML = start();

    for (const b of blocks) {
      if (b.pageBreak) {
        if (page.length) { done.push(page); page = []; inner.innerHTML = start(); }
        continue;
      }
      inner.insertAdjacentHTML('beforeend', b.html);
      if (overflows()) {
        if (page.length > 0) {
          // Doesn't fit: close the page. Headings and instructions stay with what follows.
          const carry = [];
          while (page.length > 1 && page[page.length - 1].keepNext) carry.unshift(page.pop());
          done.push(page);
          page = carry;
          inner.innerHTML = start();
          for (const k of page) inner.insertAdjacentHTML('beforeend', k.html);
          inner.insertAdjacentHTML('beforeend', b.html);
          if (overflows()) overflow = true; // a single block taller than a page
        } else {
          overflow = true;
        }
      }
      page.push(b);
    }
    if (page.length || done.length === 0) done.push(page);
    sheet.remove();

    const flowHtml = (list) => list.map((b) => b.html).join('');
    const pages = [];

    if (geo.kind === 'flat') {
      done.forEach((list, i) => {
        pages.push({ role: i === 0 ? 'head-flow' : 'flow', panel: panel(i === 0 ? 'head-flow' : 'flow', i === 0 ? 'flow head-flow' : 'flow', (i === 0 ? head : '') + flowHtml(list), { fit: false, num: content.plain ? 0 : i + 1 }) });
      });
    } else {
      const flow = done.length === 1 && done[0].length === 0 ? [] : done;
      const notes = (num) => (content.notesPage
        ? { role: 'notes', panel: panel('notes', 'flow', '<h3 class="sec">Notes</h3><div class="lines"></div>', { num }) }
        : { role: 'blank', panel: panel('blank', 'flow', '', {}) });
      const cover = { role: 'cover', panel: coverPanel(c, content) };
      const bp = backPage(c, content);
      const back = { role: 'back', panel: panel('back', bp.cls, bp.html, { fit: true }) };
      const flowPage = (list, num) => ({ role: 'flow', panel: panel('flow', 'flow', flowHtml(list), { num }) });

      if (geo.kind === 'trifold') {
        const cap = 4; // pages 2..5
        if (flow.length > cap) overflow = true;
        pages.push(cover);
        for (let i = 0; i < cap; i++) pages.push(flow[i] ? flowPage(flow[i], i + 2) : notes(i + 2));
        pages.push(back);
      } else {
        const total = 2 + flow.length;
        const padded = Math.max(4, Math.ceil(total / 4) * 4);
        pages.push(cover);
        flow.forEach((list, i) => pages.push(flowPage(list, i + 2)));
        for (let n = total; n < padded; n++) pages.push(notes(pages.length + 1));
        pages.push(back);
      }
    }

    // Free boxes (text and pictures placed by hand) are drawn on top of their page.
    if (content.boxes.length) pages.forEach((p, i) => { p.panel = addBoxes(p.panel, i, content.boxes, c); });

    return { geo, pages, sides: impose(geo.kind, pages.length), overflow };
  }

  const sideHtml = (d, sideIdx) => d.sides[sideIdx].map((i) => d.pages[i].panel).join('');
  const pageHtml = (d, pageIdx) => d.pages[pageIdx].panel;

  // Guardrail for covers and back pages: shrink text until it fits, down to a floor.
  // Returns true if anything still overflows at the smallest size.
  function fitAll(rootEl) {
    let overflow = false;
    for (const inner of rootEl.querySelectorAll('.panel[data-fit] .inner')) {
      let scale = 1;
      inner.style.fontSize = '1em';
      while (inner.scrollHeight > inner.clientHeight + 1 && scale > 0.55) {
        scale -= 0.05;
        inner.style.fontSize = scale + 'em';
      }
      if (inner.scrollHeight > inner.clientHeight + 1) overflow = true;
    }
    return overflow;
  }

  return { TEXT_SIZES, MARGINS, normType, normBoxes, PX_PER_IN, EM_IN, COVER_STYLES, CUSTOM_PIECES, BACK_STYLES, normCustom, normBack, normCover, coverPanel, geometry, impose, normContent, clearWeekly, insertFormatId, classifyLine, parseItemLine, formatItemLine, parseBody, paginate, sideHtml, pageHtml, fitAll, setVars, esc };
});
