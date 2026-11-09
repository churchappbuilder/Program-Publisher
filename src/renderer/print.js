'use strict';

// Runs inside a hidden window. Flows the text across pages, builds every sheet at
// real size, applies the text-fit guardrail, then tells the main process it is
// ready to be saved as PDF.
(async function () {
  const job = await window.api.print.getJob();
  const { format, org, content, logoUrl, coverUrl, coverLogoUrl, assetUrls, fonts, mode, paperHex, crop, test } = job;
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

  const layout = Layout.paginate(document, geo, { org, content, logoUrl, coverUrl, coverLogoUrl, assetUrls });

  let sheets = [];
  let pageW, pageH;
  if (mode === 'pages') {
    pageW = geo.pageW; pageH = geo.pageH;
    for (let p = 0; p < layout.pages.length; p++) sheets.push(Layout.pageHtml(layout, p));
  } else {
    pageW = geo.sheetW; pageH = geo.sheetH;
    for (let s = 0; s < layout.sides.length; s++) sheets.push(Layout.sideHtml(layout, s));
  }
  if (test) sheets = sheets.slice(0, 1); // a test print is just the first sheet

  // Crop marks sit outside the sheet, so the paper is a little bigger than the sheet.
  const M = crop ? 0.375 : 0;
  document.getElementById('pagecss').textContent = `@page { size: ${pageW + 2 * M}in ${pageH + 2 * M}in; margin: 0; }`;

  const marks = () => {
    const line = (l, t, w, h) => `<i class="cm" style="left:${l}in;top:${t}in;width:${w}in;height:${h}in"></i>`;
    const x0 = M, y0 = M, x1 = M + pageW, y1 = M + pageH, g = 0.0625, len = 0.25;
    let out = '';
    for (const [x, y, dx, dy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]) {
      out += line(dx < 0 ? x - g - len : x + g, y, len, 0);   // horizontal mark
      out += line(x, dy < 0 ? y - g - len : y + g, 0, len);   // vertical mark
    }
    return out;
  };

  const testNote = test
    ? '<div class="testnote"><div class="sq"></div><div>Test page. This square should measure exactly 1 inch (2.54 cm). If it does not, turn off "Fit to page" or "Scale" in the printer settings.</div></div>'
    : '';

  const out = document.getElementById('out');
  out.innerHTML = sheets.map((html) =>
    `<div class="cw" style="width:${pageW + 2 * M}in;height:${pageH + 2 * M}in;padding:${M}in">` +
    `<div class="sheet">${html}</div>${crop ? marks() : ''}${testNote}</div>`).join('');
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
