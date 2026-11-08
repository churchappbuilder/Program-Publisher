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
