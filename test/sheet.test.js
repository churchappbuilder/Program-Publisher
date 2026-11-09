'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Layout = require('../src/shared/layout');
const Sheet = require('../src/shared/sheet');
const { SERVICE_TYPES } = require('../src/shared/presets');
const { BUILTIN_TEXTS } = require('../src/shared/texts');

const htmlOf = (body) => Layout.parseBody(body).map((b) => (b.pageBreak ? '<<break>>' : b.html));

const SAMPLE = `# The Gathering
> Please stand.
Leader: The Lord be with you.
People: And also with you.
All: Almighty God,
to you all hearts are open.

+ Opening Hymn | Holy, Holy, Holy | 77
Prelude |
Sermon | | Pastor Smith

## Announcements
- Potluck
[notes 4]
===
^ Centered line
Plain paragraph
with two lines`;

test('classifyLine agrees with parseBody for every kind of line', () => {
  const expected = {
    '# Heading': 'sec', '## Sub': 'sub', '> rubric': 'rubric', '[notes]': 'notes', '[notes 8]': 'notes',
    '^ centered': 'center', '- bullet': 'bullet', '===': 'break', 'Leader: hi': 'role', '+ People: hi': 'role',
    'A | B': 'item', '+ A | B | C': 'item', 'Prelude |': 'item', 'just text': 'text', '+ only text': 'text', '': 'blank'
  };
  const typeOf = { sec: 'sec', sub: 'sub', rubric: 'rubric', notes: 'notes', center: 'center', bullet: 'bullet', role: 'role', item: 'item', text: 'p' };
  for (const [line, kind] of Object.entries(expected)) {
    assert.strictEqual(Layout.classifyLine(line), kind, line);
    if (kind === 'blank') continue;
    const b = Layout.parseBody(line)[0];
    if (kind === 'break') assert.ok(b.pageBreak, line);
    else assert.strictEqual(b.type, typeOf[kind], line);
  }
});

test('item lines round-trip', () => {
  for (const line of ['+ Opening Hymn | Holy, Holy, Holy | 77', 'Prelude |', 'Sermon | Pastor Smith', 'Hymn | Name |']) {
    const it = Layout.parseItemLine(line);
    assert.ok(it, line);
    assert.strictEqual(Layout.formatItemLine(it), line.trimEnd(), line);
  }
  assert.deepStrictEqual({ ...Layout.parseItemLine('Sermon | | Pastor') }, { stand: false, label: 'Sermon', mid: '', right: 'Pastor', note: '' });
  assert.strictEqual(Layout.formatItemLine(Layout.parseItemLine('Sermon | | Pastor')), 'Sermon | Pastor'); // same printed result
  assert.strictEqual(Layout.parseItemLine('plain'), null);
});

test('sheet round trip leaves the printed result unchanged (sample, presets, built-in texts)', () => {
  const bodies = [SAMPLE, ...SERVICE_TYPES.map((s) => s.body), ...BUILTIN_TEXTS.map((t) => t.body)];
  for (const body of bodies) {
    const rebuilt = Sheet.buildBody(Sheet.parseRows(body));
    assert.deepStrictEqual(htmlOf(rebuilt), htmlOf(body), body.slice(0, 40));
  }
});

test('rows: headings, items and untouched text blocks', () => {
  const rows = Sheet.parseRows(SAMPLE);
  assert.deepStrictEqual(rows.map((r) => r.type), ['heading', 'other', 'item', 'item', 'item', 'heading', 'other']);
  assert.strictEqual(rows[2].stand, true);
  assert.strictEqual(rows[2].mid, 'Holy, Holy, Holy');
  assert.strictEqual(rows[4].right, 'Pastor Smith');
  assert.ok(rows[1].lines.join('\n').includes('to you all hearts are open.')); // prayer kept intact
});

test('editing a cell changes the body and nothing else', () => {
  const rows = Sheet.parseRows(SAMPLE);
  Sheet.setCell(rows[2], 2, '382', 'service');
  rows[2].stand = false;
  const body = Sheet.buildBody(rows);
  assert.ok(body.includes('Opening Hymn | Holy, Holy, Holy | 382'));
  assert.ok(!body.includes('+ Opening Hymn'));
  assert.ok(body.includes('to you all hearts are open.'));
  assert.ok(body.includes('Plain paragraph\nwith two lines'));
});

test('concert mode: composer and years combine and split', () => {
  assert.deepStrictEqual(Sheet.splitComposer('Franz Joseph Haydn (1732–1809)'), { composer: 'Franz Joseph Haydn', years: '1732–1809' });
  assert.deepStrictEqual(Sheet.splitComposer('Traditional Folk Song'), { composer: 'Traditional Folk Song', years: '' });
  assert.strictEqual(Sheet.joinComposer('Haydn', '1732–1809'), 'Haydn (1732–1809)');
  assert.strictEqual(Sheet.joinComposer('Haydn', ''), 'Haydn');
  assert.strictEqual(Sheet.joinComposer('', 'b. 1978'), '(b. 1978)');
  const row = { type: 'item', label: 'The Creation', mid: '', right: '' };
  Sheet.setCell(row, 2, 'Haydn', 'concert');
  Sheet.setCell(row, 3, '1732–1809', 'concert');
  assert.strictEqual(row.right, 'Haydn (1732–1809)');
  assert.deepStrictEqual(Sheet.cells(row, 'concert'), ['The Creation', '', 'Haydn', '1732–1809']);
  assert.strictEqual(Layout.formatItemLine(row), 'The Creation | Haydn (1732–1809)');
});

