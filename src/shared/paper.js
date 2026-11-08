'use strict';

// All sizes are in inches. width/height describe the FLAT sheet as it goes
// through the printer (landscape for folded formats).
// panels = how many equal page-panels the sheet is folded into (per side).
const FORMATS = [
  { id: 'half-letter', name: 'Half sheet (5.5 × 8.5)', width: 5.5, height: 8.5, panels: 1, note: 'Single flat card, one panel per side.' },
  { id: 'letter', name: 'Letter (8.5 × 11)', width: 8.5, height: 11, panels: 1, note: 'Standard US letter, flat.' },
  { id: 'legal', name: 'Legal (8.5 × 14)', width: 8.5, height: 14, panels: 1, note: 'Legal, flat.' },
  { id: 'tabloid', name: 'Tabloid (11 × 17)', width: 11, height: 17, panels: 1, note: 'Ledger/tabloid, flat.' },
  { id: 'insert-7x8', name: 'Insert 7 × 8.5 (matches a legal bi-fold page)', width: 7, height: 8.5, panels: 1, note: 'Loose insert sized to a legal bi-fold page.' },
  { id: 'insert-panel', name: 'Insert 3.67 × 8.5 (matches a tri-fold panel)', width: 11 / 3, height: 8.5, panels: 1, note: 'Loose insert sized to one tri-fold panel.' },
  { id: 'a4', name: 'A4 (210 × 297 mm)', width: 8.27, height: 11.69, panels: 1, note: 'International standard.' },
  { id: 'a5', name: 'A5 (148 × 210 mm)', width: 5.83, height: 8.27, panels: 1, note: 'Half of A4.' },
  { id: 'letter-bifold', name: 'Letter bi-fold booklet (folds to 5.5 × 8.5)', width: 11, height: 8.5, panels: 2, note: 'Letter sheets folded in half. Grows in steps of 4 pages (4, 8, 12 …), stapled in the middle.' },
  { id: 'legal-bifold', name: 'Legal bi-fold booklet (folds to 7 × 8.5)', width: 14, height: 8.5, panels: 2, note: 'Legal sheets folded in half; 4 pages, or more nested sheets.' },
  { id: 'tabloid-bifold', name: 'Tabloid bi-fold booklet (folds to 8.5 × 11)', width: 17, height: 11, panels: 2, note: 'Tabloid sheet folded in half; 4 pages, or more nested sheets.' },
  { id: 'a4-bifold', name: 'A4 bi-fold booklet (folds to A5)', width: 11.69, height: 8.27, panels: 2, note: 'A4 sheet folded in half.' },
  { id: 'a3-bifold', name: 'A3 bi-fold booklet (folds to A4)', width: 16.54, height: 11.69, panels: 2, note: 'A3 sheet folded in half.' },
  { id: 'letter-trifold', name: 'Letter tri-fold (folds to 3.67 × 8.5)', width: 11, height: 8.5, panels: 3, note: 'Letter sheet in thirds; 6 panels.' },
  { id: 'legal-trifold', name: 'Legal tri-fold (folds to 4.67 × 8.5)', width: 14, height: 8.5, panels: 3, note: 'Legal sheet in thirds; 6 panels.' }
];

// Weights: US name, metric gsm, and a rough thickness used for preview shadow.
const WEIGHTS = [
  { id: '20bond', name: '20 lb bond (75 gsm) – copy paper', gsm: 75, thickness: 1 },
  { id: '24bond', name: '24 lb bond (90 gsm) – bright/premium', gsm: 90, thickness: 1.2 },
  { id: '65cover', name: '65 lb cover (176 gsm) – light cardstock', gsm: 176, thickness: 2.2 },
  { id: '80cover', name: '80 lb cover (216 gsm) – cardstock', gsm: 216, thickness: 2.8 },
  { id: '110index', name: '110 lb index (199 gsm) – stiff card', gsm: 199, thickness: 2.5 }
];

const COLORS = [
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'bright-white', name: 'Bright white', hex: '#fbfdff' },
  { id: 'ivory', name: 'Ivory', hex: '#fbf6e4' },
  { id: 'cream', name: 'Cream', hex: '#f6ecd0' },
  { id: 'buff', name: 'Buff', hex: '#ecd9b0' },
  { id: 'gray', name: 'Light gray', hex: '#e4e4e6' },
  { id: 'blue', name: 'Pastel blue', hex: '#cfe2f5' },
  { id: 'green', name: 'Pastel green', hex: '#d3ecd3' },
  { id: 'yellow', name: 'Canary yellow', hex: '#fbf1a8' },
  { id: 'pink', name: 'Pastel pink', hex: '#f6d3de' },
  { id: 'lavender', name: 'Lavender', hex: '#e0d6f0' }
];

module.exports = { FORMATS, WEIGHTS, COLORS };
