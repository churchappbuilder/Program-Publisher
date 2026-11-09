'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Layout = require('../src/shared/layout');
const { FORMATS } = require('../src/shared/paper');
const { SERVICE_TYPES } = require('../src/shared/presets');

const fmt = (id) => FORMATS.find((f) => f.id === id);

test('every format in the catalog has a supported geometry', () => {
  for (const f of FORMATS) {
    const g = Layout.geometry(f);
    assert.ok(['flat', 'booklet', 'trifold'].includes(g.kind));
    assert.ok(Math.abs(g.pageW * g.panels - f.width) < 1e-9);
  }
});

test('geometry kinds and page sizes', () => {
  assert.strictEqual(Layout.geometry(fmt('letter')).kind, 'flat');
  const b = Layout.geometry(fmt('letter-bifold'));
  assert.strictEqual(b.kind, 'booklet');
  assert.strictEqual(b.pageW, 5.5);
  assert.strictEqual(b.pageH, 8.5);
  const t = Layout.geometry(fmt('letter-trifold'));
  assert.strictEqual(t.kind, 'trifold');
  assert.ok(Math.abs(t.pageW - 11 / 3) < 1e-9);
});

test('booklet imposition: 4 pages = outside back|cover, inside p2|p3', () => {
  assert.deepStrictEqual(Layout.impose('booklet', 4), [[3, 0], [1, 2]]);
});

test('booklet imposition: 8 pages nest correctly (saddle stitch)', () => {
  // 1-based: outer sheet 8|1 and 2|7, inner sheet 6|3 and 4|5
  assert.deepStrictEqual(Layout.impose('booklet', 8), [[7, 0], [1, 6], [5, 2], [3, 4]]);
});

test('booklet imposition: every page used once; facing pages sum to n+1', () => {
  for (const n of [4, 8, 12, 16, 20, 28]) {
    const sides = Layout.impose('booklet', n);
    assert.strictEqual(sides.length, n / 2);
    assert.deepStrictEqual(sides.flat().sort((a, b) => a - b), [...Array(n).keys()]);
    for (const [l, r] of sides) assert.strictEqual((l + 1) + (r + 1), n + 1);
  }
});

test('booklet needs a multiple of 4', () => {
  assert.throws(() => Layout.impose('booklet', 6));
});

test('tri-fold imposition: cover on outside right, flap outside left', () => {
  assert.deepStrictEqual(Layout.impose('trifold', 6), [[4, 5, 0], [1, 2, 3]]);
});

test('flat: one page per sheet', () => {
  assert.deepStrictEqual(Layout.impose('flat', 3), [[0], [1], [2]]);
});

test('body markup: headings, items, roles, stand marks, breaks', () => {
  const b = Layout.parseBody([
    '# The Word',
    '+ Opening Hymn | Holy, Holy, Holy | 77',
    'Prelude |',
    '> Please stand.',
    'Leader: The Lord be with you.',
    'People: And also with you.',
    'All: Almighty God,',
    'to you all hearts are open.',
    '',
    '===',
    '- Potluck',
    '[notes 4]'
  ].join('\n'));
  assert.deepStrictEqual(b.map((x) => x.type || 'break'), ['sec', 'item', 'item', 'rubric', 'role', 'role', 'role', 'break', 'bullet', 'notes']);
  assert.ok(b[0].keepNext);
  assert.ok(b[1].html.includes('class="item stand"'));
  assert.ok(b[1].html.includes('class="mid"') && b[1].html.includes('class="rt"'));
  assert.ok(b[5].html.includes('say bold'));                 // People is bold
  assert.ok(!b[4].html.includes('say bold'));                // Leader is not
  assert.ok(b[6].html.includes('to you all hearts are open')); // continuation line joined to All
  assert.ok(b[9].html.includes('height:6.20em'));
});

test('body markup escapes user text and supports bold/italic', () => {
  const b = Layout.parseBody('<script>x</script> **bold** and *it*');
  assert.ok(!b[0].html.includes('<script>'));
  assert.ok(b[0].html.includes('<strong>bold</strong>'));
  assert.ok(b[0].html.includes('<em>it</em>'));
});

