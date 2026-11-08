'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Wizard = require('../src/shared/wizard');
const Layout = require('../src/shared/layout');
const Sheet = require('../src/shared/sheet');
const { BUILTIN_TEXTS } = require('../src/shared/texts');
const { SERVICE_TYPES } = require('../src/shared/presets');

const texts = Object.fromEntries(BUILTIN_TEXTS.map((t) => [t.id, t]));
const headings = (b) => b.split('\n').filter((l) => l.startsWith('# ')).map((l) => l.slice(2));
const htmlOf = (body) => Layout.parseBody(body).map((b) => (b.pageBreak ? '<<break>>' : b.html));

test('every type builds with defaults and parses into a non-empty bulletin', () => {
  for (const t of Wizard.TYPES) {
    const r = Wizard.build(t.id, {}, texts);
    assert.ok(r.name && r.title !== undefined && r.body.trim(), t.id);
    assert.ok(Layout.parseBody(r.body).length > 0, t.id);
    assert.ok(['service', 'concert'].includes(r.sheetMode), t.id);
    assert.deepStrictEqual(headings(r.body), r.outline.filter((h) => r.body.includes('# ' + h)), t.id);
  }
});

test('every tradition x service x option combination builds without errors', () => {
  const allOn = (q) => (q.kind === 'multi' ? q.options.map((o) => o.id) : undefined);
  for (const tr of Wizard.TRADITIONS) {
    for (const svc of ['morning', 'communion', 'evening', 'midweek', 'special']) {
      for (const mode of ['all', 'none']) {
        const a = { tradition: tr.id, service: svc };
        for (const q of Wizard.QUESTIONS.church) if (q.kind === 'multi') a[q.id] = mode === 'all' ? allOn(q) : [];
        const r = Wizard.build('church', a, texts);
        assert.ok(r.body.length > 0 && headings(r.body).length > 0, `${tr.id}/${svc}/${mode}`);
        assert.ok(Layout.parseBody(r.body).length > 0);
      }
    }
  }
});

test('the music and speaking choices add or remove lines', () => {
  const none = (a) => Wizard.build('church', { tradition: 'presbyterian', music: [], speaking: [], extras: [], ...a }, texts).body;
  assert.ok(!none({}).includes('Opening Hymn'));
  assert.ok(!none({}).includes('Sermon'));
  assert.ok(none({ music: ['hymn'] }).includes('Opening Hymn'));
  assert.ok(none({ speaking: ['sermon'] }).includes('Sermon'));
  assert.ok(none({ music: ['organ'] }).includes('Prelude'));
  assert.ok(!none({ music: ['choir'] }).includes('Prelude'));
  assert.ok(none({ speaking: ['responsive', 'sermon'] }).includes('People: Add'));
  const kids = none({ speaking: ['children', 'sermon'] });
  assert.ok(kids.indexOf("Children's Message") < kids.indexOf('Sermon'));
});

test('communion adds the Lord\'s Supper; liturgical traditions include it on Sunday morning', () => {
  const pres = (svc) => Wizard.build('church', { tradition: 'presbyterian', service: svc }, texts).body;
  assert.ok(pres('communion').includes('The Lord Communes with Us at His Table'));
  assert.ok(!pres('morning').includes('The Lord Communes with Us at His Table'));
  const ang = (svc) => Wizard.build('church', { tradition: 'anglican', service: svc }, texts).body;
  assert.ok(ang('morning').includes('# The Holy Communion'));
  assert.ok(!ang('evening').includes('# The Holy Communion'));
  assert.ok(Wizard.build('church', { tradition: 'lutheran-lcms', service: 'morning' }, texts).body.includes('The Service of the Sacrament'));
  assert.ok(Wizard.build('church', { tradition: 'lutheran-elca', service: 'morning' }, texts).body.includes('# Meal'));
  assert.ok(!Wizard.build('church', { tradition: 'lutheran-elca', service: 'evening' }, texts).body.includes('# Meal'));
});

test('printing the text of creeds and prayers adds the library wording, and can be turned off', () => {
  const on = Wizard.build('church', { tradition: 'presbyterian', extras: ['printText'], speaking: ['creed'] }, texts).body;
  assert.ok(on.includes('I believe in God the Father Almighty'));
  assert.ok(!on.includes("## The Apostles' Creed")); // the library's own heading is dropped, the line above names it
  const off = Wizard.build('church', { tradition: 'presbyterian', extras: [], speaking: ['creed'] }, texts).body;
  assert.ok(!off.includes('I believe in God the Father Almighty'));
  assert.ok(off.includes("Apostles' Creed |"));
  const ang = Wizard.build('church', { tradition: 'anglican', extras: ['printText'], speaking: ['creed'] }, texts).body;
  assert.ok(ang.includes('very God of very God'));       // the Nicene Creed
});

test('titles follow the tradition and service', () => {
  const t = (a) => Wizard.build('church', a, texts);
  assert.strictEqual(t({ tradition: 'anglican' }).title, 'Holy Eucharist');
  assert.strictEqual(t({ tradition: 'lutheran-lcms' }).title, 'The Divine Service');
  assert.strictEqual(t({ tradition: 'lutheran-elca' }).title, 'Holy Communion');
  assert.strictEqual(t({ service: 'midweek' }).title, 'Midweek Service');
  assert.strictEqual(t({ service: 'communion' }).title, 'Communion Sunday');
});

