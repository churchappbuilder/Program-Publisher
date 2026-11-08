'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { CATECHISMS, formatQA } = require('../src/shared/catechism');
const Layout = require('../src/shared/layout');

const load = (c) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'catechisms', c.file + '.json'), 'utf8'));

test('every catechism file loads, is numbered 1..n, and matches its stated count', () => {
  for (const c of CATECHISMS) {
    const d = load(c);
    assert.strictEqual(d.questions.length, c.count, c.id);
    d.questions.forEach((q, i) => {
      assert.strictEqual(q.n, i + 1, `${c.id} numbering at ${i + 1}`);
      assert.ok(q.question && q.question.trim(), `${c.id} Q${q.n} has a question`);
      assert.ok(q.answer && q.answer.trim(), `${c.id} Q${q.n} has an answer`);
    });
  }
});

test('Westminster Shorter Catechism Q1 reads correctly', () => {
  const wsc = load(CATECHISMS.find((c) => c.id === 'wsc'));
  const t = formatQA(wsc, 1, 1, { refs: false });
  assert.ok(t.includes('What is the chief end of man?'));
  assert.ok(t.includes("Man’s chief end is to glorify God, and to enjoy him for ever."));
});

test('formatQA: ranges, clamping, references, errors', () => {
  const wsc = load(CATECHISMS.find((c) => c.id === 'wsc'));
  assert.strictEqual(formatQA(wsc, 3, 5).split('\n\n').length, 3);
  assert.strictEqual(formatQA(wsc, 106, 500).split('\n\n').length, 2);       // clamped to the last question
  assert.strictEqual(formatQA(wsc, 7).split('\n\n').length, 1);              // no "to" = one question
  assert.ok(!formatQA(wsc, 1, 1, { refs: false }).includes('1 Cor. 10:31'));
  assert.ok(formatQA(wsc, 1, 1, { refs: true }).includes('1 Cor. 10:31'));
  assert.throws(() => formatQA(wsc, 0, 3));
  assert.throws(() => formatQA(wsc, 108, 109));
  assert.throws(() => formatQA(wsc, 'abc', 3));
});

test('formatted Q&A flows as one paragraph per question in a bulletin', () => {
  const wsc = load(CATECHISMS.find((c) => c.id === 'wsc'));
  const blocks = Layout.parseBody(formatQA(wsc, 1, 4, { refs: true }));
  assert.strictEqual(blocks.length, 4);
  assert.ok(blocks.every((b) => b.type === 'p'));
  assert.ok(blocks[0].html.includes('<strong>Q. 1.</strong>'));
  assert.ok(blocks[0].html.includes('<em>'));
});

test('catechisms that need checking say so', () => {
  assert.ok(CATECHISMS.find((c) => c.id === 'heidelberg').caution);
  assert.ok(CATECHISMS.find((c) => c.id === 'baptist-catechism').caution);
});
