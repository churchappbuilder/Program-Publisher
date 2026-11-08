'use strict';

// Runs inside a hidden window. Flows the text across pages, builds every sheet at
// real size, applies the text-fit guardrail, then tells the main process it is
// ready to be saved as PDF.
(async function () {
  const job = await window.api.print.getJob();
  const { format, org, content, logoUrl, fonts, mode, paperHex } = job;
  const geo = Layout.geometry(format);

  // Fonts must be loaded before measuring, or pagination would differ from the preview.
  for (const f of fonts) {
    try {
      const face = new FontFace(f.name, `url(data:${f.mime};base64,${f.base64})`);
      await face.load();
      document.fonts.add(face);
    } catch (e) { /* fall back to system font */ }
  }
  await document.fonts.ready;

  const layout = Layout.paginate(document, geo, { org, content, logoUrl });

  const sheets = [];
  let pageW, pageH;
  if (mode === 'pages') {
    pageW = geo.pageW; pageH = geo.pageH;
    for (let p = 0; p < layout.pages.length; p++) sheets.push(Layout.pageHtml(layout, p));
  } else {
    pageW = geo.sheetW; pageH = geo.sheetH;
    for (let s = 0; s < layout.sides.length; s++) sheets.push(Layout.sideHtml(layout, s));
  }

  document.getElementById('pagecss').textContent = `@page { size: ${pageW}in ${pageH}in; margin: 0; }`;

  const out = document.getElementById('out');
  out.innerHTML = sheets.map((html) => `<div class="sheet">${html}</div>`).join('');
  for (const el of out.querySelectorAll('.sheet')) {
    el.style.width = pageW + 'in';
    el.style.height = pageH + 'in';
    el.style.background = paperHex || '#ffffff';
    el.style.fontSize = Layout.PX_PER_IN * Layout.EM_IN + 'px';
    Layout.setVars(el, org);
  }

  await document.fonts.ready;
  const overflow = Layout.fitAll(out) || layout.overflow;
  window.api.print.ready({ overflow, sheets: sheets.length, pages: layout.pages.length });
})();
