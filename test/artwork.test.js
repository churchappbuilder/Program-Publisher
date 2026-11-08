'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Artwork = require('../src/shared/artwork');

test('built-in artwork: unique ids, valid svg, and defaults point at real art', () => {
  const ids = Artwork.ART.map((a) => a.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 10);
  for (const a of Artwork.ART) {
    assert.ok(a.name && a.group, a.id);
    const s = Artwork.svg(a.id);
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>') && s.includes('viewBox="0 0 100 100"'), a.id);
    assert.ok(!/<script|onload|onclick/i.test(s), a.id);
  }
  assert.strictEqual(Artwork.svg('nope'), '');
  for (const id of Object.values(Artwork.DEFAULT_FOR)) assert.ok(Artwork.svg(id), id);
});