test('funeral and wedding options include or drop their sections', () => {
  const f = (inc) => Wizard.build('funeral', { includes: inc }, texts).body;
  assert.ok(f(['obituary', 'eulogy']).includes('Obituary'));
  assert.ok(!f(['eulogy']).includes('Obituary'));
  assert.ok(f(['pallbearers']).includes('Pallbearers'));
  assert.ok(!f([]).includes('Pallbearers'));
  assert.strictEqual(Wizard.build('funeral', { tradition: 'anglican' }, texts).title, 'The Burial of the Dead');
  const w = (inc) => Wizard.build('wedding', { includes: inc }, texts).body;
  assert.ok(w(['unity']).includes('Unity Candle'));
  assert.ok(!w([]).includes('Unity Candle'));
  assert.ok(w(['party']).includes('The Wedding Party'));
  assert.ok(!w([]).includes('The Wedding Party'));
});

test('school programs: concert groups, kinds, extras and sheet mode', () => {
  const c = Wizard.build('school', { kind: 'concert', groups: ['band', 'choir', 'jazz'], extras: ['roster', 'sponsors', 'upcoming'] });
  assert.deepStrictEqual(headings(c.body).slice(0, 4), ['Welcome', 'Concert Band', 'Choir', 'Jazz Band']);
  assert.ok(c.body.includes('# Personnel') && c.body.includes('# Our Sponsors') && c.body.includes('# Upcoming Events'));
  assert.strictEqual(c.sheetMode, 'concert');
  assert.ok(c.body.includes('Composer Name (1732–1809)'));
  assert.strictEqual(Wizard.build('school', { kind: 'recital' }).sheetMode, 'concert');
  assert.strictEqual(Wizard.build('school', { kind: 'graduation' }).title, 'Commencement');
  assert.ok(Wizard.build('school', { kind: 'play' }).body.includes('# Cast'));
  assert.ok(Wizard.build('school', { kind: 'awards' }).body.includes('Award Winners'));
  assert.ok(Wizard.build('school', { kind: 'concert', groups: ['orchestra'], speaking: [] }).body.includes('# Orchestra'));
});

test('questions: defaults are valid option ids, and showIf works', () => {
  for (const [type, qs] of Object.entries(Wizard.QUESTIONS)) {
    const d = Wizard.defaults(type);
    for (const q of qs) {
      const ids = q.options.map((o) => o.id);
      if (q.kind === 'single') assert.ok(ids.includes(d[q.id]), `${type}.${q.id}`);
      else d[q.id].forEach((x) => assert.ok(ids.includes(x), `${type}.${q.id}.${x}`));
    }
  }
  const groupsQ = Wizard.QUESTIONS.school.find((q) => q.id === 'groups');
  assert.ok(groupsQ.showIf({ kind: 'concert' }));
  assert.ok(!groupsQ.showIf({ kind: 'play' }));
});

test('built bulletins survive the fill-in sheet round trip unchanged', () => {
  for (const t of Wizard.TYPES) {
    const body = Wizard.build(t.id, {}, texts).body;
    assert.deepStrictEqual(htmlOf(Sheet.buildBody(Sheet.parseRows(body))), htmlOf(body), t.id);
  }
});

test('starter templates all have a category, description, and parse', () => {
  for (const s of SERVICE_TYPES) {
    assert.ok(['church', 'school', 'both'].includes(s.category), s.id);
    assert.ok(s.desc && s.label && s.name && s.title !== undefined, s.id);
    assert.ok(Layout.parseBody(s.body).length > 0, s.id);
  }
  assert.ok(SERVICE_TYPES.filter((s) => s.category === 'church').length >= 5);
  assert.ok(SERVICE_TYPES.filter((s) => s.category === 'school').length >= 4);
});

test('hymn placeholders use each tradition\'s hymnal, and a standing note is added when needed', () => {
  const body = (tradition) => Wizard.build('church', { tradition, music: ['hymn'], speaking: [], extras: [] }, texts).body;
  assert.ok(body('lutheran-elca').includes('| | ELW #'));
  assert.ok(body('lutheran-lcms').includes('| | LSB #'));
  assert.ok(body('methodist').includes('| | UMH #'));
  assert.ok(body('presbyterian').includes('| | Hymn #'));
  assert.ok(body('lutheran-lcms').startsWith('> ▲ Please stand if you are able.'));
  // a program with no standing marks gets no note
  assert.ok(!Wizard.build('school', { kind: 'concert' }).body.includes('Please stand'));
});

test('Lutheran and Methodist orders match the examples', () => {
  const all = { music: ['hymn', 'choir', 'organ'], speaking: ['sermon', 'readings', 'creed', 'prayers', 'announce'], extras: [] };
  const h = (tradition, service) => headings(Wizard.build('church', { ...all, tradition, service: service || 'morning' }, texts).body);
  assert.deepStrictEqual(h('lutheran-elca'), ['Gathering', 'Word', 'Meal', 'Sending']);
  assert.deepStrictEqual(h('lutheran-lcms'), ['The Entrance', 'The Service of the Word', 'The Service of the Sacrament', 'The Sending']);
  assert.deepStrictEqual(h('methodist'), ['Gathering', 'Proclamation and Response', 'Offering and Sending Forth']);
  assert.deepStrictEqual(h('methodist', 'communion'), ['Gathering', 'Proclamation and Response', 'Thanksgiving and Communion', 'Offering and Sending Forth']);
  const lcms = Wizard.build('church', { ...all, tradition: 'lutheran-lcms' }, texts).body;
  assert.ok(lcms.includes('Hymn of the Day') && lcms.includes('Distribution Hymns') && lcms.includes('Salutation and Collect of the Day'));
  const meth = Wizard.build('church', { ...all, tradition: 'methodist' }, texts).body;
  assert.ok(meth.includes('Hymn of Preparation') && meth.includes('Prayer of Dedication') && meth.includes('Passing of the Peace'));
});