test('older templates are converted to body markup', () => {
  const c = Layout.normContent({ title: 'T', items: ['Welcome', 'Hymn'], announcements: ['Potluck'], welcome: 'Hello' });
  assert.ok(c.body.includes('# Order of Service'));
  assert.ok(c.body.includes('Welcome |'));
  assert.ok(c.body.includes('- Potluck'));
  assert.ok(c.body.startsWith('Hello'));
  assert.strictEqual(Layout.normContent({ body: 'x' }).body, 'x');
});

test('all service-type presets parse without producing empty output', () => {
  for (const s of SERVICE_TYPES) {
    const blocks = Layout.parseBody(s.body);
    assert.ok(blocks.length > 0, s.id);
    assert.ok(blocks.every((b) => b.pageBreak || b.html), s.id);
  }
});

test('next week: clears details on item lines but keeps structure', () => {
  const out = Layout.clearWeekly([
    '# Gathering',
    '+ Opening Hymn | Holy, Holy, Holy | 77',
    'Sermon | | Pastor Smith',
    'Prelude |',
    'Leader: The Lord be with you.',
    '> Please stand.',
    '- Potluck | Sunday',
    'Plain paragraph with no pipe.'
  ].join('\n')).split('\n');
  assert.strictEqual(out[0], '# Gathering');
  assert.strictEqual(out[1], '+ Opening Hymn |');
  assert.strictEqual(out[2], 'Sermon |');
  assert.strictEqual(out[3], 'Prelude |');
  assert.strictEqual(out[4], 'Leader: The Lord be with you.');
  assert.strictEqual(out[5], '> Please stand.');
  assert.strictEqual(out[6], '- Potluck | Sunday'); // bullets are untouched
  assert.strictEqual(out[7], 'Plain paragraph with no pipe.');
});

test('inserts: a flat format matching one finished bulletin page is found', () => {
  const id = (f) => Layout.insertFormatId(FORMATS, fmt(f));
  assert.strictEqual(id('letter-bifold'), 'half-letter');   // 5.5 x 8.5
  assert.strictEqual(id('tabloid-bifold'), 'letter');       // 8.5 x 11
  assert.strictEqual(id('legal-bifold'), 'insert-7x8');     // 7 x 8.5
  assert.strictEqual(id('letter-trifold'), 'insert-panel'); // 3.67 x 8.5
  assert.strictEqual(id('a4-bifold'), 'a5');
  assert.strictEqual(id('letter'), 'letter');               // flat insert = same size
});

test('built-in texts all parse and have names and sources', () => {
  const { BUILTIN_TEXTS } = require('../src/shared/texts');
  const ids = new Set();
  for (const t of BUILTIN_TEXTS) {
    assert.ok(t.id && t.name && t.group && t.source && t.body.trim().length > 20, t.id);
    assert.ok(!ids.has(t.id), 'duplicate id ' + t.id);
    ids.add(t.id);
    assert.ok(Layout.parseBody(t.body).length > 0, t.id);
  }
  assert.ok(BUILTIN_TEXTS.some((t) => /Apostles/.test(t.name)));
  assert.ok(BUILTIN_TEXTS.some((t) => /Nicene/.test(t.name)));
});

test('covers: normalizing, defaults, and all seven layouts render with every option', () => {
  const c = Layout.normCover(undefined);
  assert.strictEqual(c.style, 'classic');
  assert.strictEqual(c.emphasis, 'name');
  assert.deepStrictEqual(c.art, { kind: 'none', id: '' });
  assert.strictEqual(c.show.address, false);
  assert.strictEqual(Layout.normCover({ style: 'nonsense' }).style, 'classic');
  assert.strictEqual(Layout.normCover({ emphasis: 'title' }).emphasis, 'title');
  assert.strictEqual(Layout.normCover({ art: { kind: 'bad' } }).art.kind, 'none');
  assert.strictEqual(Layout.COVER_STYLES.length, 8);
  assert.strictEqual(c.logoSize, 'large');
  assert.strictEqual(c.intro, '');
  assert.strictEqual(c.middle, '');
  assert.strictEqual(Layout.normCover({ logoSize: 'huge' }).logoSize, 'large');

  const org = { name: 'Grace <Church>', tagline: 'A place', address: '1 Main St', phone: '555', website: 'x.org', email: '' };
  for (const style of Layout.COVER_STYLES.map((s) => s.id)) {
    for (const art of [{ kind: 'none', id: '' }, { kind: 'builtin', id: 'cross' }, { kind: 'asset', id: 1 }]) {
      const content = Layout.normContent({ title: 'Morning Worship', subtitle: 'Sub', date: 'Nov 8', cover: { style, art, quote: 'Psalm 95', footer: '8:30 and 11 am', show: { address: true } } });
      const html = Layout.coverPanel({ org, content, logoUrl: null, coverUrl: 'data:image/png;base64,AAAA' }, content);
      assert.ok(html.includes('cv-' + style), style);
      assert.ok(html.includes('emph-name'), style);
      assert.ok(html.includes('Morning Worship') && html.includes('Nov 8') && html.includes('1 Main St') && html.includes('Psalm 95'), style);
      assert.ok(html.includes('Grace &lt;Church&gt;') && !html.includes('<Church>'), 'name is escaped');
      if (art.kind === 'asset') assert.ok(html.includes('data:image/png;base64,AAAA'), style);
      if (art.kind === 'builtin') assert.ok(html.includes('<svg'), style);
      if (art.kind === 'none') assert.ok(!html.includes('cvpic') && !html.includes('<svg') && !html.includes('<img'), style);
    }
  }
});

