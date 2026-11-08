'use strict';

// Runs inside a hidden window. Builds every sheet at real size, applies the
// text-fit guardrail, then tells the main process it is ready to be saved as PDF.
(async function () {
  const job = await window.api.print.getJob();
  const { format, org, content, logoUrl, fonts, mode, paperHex } = job;
  const geo = Layout.geometry(format);
  const PX_PER_IN = 96;

  for (const f of fonts) {
    try {
      const face = new FontFace(f.name, `url(data:${f.mime};base64,${f.base64})`);
      await face.load();
      document.fonts.add(face);
    } catch (e) { /* fall back to system font */ }
  }

  const ctx = { org, content, logoUrl };
  const sheets = [];
  let pageW, pageH;
  if (mode === 'pages') {
    pageW = geo.pageW; pageH = geo.pageH;
    for (let p = 0; p < geo.pages; p++) sheets.push(Layout.pageHtml(geo, p, ctx));
  } else {
    pageW = format.width; pageH = format.height;
    for (let s = 0; s < geo.sides.length; s++) sheets.push(Layout.sideHtml(geo, s, ctx));
  }

  document.getElementById('pagecss').textContent = `@page { size: ${pageW}in ${pageH}in; margin: 0; }`;

  const out = document.getElementById('out');
  out.innerHTML = sheets.map((html) => `<div class="sheet">${html}</div>`).join('');
  for (const el of out.querySelectorAll('.sheet')) {
    el.style.width = pageW + 'in';
    el.style.height = pageH + 'in';
    el.style.background = paperHex || '#ffffff';
    el.style.fontSize = PX_PER_IN * 0.17 + 'px';
    el.style.setProperty('--primary', org.primary_color);
    el.style.setProperty('--accent', org.accent_color);
    el.style.setProperty('--heading-font', `"${org.heading_font}", serif`);
    el.style.setProperty('--body-font', `"${org.body_font}", sans-serif`);
  }

  await document.fonts.ready;
  const overflow = Layout.fitAll(out);
  window.api.print.ready({ overflow, sheets: sheets.length });
})();
