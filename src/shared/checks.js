'use strict';

// "Check my program": plain-language problems a person would want to know about before printing.
// Pure function (no DOM), so it is easy to test. Each result is { level: 'warn' | 'info', msg }.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout'));
  else root.Checks = factory(root.Layout);
})(typeof self !== 'undefined' ? self : this, function (Layout) {
  // Words the wizard and templates leave behind for the person to replace.
  const PLACEHOLDER = new RegExp([
    '\\b(?:Student|Teacher|Conductor|Ensemble|Performer|Piece|Poem|Event|Award|Scholarship|Character|Sponsor|Composer) (?:Names?|Title)\\b',
    '\\| (?:Names?|Numbers?|Passage|Speaker|Location(?: and time)?|Setting|Detail)\\s*(?:\\||$)',
    '\\bAdd (?:the |a |each |sponsor |few )?[^\\n]{0,40}\\bhere\\b',
    'Type or paste', 'Venue name', 'Place of the ceremony', 'First announcement', 'Second announcement',
    'Full Name · Birth Year', 'Bride & Groom', 'Name of the (?:church|school)', '\\bTell the audience\\b'
  ].join('|'), 'i');

  function examples(text) {
    const found = [];
    for (const line of String(text || '').split('\n')) {
      const m = line.match(PLACEHOLDER);
      if (m) found.push(m[0].replace(/^\|\s*/, '').replace(/\s*\|?$/, '').trim());
    }
    return found;
  }

  function run(opts) {
    const { content: raw, layout, geo, org } = opts;
    const c = Layout.normContent(raw);
    const out = [];
    const warn = (msg) => out.push({ level: 'warn', msg });
    const info = (msg) => out.push({ level: 'info', msg });
    const booklet = geo && geo.kind !== 'flat';

    if (layout && layout.overflow) {
      out.push({ level: 'warn', msg: geo && geo.kind === 'trifold'
        ? "There is too much text for a tri-fold. Shorten it or choose a booklet."
        : "Some text doesn't fit on its page. Shorten it, make the text smaller, or choose a bigger format." });
    }
    if (!c.plain && booklet && !c.title.trim()) warn('The cover has no title.');
    if (!c.plain && booklet && c.cover.show.date && !c.date.trim()) warn('There is no date on the cover.');
    if (!c.plain && org && !org.logo_asset_id && c.cover.show.logo && booklet) info('There is no logo yet. Add one under Edit next to the organization name.');

    const all = [c.title, c.subtitle, c.body, c.cover.intro, c.cover.middle, c.cover.footer, c.cover.quote, c.back.text,
      ...(c.boxes || []).map((b) => b.text)].join('\n');
    const ph = examples(all);
    if (ph.length) {
      const first = [...new Set(ph)].slice(0, 3).map((s) => `"${s}"`).join(', ');
      warn(`${ph.length} ${ph.length === 1 ? 'place still has' : 'places still have'} sample text to replace, such as ${first}.`);
    }

    if (layout) {
      const empty = layout.pages.filter((p) => p.role === 'blank' || p.role === 'notes').length;
      if (empty >= 2) info(`${empty} pages are empty or only have a Notes page. You could use them for announcements, a prayer list or a picture.`);
    }
    if (c.type.scale < 0.9) warn('The text size is small. It may be hard to read when printed, especially for older readers.');
    for (const b of c.boxes) {
      if (b.x + b.w > 101 || b.y + b.h > 101 || b.x < -1 || b.y < -1) { warn('A box sticks out past the edge of the page. Move it back in so it prints.'); break; }
    }
    return out;
  }

  return { run, examples };
});