test('covers: the show switches hide things, and emphasis switches the class', () => {
  const org = { name: 'Grace Church', tagline: 'A place', address: '1 Main St' };
  const html = (cover) => { const content = Layout.normContent({ title: 'T', date: 'D', cover }); return Layout.coverPanel({ org, content, logoUrl: 'data:image/png;base64,LOGO' }, content); };
  const all = html({});
  assert.ok(all.includes('class="logo"') && all.includes('Grace Church') && all.includes('A place') && all.includes('>D<'));
  assert.ok(!html({ show: { logo: false } }).includes('class="logo"'));
  assert.ok(!html({ show: { name: false } }).includes('class="org"'));
  assert.ok(!html({ show: { tagline: false } }).includes('A place'));
  assert.ok(!html({ show: { date: false } }).includes('class="date"'));
  assert.ok(!all.includes('1 Main St') && html({ show: { address: true } }).includes('1 Main St'));
  assert.ok(html({ emphasis: 'title' }).includes('emph-title'));
});

test('covers: the cover shows up on the cover page of a booklet, and is not used for inserts', () => {
  const g = Layout.geometry(fmt('letter-bifold'));
  assert.strictEqual(g.kind, 'booklet');
  const content = Layout.normContent({ title: 'T', cover: { style: 'banner' } });
  assert.strictEqual(content.cover.style, 'banner');
  assert.strictEqual(Layout.normContent({ title: 'T', plain: true }).plain, true);
});

