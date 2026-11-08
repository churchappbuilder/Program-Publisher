'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Layout = require('../src/shared/layout');
const { FORMATS } = require('../src/shared/paper');

const fmt = (id) => FORMATS.find((f) => f.id === id);

test('every format in the catalog has a supported geometry', () => {
  for (const f of FORMATS) {
    const g = Layout.geometry(f);
    assert.ok(g.pages >= 1);
    assert.strictEqual(g.roles.length, g.pages);
    // every logical page appears exactly once across the sides
    const used = g.sides.flat().sort();
    assert.deepStrictEqual(used, [...Array(g.pages).keys()]);
  }
});

test('bi-fold imposition: outside = back|cover, inside = p2|p3', () => {
  const g = Layout.geometry(fmt('letter-bifold'));
  assert.strictEqual(g.pages, 4);
  assert.deepStrictEqual(g.sides, [[3, 0], [1, 2]]);
  assert.strictEqual(g.roles[3], 'back');
  assert.strictEqual(g.roles[0], 'cover');
  assert.strictEqual(g.pageW, 5.5);
  assert.strictEqual(g.pageH, 8.5);
});

test('tri-fold imposition: cover on outside right, flap outside left', () => {
  const g = Layout.geometry(fmt('letter-trifold'));
  assert.strictEqual(g.pages, 6);
  assert.deepStrictEqual(g.sides, [[4, 5, 0], [1, 2, 3]]);
  assert.ok(Math.abs(g.pageW - 11 / 3) < 1e-9);
});

test('flat formats are a single page', () => {
  const g = Layout.geometry(fmt('half-letter'));
  assert.strictEqual(g.pages, 1);
  assert.deepStrictEqual(g.sides, [[0]]);
});

test('rendered HTML escapes user text', () => {
  const g = Layout.geometry(fmt('letter-bifold'));
  const html = Layout.sideHtml(g, 0, {
    org: { name: '<b>Evil</b> & Co' },
    content: { title: '"Quoted"', items: ['<script>x</script>'] },
    logoUrl: null
  });
  assert.ok(!html.includes('<b>Evil'));
  assert.ok(html.includes('&lt;b&gt;Evil&lt;/b&gt; &amp; Co'));
  assert.ok(!html.includes('<script>'));
});
