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
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Layout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
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
      body: c.body != null ? String(c.body) : legacyBody(c)
    };
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
    const endAll = () => { endPara(); role = null; };

    for (const raw of src) {
      const t = raw.trim();
      if (!t) { endAll(); continue; }

      let m;
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
        const parts = body.split('|').map((s) => s.trim());
        const label = parts[0];
        const mid = parts.length >= 3 ? parts[1] : '';
        const right = parts.length >= 3 ? parts.slice(2).join(' | ') : parts[1] || '';
        blocks.push({
          type: 'item',
          html: `<div class="item${stand ? ' stand' : ''}"><span class="lab">${inline(label)}</span>` +
            (mid ? `<span class="mid">${inline(mid)}</span>` : '') +
            (right ? `<span class="rt">${inline(right)}</span>` : '') + '</div>'
        });
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

    for (const b of blocks) {
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

  function backBlock(ctx) {
    const { org } = ctx;
    const rows = [org.address, org.phone, org.website, org.email].filter(Boolean);
    return logoImg(ctx) +
      `<div class="backname">${esc(org.name)}</div>` +
      (org.tagline ? `<div class="tagline">${esc(org.tagline)}</div>` : '') +
      '<div class="rule"></div>' +
      '<div class="contact">' + rows.map((r) => `<div>${esc(r)}</div>`).join('') + '</div>';
  }

  function panel(role, cls, innerHtml, opts) {
    opts = opts || {};
    return `<div class="panel ${cls}" data-role="${role}"${opts.fit ? ' data-fit="1"' : ''}>` +
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
    const blocks = parseBody(content.body);
    const head = geo.kind === 'flat' ? `<div class="head">${headBlock(c, content)}</div>` : '';

    // Measure at a fixed scale so pagination never depends on the window size.
    const sheet = doc.createElement('div');
    sheet.className = 'sheet measure';
    sheet.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;` +
      `width:${geo.pageW}in;height:${geo.pageH}in;font-size:${PX_PER_IN * EM_IN}px`;
    setVars(sheet, ctx.org);
    sheet.innerHTML = '<div class="panel flow"><div class="inner"></div></div>';
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
        pages.push({ role: i === 0 ? 'head-flow' : 'flow', panel: panel(i === 0 ? 'head-flow' : 'flow', i === 0 ? 'flow head-flow' : 'flow', (i === 0 ? head : '') + flowHtml(list), { fit: false, num: i + 1 }) });
      });
    } else {
      const flow = done.length === 1 && done[0].length === 0 ? [] : done;
      const notes = (num) => ({ role: 'notes', panel: panel('notes', 'flow', '<h3 class="sec">Notes</h3><div class="lines"></div>', { num }) });
      const cover = { role: 'cover', panel: panel('cover', 'center', headBlock(c, content), { fit: true }) };
      const back = { role: 'back', panel: panel('back', 'center', backBlock(c), { fit: true }) };
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

  return { PX_PER_IN, EM_IN, geometry, impose, normContent, parseBody, paginate, sideHtml, pageHtml, fitAll, setVars, esc };
});