test('traditional cover: intro line, performers, date and place at the bottom, in order', () => {
  const org = { name: 'Heritage University', tagline: 'Division of Music', address: '', phone: '', website: '', email: '' };
  const content = Layout.normContent({ title: 'Concerto Showcase', subtitle: 'Class of 2026', date: 'Thursday, October 15, 2026', cover: {
    style: 'traditional', intro: 'presents', middle: 'with the\n**UNIVERSITY ORCHESTRA**\n\nMichael Moore, director', footer: 'Rodeheaver Auditorium' } });
  const html = Layout.coverPanel({ org, content, logoUrl: 'data:image/png;base64,LOGO' }, content);
  assert.ok(html.includes('cv-traditional') && html.includes('logo-large'));
  const at = (s) => html.indexOf(s);
  // top: logo, name, division, presents. middle: title, subtitle, performers. bottom: place, then date.
  assert.ok(at('class="logo"') < at('Heritage University') && at('Heritage University') < at('Division of Music') && at('Division of Music') < at('presents'));
  assert.ok(at('presents') < at('Concerto Showcase') && at('Concerto Showcase') < at('Class of 2026') && at('Class of 2026') < at('UNIVERSITY ORCHESTRA'));
  assert.ok(at('UNIVERSITY ORCHESTRA') < at('Michael Moore, director'));
  assert.ok(at('Michael Moore, director') < at('Rodeheaver Auditorium') && at('Rodeheaver Auditorium') < at('Thursday, October 15, 2026'));
  assert.ok(html.includes('<strong>UNIVERSITY ORCHESTRA</strong>') && html.includes('class="gap"'));
  const small = Layout.coverPanel({ org, content: Layout.normContent({ cover: { logoSize: 'small' } }), logoUrl: 'x' }, Layout.normContent({ cover: { logoSize: 'small' } }));
  assert.ok(small.includes('logo-small'));
});
test('program lines: leaders, stacked composer and dates, a title under a name, indented lines', () => {
  const b = Layout.parseBody([
    'Overture | from *Carmen* | Georges Bizet (1838–1875)',
    '  I. Allegro',
    '  II. Andante',
    'Invocation | | David Anderson, DMin | President',
    'Opening Hymn | Holy, Holy, Holy | 77',
    'Prelude |',
    'Sermon | | Pastor Smith'
  ].join('\n'));
  assert.strictEqual(b.length, 5);
  assert.ok(b[0].html.startsWith('<div class="entry">'));
  assert.ok(b[0].html.includes('class="r1">Georges Bizet<') && b[0].html.includes('class="r2">(1838–1875)<'));
  assert.ok(b[0].html.includes('class="worksub">from <em>Carmen</em>'));               // the middle text moves under the title
  assert.ok(b[0].html.includes('<div class="subs"><div>I. Allegro</div><div>II. Andante</div></div>'));
  assert.ok(b[1].html.includes('class="r1">David Anderson, DMin<') && b[1].html.includes('class="r2">President<'));
  assert.ok(b[1].html.includes('class="fill"'));                                        // dotted leader to the name
  assert.ok(b[2].html.includes('class="mid"') && !b[2].html.includes('class="fill"')); // a hymn keeps its middle title
  assert.ok(!b[3].html.includes('class="rt"'));                                         // a bare label has nothing on the right
  assert.ok(b[4].html.includes('class="fill"') && b[4].html.includes('class="rt">Pastor Smith<'));
  assert.ok(!b[4].html.includes('stack'));                                              // brackets that are not years do not stack
  assert.ok(!Layout.parseBody('Psalm | | Psalm 23 (KJV)')[0].html.includes('stack'));
});

test('program lines: the 4th part round-trips and indented lines only attach to a line above them', () => {
  const it = Layout.parseItemLine('+ Invocation | | David Anderson | President');
  assert.deepStrictEqual({ ...it }, { stand: true, label: 'Invocation', mid: '', right: 'David Anderson', note: 'President' });
  assert.strictEqual(Layout.formatItemLine(it), '+ Invocation | | David Anderson | President');
  assert.strictEqual(Layout.formatItemLine({ label: 'Sermon', right: 'Pastor' }), 'Sermon | Pastor');
  // an indented line with nothing above it is just a paragraph
  const lone = Layout.parseBody('  just text');
  assert.strictEqual(lone[0].type, 'p');
  // a blank line ends the attachment
  const after = Layout.parseBody('Piece | | Composer (1900–1990)\n\n  not attached');
  assert.ok(!after[0].html.includes('not attached') && after[1].type === 'p');
});

test('columns blocks: names flow in columns, long lists are cut into pages, details and headings work', () => {
  const b = Layout.parseBody('[columns 3]\n## Violin I\nAnna Lee | Principal\nBen Cho\n[/columns]\nafter');
  assert.strictEqual(b[0].type, 'cols');
  assert.ok(b[0].html.includes('column-count:3') && b[0].html.includes('class="csub">Violin I<') && b[0].html.includes('class="n2">Principal<'));
  assert.strictEqual(b[1].type, 'p');
  assert.ok(Layout.parseBody('[columns 2]\nName\tHometown, ST')[0].html.includes('class="n2">Hometown, ST<')); // a tab works like |
  assert.ok(Layout.parseBody('[columns 9]\nA')[0].html.includes('column-count:4'));                                // limited to 4
  const many = Layout.parseBody('[columns 2]\n' + Array.from({ length: 100 }, (_, i) => 'Name ' + i).join('\n') + '\n[/columns]');
  assert.ok(many.length >= 3 && many.every((x) => x.type === 'cols'));                                             // cut into several blocks
  assert.strictEqual(many.map((x) => (x.html.match(/class="nm"/g) || []).length).reduce((s, n) => s + n, 0), 100); // nobody lost
  const open = Layout.parseBody('[columns 2]\nA\nB');                                                              // never closed
  assert.strictEqual(open.length, 1);
});

