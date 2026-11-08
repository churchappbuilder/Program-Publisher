'use strict';

// Shared page layout. Used by BOTH the on-screen preview and the PDF export,
// so what you see is what you print.
//
// Terms:
//   sheet  = one physical side of paper going through the printer
//   page   = one logical bulletin page (a panel when folded)
//   side   = the arrangement of pages on one side of the sheet
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Layout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // What each logical page holds, in reading order.
  const ROLES = {
    1: ['cover-order'],
    4: ['cover', 'order', 'announcements', 'back'],
    6: ['cover', 'order', 'announcements', 'notes', 'welcome', 'back']
  };

  // Imposition: which logical pages (0-based, left to right) sit on each side
  // of the sheet so that everything reads in order once folded.
  //  Bi-fold:  outside = [back, cover]        inside = [p2, p3]
  //  Tri-fold: outside = [flap, back, cover]  inside = [p2, p3, p4]
  const SIDES = {
    1: [[0]],
    4: [[3, 0], [1, 2]],
    6: [[4, 5, 0], [1, 2, 3]]
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function geometry(format) {
    const panels = format.panels || 1;
    const pages = panels === 1 ? 1 : panels * 2;
    if (!ROLES[pages]) throw new Error(`Unsupported fold: ${panels} panels`);
    return {
      panels,
      pages,
      roles: ROLES[pages],
      sides: SIDES[pages],
      pageW: format.width / panels,
      pageH: format.height
    };
  }

  function lines(v) {
    return Array.isArray(v) ? v.filter(Boolean) : String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function normContent(c) {
    c = c || {};
    return {
      title: c.title || '',
      subtitle: c.subtitle || '',
      date: c.date || '',
      welcome: c.welcome || '',
      items: lines(c.items),
      announcements: lines(c.announcements)
    };
  }

  // ---- page bodies ----

  function coverBlock(ctx) {
    const { org, content: c, logoUrl } = ctx;
    return (logoUrl ? `<img class="logo" src="${logoUrl}" alt="">` : '') +
      `<div class="org">${esc(org.name)}</div>` +
      (org.tagline ? `<div class="tagline">${esc(org.tagline)}</div>` : '') +
      '<div class="rule"></div>' +
      `<h2>${esc(c.title)}</h2>` +
      (c.subtitle ? `<div class="subtitle">${esc(c.subtitle)}</div>` : '') +
      (c.date ? `<div class="date">${esc(c.date)}</div>` : '');
  }

  function orderBlock(c) {
    return '<h3>Order of Service</h3><ol>' + c.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ol>';
  }

  function announcementsBlock(c) {
    return '<h3>Announcements</h3><ul class="ann">' + c.announcements.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>';
  }

  function notesBlock(title) {
    return `<h3>${esc(title)}</h3><div class="lines"></div>`;
  }

  function pageBody(role, ctx) {
    const { org, content: c, geo } = ctx;
    switch (role) {
      case 'cover':
        return { cls: 'center', html: coverBlock(ctx) };
      case 'cover-order':
        return {
          cls: '',
          html: `<div class="head">${coverBlock(ctx)}</div>` + orderBlock(c) +
            (c.announcements.length ? announcementsBlock(c) : '')
        };
      case 'order':
        return {
          cls: '',
          html: (geo.pages === 4 && c.welcome ? `<p class="welcome">${esc(c.welcome)}</p>` : '') + orderBlock(c)
        };
      case 'announcements':
        return { cls: '', html: c.announcements.length ? announcementsBlock(c) : notesBlock('Notes') };
      case 'notes':
        return { cls: '', html: notesBlock('Notes') };
      case 'welcome':
        return {
          cls: 'center',
          html: '<h3>Welcome</h3><p class="welcome">' +
            esc(c.welcome || "We're glad you're here. Please make yourself at home.") + '</p>'
        };
      case 'back': {
        const rows = [org.address, org.phone, org.website, org.email].filter(Boolean);
        return {
          cls: 'center',
          html: (ctx.logoUrl ? `<img class="logo" src="${ctx.logoUrl}" alt="">` : '') +
            `<div class="backname">${esc(org.name)}</div>` +
            (org.tagline ? `<div class="tagline">${esc(org.tagline)}</div>` : '') +
            '<div class="rule"></div>' +
            '<div class="contact">' + rows.map((r) => `<div>${esc(r)}</div>`).join('') + '</div>'
        };
      }
      default:
        return { cls: '', html: '' };
    }
  }

  function panelHtml(geo, pageIdx, ctx) {
    const full = { ...ctx, geo, content: normContent(ctx.content) };
    const role = geo.roles[pageIdx];
    const b = pageBody(role, full);
    return `<div class="panel ${b.cls}" data-role="${role}"><div class="inner">${b.html}</div></div>`;
  }

  // HTML for the panels on one side of the printed sheet (imposed order).
  function sideHtml(geo, sideIdx, ctx) {
    return geo.sides[sideIdx].map((p) => panelHtml(geo, p, ctx)).join('');
  }

  // HTML for a single logical page (reading-order export).
  function pageHtml(geo, pageIdx, ctx) {
    return panelHtml(geo, pageIdx, ctx);
  }

  // Guardrail: shrink text inside each panel until it fits, down to a floor.
  // Returns true if anything still overflows at the smallest size.
  function fitAll(rootEl) {
    let overflow = false;
    for (const inner of rootEl.querySelectorAll('.inner')) {
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

  return { ROLES, SIDES, geometry, normContent, sideHtml, pageHtml, fitAll, esc };
});