test('paste from Excel: rows and columns fill in, extra rows are added', () => {
  const rows = Sheet.parseRows('# Gathering\nOpening Hymn |\nCall to Worship |\n# Word\nScripture |');
  const pasted = Sheet.applyPaste(rows, 1, 1, 'Holy, Holy, Holy\t77\nPsalm 100\t\nMore\tx', 'service');
  assert.ok(pasted);
  const items = pasted.filter((r) => r.type === 'item');
  assert.strictEqual(items[0].mid, 'Holy, Holy, Holy'); assert.strictEqual(items[0].right, '77');
  assert.strictEqual(items[1].mid, 'Psalm 100');
  assert.strictEqual(items[2].mid, 'More');               // lands on the next item row (after the heading)
  assert.strictEqual(pasted.filter((r) => r.type === 'item').length, 3);
  const more = Sheet.applyPaste(rows, 1, 0, 'A\tB\tC\nD\tE\tF\nG\tH\tI\nJ\tK\tL', 'service');
  assert.strictEqual(more.filter((r) => r.type === 'item').length, 4); // one row was added
  assert.strictEqual(Sheet.applyPaste(rows, 1, 0, 'just one cell', 'service'), null);
  assert.strictEqual(rows[1].mid, '');                    // original untouched
});

test('copy as table gives tab-separated item rows', () => {
  const rows = Sheet.parseRows('# A\n+ Hymn | Name | 12\nPrelude |');
  assert.strictEqual(Sheet.toTable(rows, 'service'), 'Hymn\tName\t12\nPrelude\t\t');
});

test('sheet keeps indented lines, columns blocks and the title column', () => {
  const body = ['# Program', 'Overture | from *Carmen* | Georges Bizet (1838–1875)', '  I. Allegro', '  II. Andante', 'Invocation | | David Anderson | President',
    '', '# The Graduates', '[columns 2]', '## BA English', 'Jack Bovay | Peoria, IL', 'Anna Morken', '[/columns]', '', 'Thank you.'].join('\n');
  const rows = Sheet.parseRows(body);
  assert.deepStrictEqual(rows.map((r) => r.type), ['heading', 'item', 'item', 'heading', 'other', 'other']);
  assert.deepStrictEqual(rows[1].sub, ['I. Allegro', 'II. Andante']);       // movements stay with the piece
  assert.ok(rows[4].lines.join('\n').includes('## BA English'));            // the roster is one untouched block, not split into rows
  assert.strictEqual(rows[2].note, 'President');
  assert.deepStrictEqual(Sheet.cells(rows[2], 'program'), ['Invocation', '', 'David Anderson', 'President']);
  assert.strictEqual(Sheet.MODES.program.columns.length, 4);
  Sheet.setCell(rows[2], 3, 'Vice President', 'program');
  Sheet.setCell(rows[2], 2, 'Jane Doe', 'program');
  const out = Sheet.buildBody(rows);
  assert.ok(out.includes('Invocation | | Jane Doe | Vice President'));
  assert.ok(out.includes('  I. Allegro\n  II. Andante'));
  assert.ok(out.includes('[columns 2]\n## BA English'));
  // the printed result is unchanged by a trip through the sheet
  const htmlOf = (t) => Layout.parseBody(t).map((b) => (b.pageBreak ? '<<break>>' : b.html));
  assert.deepStrictEqual(htmlOf(Sheet.buildBody(Sheet.parseRows(body))), htmlOf(body));
});

test('every wizard result survives the sheet round trip, including rosters and candidate lists', () => {
  const Wizard = require('../src/shared/wizard');
  const htmlOf = (t) => Layout.parseBody(t).map((b) => (b.pageBreak ? '<<break>>' : b.html));
  const cases = [
    { kind: 'graduation', gradLevel: 'college', gradCeremony: ['presiding', 'processional', 'anthem', 'keynote', 'honors'], gradPrint: ['graduates', 'honorsKey', 'welcomeNote', 'notices', 'hymn', 'baccalaureate', 'faculty'] },
    { kind: 'recital', recitalExtras: ['guests', 'numerals', 'degree', 'studio', 'notes', 'etiquette', 'friends', 'roster'] },
    { kind: 'concert', groups: ['band', 'choir', 'orchestra', 'jazz'], extras: ['roster', 'notes', 'friends', 'etiquette', 'sponsors', 'upcoming'] }
  ];
  for (const c of cases) {
    const body = Wizard.build('school', c).body;
    assert.deepStrictEqual(htmlOf(Sheet.buildBody(Sheet.parseRows(body))), htmlOf(body), c.kind);
  }
});