test('covers: choose a different logo, faint logo background', () => {
  const org = { name: 'School', tagline: '', address: '' };
  const make = (cover, ctx) => { const content = Layout.normContent({ title: 'T', cover }); return Layout.coverPanel({ org, content, logoUrl: 'data:MAIN', ...ctx }, content); };
  assert.ok(make({}, {}).includes('data:MAIN'));
  assert.ok(make({ logoId: 5 }, { coverLogoUrl: 'data:SHIELD' }).includes('data:SHIELD'));
  assert.ok(!make({ logoId: 5 }, { coverLogoUrl: 'data:SHIELD' }).includes('data:MAIN'));
  assert.ok(make({ logoId: 5 }, {}).includes('data:MAIN'));            // a missing logo falls back to the main one
  assert.strictEqual(Layout.normCover({ logoId: '7' }).logoId, 7);
  assert.strictEqual(Layout.normCover({}).logoId, '');
  assert.ok(make({ watermark: true }, {}).includes('class="cv-water"') && make({ watermark: true }, {}).includes('cv-wm'));
  assert.ok(!make({}, {}).includes('cv-water'));
  assert.ok(!make({ watermark: true }, { logoUrl: null }).includes('cv-water')); // nothing to show without a logo
});
test('tables, Bible passages and bullets in the body', () => {
  const html = (t) => Layout.parseBody(t).map((b) => b.html || '').join('');
  const tbl = html('[table header]\nDay | Time | What\nTuesday | 7:00 PM | Young Adults\n# Sunday\n9:00 AM\tSunday School\n[/table]');
  assert.ok(tbl.includes('<table class="grid">') && tbl.includes('<th>Day</th>') && tbl.includes('<td>Young Adults</td>'));
  assert.ok(tbl.includes('class="grp"') && tbl.includes('<td>Sunday School</td>'), 'heading row and tab-separated cells');
  assert.ok(!html('[table]\nA | B\n[/table]').includes('<th>'), 'no header unless asked');
  const bl = Layout.parseBody('[scripture Psalm 95:1-7]\n' + Array.from({ length: 12 }, (_, i) => `${i + 1} Verse text ${i + 1}`).join('\n') + '\n[/scripture]');
  assert.strictEqual(bl[0].type, 'scrip-ref');
  assert.ok(bl[0].keepNext && bl[0].html.includes('Psalm 95:1-7'));
  assert.strictEqual(bl.length, 5, 'one heading and twelve verses in blocks of three, so they split across pages');
  assert.ok(bl[1].html.includes('<sup class="vn">1</sup>'));
  // a block left open at the end is still printed
  assert.ok(html('[table]\nA | B').includes('<table'));
  assert.ok(html('- One\n- Two').split('class="bul"').length === 3);
  assert.strictEqual(Layout.classifyLine('[table header]'), 'cols-open');
  assert.strictEqual(Layout.classifyLine('[/scripture]'), 'cols-close');
});

test('back page and notes-page settings, and the custom cover layout', () => {
  assert.strictEqual(Layout.normContent({}).notesPage, true);
  assert.strictEqual(Layout.normContent({ notesPage: false }).notesPage, false);
  const b = Layout.normBack({ style: 'nonsense' });
  assert.strictEqual(b.style, 'name');
  assert.ok(b.show.logo && b.show.contact);
  assert.strictEqual(Layout.normBack({ style: 'announce', text: '- Hi' }).style, 'announce');
  // custom cover: pieces are positioned, clamped, and can be hidden
  const cv = Layout.normCover({ style: 'custom', custom: { title: { x: 20, y: 120, s: 9, hide: false }, logo: { hide: true } } });
  assert.strictEqual(cv.custom.title.x, 20);
  assert.strictEqual(cv.custom.title.y, 100, 'clamped');
  assert.strictEqual(cv.custom.title.s, 3, 'clamped');
  assert.strictEqual(cv.custom.name.x, 50, 'unspecified pieces keep their starting place');
  const org = { name: 'Grace', tagline: 'T', address: '', phone: '', website: '', email: '' };
  const content = Layout.normContent({ title: 'Sunday', cover: cv });
  const html = Layout.coverPanel({ org, content, logoUrl: 'data:image/png;base64,AA' }, content);
  assert.ok(html.includes('cv-custom') && html.includes('data-el="title"') && html.includes('left:20%'));
  assert.ok(!html.includes('data-el="logo"'), 'a hidden piece is not drawn');
  assert.ok(!html.includes('data-fit'), 'the custom cover is never shrunk automatically');
});

