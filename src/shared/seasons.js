'use strict';

// Season and occasion kits: one choice sets a matching picture, paper color and verse for the cover.
// Everything a kit sets can still be changed afterwards. Verses are King James Version (public domain).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Seasons = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const KITS = [
    { id: 'advent', label: 'Advent', group: 'church', art: 'wreath', paper: 'lavender', quote: 'Watch therefore: for ye know not what hour your Lord doth come.\nMatthew 24:42' },
    { id: 'christmas', label: 'Christmas', group: 'church', art: 'star', paper: 'cream', quote: 'For unto us a child is born, unto us a son is given.\nIsaiah 9:6' },
    { id: 'epiphany', label: 'Epiphany', group: 'church', art: 'star', paper: 'ivory', quote: 'Arise, shine; for thy light is come.\nIsaiah 60:1' },
    { id: 'lent', label: 'Lent', group: 'church', art: 'cross', paper: 'gray', quote: 'Create in me a clean heart, O God; and renew a right spirit within me.\nPsalm 51:10' },
    { id: 'easter', label: 'Easter', group: 'church', art: 'flower', paper: 'ivory', quote: 'He is not here: for he is risen, as he said.\nMatthew 28:6' },
    { id: 'pentecost', label: 'Pentecost', group: 'church', art: 'flame', paper: 'pink', quote: 'And they were all filled with the Holy Ghost.\nActs 2:4' },
    { id: 'reformation', label: 'Reformation Sunday', group: 'church', art: 'book', paper: 'ivory', quote: 'The just shall live by faith.\nRomans 1:17' },
    { id: 'thanksgiving', label: 'Thanksgiving', group: 'both', art: 'wheat', paper: 'buff', quote: 'O give thanks unto the LORD; for he is good.\nPsalm 107:1' },
    { id: 'ordinary', label: 'Ordinary time', group: 'church', art: 'cross', paper: 'white', quote: '' },
    { id: 'fall', label: 'Fall', group: 'school', art: 'leaves', paper: 'buff', quote: '' },
    { id: 'spring', label: 'Spring', group: 'school', art: 'flower', paper: 'ivory', quote: '' },
    { id: 'concert', label: 'Music and concerts', group: 'school', art: 'notes', paper: 'white', quote: '' },
    { id: 'graduation', label: 'Graduation', group: 'school', art: 'cap', paper: 'ivory', quote: '' }
  ];

  function forKind(kind) {
    return KITS.filter((k) => k.group === 'both' || (kind === 'school' ? k.group === 'school' : k.group === 'church'));
  }

  // What choosing a kit changes. The verse is only filled in when the cover has none (or still has another kit's verse).
  function apply(kit, cover) {
    const k = typeof kit === 'string' ? KITS.find((x) => x.id === kit) : kit;
    if (!k) return null;
    const cv = cover || {};
    const otherKitVerse = KITS.some((x) => x.quote && x.quote === cv.quote);
    const picture = ['classic', 'headerfooter', 'traditional'].includes(cv.style || 'classic');
    return {
      cover: {
        art: { kind: 'builtin', id: k.art },
        ...(picture && (cv.style || 'classic') === 'classic' ? { style: 'picture' } : {}),
        ...(k.quote && (!cv.quote || otherKitVerse) ? { quote: k.quote } : {})
      },
      colorId: k.paper
    };
  }

  return { KITS, forKind, apply };
});
