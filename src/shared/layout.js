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
      cover: normCover(c.cover)
    };
  }

  // ---------- covers ----------
  // Six layouts, drawn from how real church and school covers are put together.
  const COVER_STYLES = [
    { id: 'classic', label: 'Classic', desc: 'Name, title and date, centered' },
    { id: 'headerfooter', label: 'Name on top, details below', desc: 'Name and logo at the top, title in the middle, date and address at the bottom' },
    { id: 'picture', label: 'Picture feature', desc: 'A large picture in the middle with the title around it' },
    { id: 'full', label: 'Full-page picture', desc: 'The picture fills the cover with the title over it' },
    { id: 'banner', label: 'Color banner', desc: 'A colored band across the top with your name' },
    { id: 'framed', label: 'Framed', desc: 'A border around centered text, good with a verse' }
  ];

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
      emphasis: v.emphasis === 'title' ? 'title' : 'name' // what stands out most: the church or school name, or the program title
    };
  }

  // "Next week": keep the structure of a service but blank what changes weekly.
  // On order-of-service lines everything after the first | is dropped
  // (hymn numbers, scripture passages, who is preaching). Everything else is kept.
  function clearWeekly(text) {
    return String(text || '').split('\n').map((line) => {
      const t = line.trim();
      if (!t || /^(#|>|-|\^|\[|={3,})/.test(t)) return line;
      const m = t.match(/^(\+\s+)?(.*)$/);
      const rest = m[2];
      if (ROLE_RE.test(rest) || !rest.includes('|')) return line;
      return (m[1] || '') + rest.split('|')[0].trim() + ' |';
    }).join('\n');
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
    if (/^\^\s?/.test(t)) return 'center';
    if (/^[-•]\s+/.test(t)) return 'bullet';
    const body = t.replace(/^\+\s+/, '');
    if (ROLE_RE.test(body)) return 'role';
    if (body.includes('|')) return 'item';
    return 'text';
  }

  // "+ Label | Middle | Right" -> { stand, label, mid, right }; null if not an item line.
  function parseItemLine(raw) {
    if (classifyLine(raw) !== 'item') return null;
    let body = String(raw).trim();
    const stand = /^\+\s+/.test(body);
    body = body.replace(/^\+\s+/, '');
    const parts = body.split('|').map((s) => s.trim());
    return {
      stand,
      label: parts[0],
      mid: parts.length >= 3 ? parts[1] : '',
      right: parts.length >= 3 ? parts.slice(2).join(' | ') : parts[1] || ''
    };
  }

  function formatItemLine(it) {
    const pre = it.stand ? '+ ' : '';
    const label = String(it.label || '').trim();
    const mid = String(it.mid || '').trim();
    const right = String(it.right || '').trim();
    if (mid) return `${pre}${label} | ${mid} | ${right}`.trimEnd();
    if (right) return `${pre}${label} | ${right}`;
    return `${pre}${label} |`;
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

  // ----- cover pieces -----
  const cvName = (ctx, cv) =>
    (cv.show.logo ? logoImg(ctx) : '') +
    (cv.show.name ? `<div class="org">${esc(ctx.org.name)}</div>` : '') +
    (cv.show.tagline && ctx.org.tagline ? `<div class="tagline">${esc(ctx.org.tagline)}</div>` : '');
  const cvTitle = (c) => `<h2>${esc(c.title)}</h2>` + (c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : '');
  const cvDate = (c, cv) => (cv.show.date && c.date ? `<div class="date">${esc(c.date)}</div>` : '');
  const cvQuote = (cv) => (cv.quote.trim() ? `<div class="cvquote">${cv.quote.trim().split('\n').map(inline).join('<br>')}</div>` : '');

  function cvInfo(ctx, cv) {
    const o = ctx.org;
    const rows = cv.show.address ? [o.address, o.phone, o.website, o.email].filter(Boolean) : [];
    const foot = cv.footer.split('\n').map((s) => s.trim()).filter(Boolean);
    return (foot.length ? `<div class="cvfoot">${foot.map((f) => `<div>${inline(f)}</div>`).join('')}</div>` : '') +
      (rows.length ? `<div class="cvinfo">${rows.map((r) => `<div>${esc(r)}</div>`).join('')}</div>` : '');
  }

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
    const b = coverBody(ctx, content);
    return panel('cover', 'cv ' + b.cls + ' emph-' + content.cover.emphasis, b.html, { fit: true });
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
    const head = geo.kind === 'flat' && !content.plain ? `<div class="head">${headBlock(c, content)}</div>` : '';

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
        pages.push({ role: i === 0 ? 'head-flow' : 'flow', panel: panel(i === 0 ? 'head-flow' : 'flow', i === 0 ? 'flow head-flow' : 'flow', (i === 0 ? head : '') + flowHtml(list), { fit: false, num: content.plain ? 0 : i + 1 }) });
      });
    } else {
      const flow = done.length === 1 && done[0].length === 0 ? [] : done;
      const notes = (num) => ({ role: 'notes', panel: panel('notes', 'flow', '<h3 class="sec">Notes</h3><div class="lines"></div>', { num }) });
      const cover = { role: 'cover', panel: coverPanel(c, content) };
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

  return { PX_PER_IN, EM_IN, COVER_STYLES, normCover, coverPanel, geometry, impose, normContent, clearWeekly, insertFormatId, classifyLine, parseItemLine, formatItemLine, parseBody, paginate, sideHtml, pageHtml, fitAll, setVars, esc };
});