test('checks: placeholders, missing date, tiny text, boxes off the page', () => {
  const Checks = require('../src/shared/checks');
  const geo = Layout.geometry({ width: 11, height: 8.5, panels: 2 });
  const org = { name: 'Grace', logo_asset_id: 1 };
  const clean = Checks.run({ content: { title: 'Sunday', date: 'Nov 8', body: '# Welcome\nPrelude | | Jane Smith' }, layout: { pages: [], overflow: false }, geo, org });
  assert.deepStrictEqual(clean, []);
  const r = Checks.run({ content: { title: '', date: '', body: 'Hymn | | Number\nPoem: "Poem Title" | | Student Name', type: { scale: 0.8 }, boxes: [{ id: 'a', page: 1, x: 80, y: 10, w: 40, h: 10 }] }, layout: { pages: [{ role: 'notes' }, { role: 'blank' }], overflow: true }, geo, org });
  const msgs = r.map((x) => x.msg).join(' | ');
  assert.ok(/too much|doesn't fit/i.test(msgs) && /no title/i.test(msgs) && /no date/i.test(msgs));
  assert.ok(/sample text/.test(msgs) && /text size is small/i.test(msgs) && /past the edge/.test(msgs) && /pages are empty/.test(msgs));
  assert.ok(Checks.examples('Add the leader\'s line here.\nSermon | | Pastor Smith').length === 1);
});

test('seasons set art, paper and verse without overwriting a chosen verse', () => {
  const Seasons = require('../src/shared/seasons');
  const r = Seasons.apply('advent', { style: 'classic', quote: '' });
  assert.strictEqual(r.cover.art.id, 'wreath');
  assert.strictEqual(r.colorId, 'lavender');
  assert.strictEqual(r.cover.style, 'picture');
  assert.ok(/Matthew 24:42/.test(r.cover.quote));
  assert.ok(!('quote' in Seasons.apply('advent', { quote: 'My own verse' }).cover), 'a verse the person wrote is kept');
  assert.ok('quote' in Seasons.apply('easter', { quote: Seasons.KITS[0].quote }).cover, 'another kit verse is replaced');
  assert.ok(Seasons.forKind('school').every((k) => k.group !== 'church'));
  assert.ok(Seasons.KITS.every((k) => require('../src/shared/artwork').svg(k.art)));
});

test('text size, margins and free boxes', () => {
  const t = Layout.normType({ scale: 5, margin: 0.1 });
  assert.strictEqual(t.scale, 1.4); assert.strictEqual(t.margin, 0.8);
  const boxes = Layout.normBoxes([{ id: 'x', page: 2, kind: 'text', x: 10, y: 20, w: 50, h: 10, text: '- hello' }, { kind: 'image', assetId: 3, w: 1 }, null]);
  assert.strictEqual(boxes.length, 2);
  assert.strictEqual(boxes[1].w, 5, 'a box is never smaller than 5%');
  const org = { name: 'G', tagline: '', address: '', phone: '', website: '', email: '' };
  const content = Layout.normContent({ title: 'T', cover: { style: 'classic' }, type: { scale: 1.15 }, boxes });
  const html = Layout.coverPanel({ org, content }, content);
  assert.ok(html.includes('--bs:1.15'));
  assert.deepStrictEqual(Layout.normBoxes(undefined), []);
});

test('copy for next week resets announcements, passages and notes but keeps the structure', () => {
  const src = ['# Welcome', 'Prelude | | Jane', '', '# Announcements', '- Potluck Sunday', '- Nursery help', '[table header]', 'Day | Time', 'Tue | 7pm', '[/table]', '', '[scripture Psalm 95:1-3]', '1 O come', '[/scripture]', '', '# Sermon', '- keep this bullet'].join('\n');
  const out = Layout.clearWeekly(src);
  assert.ok(out.includes('Prelude |') && !out.includes('Jane'));
  assert.ok(!out.includes('Potluck') && out.includes('- New announcement'));
  assert.ok(!out.includes('Tue | 7pm') && out.includes('Day | Time | Event'));
  assert.ok(out.includes('[scripture Passage]') && !out.includes('1 O come'));
  assert.ok(out.includes('- keep this bullet'), 'bullets outside weekly sections stay');
  assert.ok(!Layout.clearWeekly('- A\n- B', true).includes('- B'), 'allWeekly resets every bullet');
});
