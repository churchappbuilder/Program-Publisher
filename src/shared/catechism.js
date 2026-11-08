'use strict';

// Catechism texts (public domain) in src/data/catechisms/*.json, supplied by
// reformededucation.org. Each file is { questions: [{ n, question, answer, proofs: [{ref, text}] }] }.
// This module describes them and turns a range of questions into bulletin markup.

const CATECHISMS = [
  {
    id: 'wsc', file: 'wsc', name: 'Westminster Shorter Catechism', short: 'WSC', count: 107,
    source: 'First published 1648. Scripture proofs: King James Version. Text from reformededucation.org.',
    caution: ''
  },
  {
    id: 'wlc', file: 'wlc', name: 'Westminster Larger Catechism', short: 'WLC', count: 196,
    source: 'Scripture proofs: King James Version. Text from reformededucation.org.',
    caution: ''
  },
  {
    id: 'heidelberg', file: 'heidelberg', name: 'Heidelberg Catechism', short: 'HC', count: 129,
    source: 'First published 1563. English translation as published by apuritansmind.com; Scripture proofs: King James Version.',
    caution: "Not yet proofread against a printed edition, and a few questions (such as 12, 18, 27, 56 and 61) are worded differently from other editions. Compare with your church's own edition before printing, and save your church's wording in the Text library."
  },
  {
    id: 'baptist-catechism', file: 'baptist-catechism', name: 'Baptist Catechism (Keach\'s, 1693)', short: 'BC', count: 114,
    source: '1695 fifth edition text from baptistcatechism.org, spelling lightly modernized. Scripture proofs: King James Version.',
    caution: 'Not yet proofread against a scanned original. Compare with your church\'s own edition before printing.'
  }
];

// doc: parsed JSON file. from/to: question numbers (inclusive). opts.refs: add Scripture references.
function formatQA(doc, from, to, opts) {
  opts = opts || {};
  const qs = doc.questions || [];
  const max = qs.length;
  let a = Math.floor(Number(from));
  let b = to === undefined || to === null || to === '' ? a : Math.floor(Number(to));
  if (!Number.isFinite(a) || a < 1 || a > max) throw new Error(`Choose a question from 1 to ${max}.`);
  if (!Number.isFinite(b) || b < a) b = a;
  if (b > max) b = max;

  const out = [];
  for (const q of qs) {
    if (q.n < a || q.n > b) continue;
    const lines = [`**Q. ${q.n}.** ${q.question}`, `**A.** ${q.answer}`];
    if (opts.refs && q.proofs && q.proofs.length) {
      lines.push('*' + q.proofs.map((p) => p.ref).join('; ') + '*');
    }
    out.push(lines.join('\n'));
  }
  return out.join('\n\n');
}

module.exports = { CATECHISMS, formatQA };
