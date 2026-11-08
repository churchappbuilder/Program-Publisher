'use strict';

// Simple built-in artwork for covers (seasonal and general). Original single-color vector
// drawings that take on the organization's accent color. Each is drawn on a 100 x 100 grid.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Artwork = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const ART = [
    { id: 'cross', name: 'Cross', group: 'Church',
      body: '<path d="M42 6h16v30h30v16H58v42H42V52H12V36h30z"/>' },
    { id: 'chalice', name: 'Communion cup', group: 'Church',
      body: '<path d="M22 10H78C78 36 68 50 54 54V76H72V90H28V76H46V54C32 50 22 36 22 10Z"/>' },
    { id: 'flame', name: 'Flame (Pentecost)', group: 'Seasons',
      body: '<path d="M50 4C54 22 78 34 76 60C75 78 64 94 50 96C36 94 25 78 24 60C23 44 34 38 38 22C42 28 46 18 50 4Z"/>' +
        '<path d="M50 40C54 52 64 58 63 72C62 82 56 90 50 90C44 90 38 82 37 72C36 62 46 54 50 40Z" fill="#fff" opacity=".4"/>' },
    { id: 'star', name: 'Star (Christmas, Epiphany)', group: 'Seasons',
      body: '<path d="M50 2L58 42L98 50L58 58L50 98L42 58L2 50L42 42Z"/>' },
    { id: 'wreath', name: 'Advent wreath', group: 'Seasons',
      body: '<circle cx="50" cy="68" r="24" fill="none" stroke="currentColor" stroke-width="9"/>' +
        '<rect x="26.5" y="38" width="7" height="22" rx="1"/><rect x="39.5" y="30" width="7" height="22" rx="1"/>' +
        '<rect x="53.5" y="30" width="7" height="22" rx="1"/><rect x="66.5" y="38" width="7" height="22" rx="1"/>' +
        '<ellipse cx="30" cy="31" rx="3.4" ry="5.5"/><ellipse cx="43" cy="23" rx="3.4" ry="5.5"/>' +
        '<ellipse cx="57" cy="23" rx="3.4" ry="5.5"/><ellipse cx="70" cy="31" rx="3.4" ry="5.5"/>' },
    { id: 'flower', name: 'Spring flower (Easter)', group: 'Seasons',
      body: '<g transform="translate(50 50)">' +
        [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-23" rx="12.5" ry="21" transform="rotate(${a})"/>`).join('') +
        '<circle r="9" fill="#fff" opacity=".55"/></g>' },
    { id: 'leaves', name: 'Autumn leaves', group: 'Seasons',
      body: [-38, 0, 38].map((a) => `<g transform="translate(50 94) rotate(${a})"><path d="M0 0C-15 -17 -15 -42 0 -62C15 -42 15 -17 0 0Z"/>` +
        '<path d="M0 -4V-54" stroke="#fff" stroke-width="1.6" opacity=".5" fill="none"/></g>').join('') },
    { id: 'wheat', name: 'Wheat (harvest)', group: 'Seasons',
      body: '<path d="M50 96V26" stroke="currentColor" stroke-width="4" fill="none"/>' +
        [62, 46, 30].map((y) => `<ellipse cx="39" cy="${y}" rx="5" ry="11" transform="rotate(-28 39 ${y})"/><ellipse cx="61" cy="${y}" rx="5" ry="11" transform="rotate(28 61 ${y})"/>`).join('') +
        '<ellipse cx="50" cy="14" rx="5" ry="11"/>' },
    { id: 'book', name: 'Open Bible', group: 'Church',
      body: '<path d="M6 22C24 16 40 18 50 26C60 18 76 16 94 22V80C76 74 60 76 50 84C40 76 24 74 6 80Z"/>' +
        '<path d="M50 26V84" stroke="#fff" stroke-width="2" opacity=".6" fill="none"/>' },
    { id: 'fish', name: 'Fish', group: 'Church',
      body: '<path d="M8 50C26 22 58 22 76 50C58 78 26 78 8 50Z"/><path d="M72 50L94 30V70Z"/><circle cx="28" cy="46" r="4" fill="#fff"/>' },
    { id: 'notes', name: 'Music notes', group: 'School and music',
      body: '<ellipse cx="30" cy="76" rx="13" ry="9" transform="rotate(-20 30 76)"/><ellipse cx="72" cy="68" rx="13" ry="9" transform="rotate(-20 72 68)"/>' +
        '<rect x="39" y="22" width="5" height="54"/><rect x="81" y="14" width="5" height="54"/><path d="M39 22L86 12V28L39 38Z"/>' },
    { id: 'cap', name: 'Graduation cap', group: 'School and music',
      body: '<path d="M50 20L96 40L50 60L4 40Z"/><path d="M24 52V68C24 80 76 80 76 68V52L50 63Z"/>' +
        '<path d="M90 43V68" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="90" cy="72" r="4"/>' }
  ];

  const byId = Object.fromEntries(ART.map((a) => [a.id, a]));

  // The artwork as an <svg> that takes the color of whatever surrounds it.
  function svg(id) {
    const a = byId[id];
    return a ? `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true">${a.body}</svg>` : '';
  }

  // Suggested art for each kind of program, used when a picture layout needs something.
  const DEFAULT_FOR = {
    church: 'cross', funeral: 'flower', wedding: 'flower', other: 'star',
    concert: 'notes', recital: 'notes', graduation: 'cap', play: 'star', awards: 'star', school: 'notes'
  };

  return { ART, svg, DEFAULT_FOR };
});
