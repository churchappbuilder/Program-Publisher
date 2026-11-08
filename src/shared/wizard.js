'use strict';

// "New program" wizard: the questions, and the code that turns the answers into a
// starting bulletin. Pure functions (no screen code) so they can be tested.
//
// The orders of worship below are starting points drawn from the common order of each
// tradition. They are meant to be edited, and a pastor or priest from the tradition should
// check them against their own book of worship.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Wizard = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TYPES = [
    { id: 'church', label: 'Church service', desc: 'Sunday worship, communion, midweek and special services' },
    { id: 'funeral', label: 'Funeral or memorial', desc: 'A service of remembrance, with committal' },
    { id: 'wedding', label: 'Wedding', desc: 'Ceremony with processional, vows and recessional' },
    { id: 'school', label: 'School program', desc: 'Concert, recital, graduation, play or awards night' },
    { id: 'other', label: 'Something else', desc: 'Start from a simple blank program' }
  ];

  const TRADITIONS = [
    { id: 'presbyterian', label: 'Presbyterian / Reformed' },
    { id: 'anglican', label: 'Anglican / Episcopal' },
    { id: 'lutheran-elca', label: 'Lutheran (ELCA)' },
    { id: 'lutheran-lcms', label: 'Lutheran (LCMS, Divine Service)' },
    { id: 'methodist', label: 'Methodist' },
    { id: 'contemporary', label: 'Contemporary (looser order)' },
    { id: 'simple', label: 'Simple order of worship' }
  ];

  const opt = (id, label, def) => ({ id, label, def: !!def });

  const QUESTIONS = {
    church: [
      { id: 'tradition', label: 'What style of worship?', kind: 'single', def: 'presbyterian',
        options: TRADITIONS.map((t) => opt(t.id, t.label)) },
      { id: 'service', label: 'Which service?', kind: 'single', def: 'morning',
        hint: 'Evening and midweek services use a shorter order.',
        options: [opt('morning', 'Sunday morning'), opt('communion', 'Communion Sunday'), opt('evening', 'Sunday evening'),
          opt('midweek', 'Midweek (such as Wednesday)'), opt('special', 'Special service (Christmas, Easter…)')] },
      { id: 'music', label: 'What music will there be?', kind: 'multi',
        options: [opt('hymn', 'Congregational hymns', true), opt('choir', 'Choir anthem or special music', true),
          opt('band', 'Praise band songs'), opt('organ', 'Organ or piano prelude and postlude', true), opt('psalm', 'Psalm singing')] },
      { id: 'speaking', label: 'What speaking and prayer?', kind: 'multi',
        options: [opt('sermon', 'Sermon or message', true), opt('readings', 'Scripture readings', true),
          opt('responsive', 'A responsive reading (Leader / People)'), opt('creed', 'A creed', true),
          opt('prayers', 'Prayers of the people', true), opt('announce', 'Announcements', true), opt('children', "Children's message")] },
      { id: 'extras', label: 'Printed text', kind: 'multi',
        options: [opt('printText', 'Print the text of the creed and prayers (public-domain wording)', true)] }
    ],
    funeral: [
      { id: 'tradition', label: 'What style of service?', kind: 'single', def: 'presbyterian',
        options: TRADITIONS.map((t) => opt(t.id, t.label)) },
      { id: 'includes', label: 'What will the service include?', kind: 'multi',
        options: [opt('hymn', 'Congregational hymns', true), opt('music', 'Special music or a solo', true),
          opt('readings', 'Scripture readings', true), opt('obituary', 'Obituary', true), opt('eulogy', 'Eulogy or tribute', true),
          opt('sermon', 'Message of comfort', true), opt('creed', 'A creed'), opt('committal', 'Committal at the graveside', true),
          opt('pallbearers', 'List of pallbearers'), opt('family', 'Acknowledgment of the family'), opt('reception', 'Reception details')] },
      { id: 'extras', label: 'Printed text', kind: 'multi',
        options: [opt('printText', 'Print the text of the creed and prayers (public-domain wording)', true)] }
    ],
    wedding: [
      { id: 'tradition', label: 'What style of ceremony?', kind: 'single', def: 'simple',
        options: TRADITIONS.map((t) => opt(t.id, t.label)) },
      { id: 'includes', label: 'What will the ceremony include?', kind: 'multi',
        options: [opt('hymn', 'Congregational hymns'), opt('music', 'Special music or a solo', true),
          opt('readings', 'Scripture readings', true), opt('sermon', 'A message or charge', true), opt('unity', 'Unity candle'),
          opt('communion', 'Communion'), opt('party', 'List of the wedding party', true), opt('reception', 'Reception details')] }
    ],
    school: [
      { id: 'kind', label: 'What kind of program?', kind: 'single', def: 'concert',
        options: [opt('concert', 'Concert (band, choir or orchestra)'), opt('recital', 'Recital'), opt('graduation', 'Graduation'),
          opt('play', 'Play or musical'), opt('awards', 'Awards night')] },
      { id: 'groups', label: 'Who is performing?', kind: 'multi', showIf: (a) => a.kind === 'concert',
        options: [opt('band', 'Concert band', true), opt('choir', 'Choir', true), opt('orchestra', 'Orchestra'),
          opt('jazz', 'Jazz band'), opt('soloists', 'Soloists')] },
      { id: 'speaking', label: 'What speaking will there be?', kind: 'multi',
        options: [opt('welcome', 'A welcome', true), opt('students', 'Student speakers'), opt('awards', 'Presentation of awards'),
          opt('thanks', 'Thank-yous', true)] },
      { id: 'extras', label: 'What else should be printed?', kind: 'multi',
        options: [opt('roster', 'Roster of performers'), opt('sponsors', 'Sponsors and donors'), opt('notes', 'Program notes'),
          opt('upcoming', 'Upcoming events')] }
    ],
    other: []
  };

  function defaults(type) {
    const a = {};
    for (const q of QUESTIONS[type] || []) {
      a[q.id] = q.kind === 'single' ? (q.def || q.options[0].id) : q.options.filter((o) => o.def).map((o) => o.id);
    }
    return a;
  }

  // ---------- building blocks ----------

  // [markup line, tag the line needs (optional), id of a library text to print under it (optional)]
  const I = (l, t, text) => ({ l, t, text });

  const stripHeading = (body) => String(body || '').replace(/^##[^\n]*\n/, '').trim();

  // Orders of worship. `euch` = this service includes the Lord's Supper.
  const ORDERS = {
    anglican: (euch) => [
      { h: 'The Gathering', items: [I('Prelude |', 'organ'), I('+ Processional Hymn | | Number', 'hymn'), I('+ Opening Acclamation |'),
        I('Collect for Purity |', null, 'collect-for-purity'), I('+ Song of Praise |'), I('Collect of the Day |')] },
      { h: 'The Word of God', items: [I('First Reading | | Passage', 'readings'), I('Psalm | | Number', 'readings'), I('Second Reading | | Passage', 'readings'),
        I('+ Sequence Hymn | | Number', 'hymn'), I('+ The Gospel | | Passage', 'readings'), I('Sermon | | Preacher', 'sermon'),
        I('+ The Nicene Creed |', 'creed', 'nicene-creed'), I('Prayers of the People |', 'prayers'), I('Confession and Absolution |'), I('The Peace |'),
        I('Announcements |', 'announce')] },
      ...(euch ? [{ h: 'The Holy Communion', items: [I('+ Offertory Hymn | | Number', 'hymn'), I('Anthem |', 'choir'),
        I('The Great Thanksgiving |', null, 'sursum-corda'), I('Sanctus |', null, 'sanctus'), I('The Lord\'s Prayer |', null, 'lords-prayer-trespasses'),
        I('The Breaking of the Bread |'), I('Agnus Dei |', null, 'agnus-dei'), I('Communion | | Music'), I('Prayer after Communion |')] }] : [{ h: 'Offering', items: [I('Offertory |'), I('Anthem |', 'choir')] }]),
      { h: 'The Sending', items: [I('Blessing |'), I('+ Closing Hymn | | Number', 'hymn'), I('Dismissal |'), I('Postlude |', 'organ')] }
    ],
    presbyterian: (euch) => [
      { h: 'The Lord Calls Us into His Presence', items: [I('Prelude |', 'organ'), I('Welcome & Announcements |', 'announce'),
        I('+ Call to Worship | | Passage'), I('Psalm Singing | | Psalm', 'psalm'), I('+ Opening Hymn | | Number', 'hymn'), I('Invocation |')] },
      { h: 'The Lord Cleanses Us in His Son', items: [I('Call to Confession |'), I('Prayer of Confession |'), I('Assurance of Pardon | | Passage'),
        I('+ Gloria Patri |', 'hymn', 'gloria-patri')] },
      { h: 'The Lord Consecrates Us with His Word', items: [I('Prayer for Illumination |'), I('Scripture Reading | | Passage', 'readings'),
        I('Sermon | | Preacher', 'sermon'), I('+ Apostles\' Creed |', 'creed', 'apostles-creed'), I('+ Hymn of Response | | Number', 'hymn')] },
      ...(euch ? [{ h: 'The Lord Communes with Us at His Table', items: [I('Invitation to the Table |'), I('Prayer of Thanksgiving |'),
        I('Institution of the Lord\'s Supper |'), I('Communion | | Hymn')] }] : []),
      { h: 'The Lord Receives Our Offerings', items: [I('Offering |'), I('Anthem |', 'choir'), I('+ Doxology |', 'hymn', 'doxology'),
        I('Pastoral Prayer and the Lord\'s Prayer |', 'prayers', 'lords-prayer-debts')] },
      { h: 'The Lord Commissions Us with His Blessing', items: [I('+ Closing Hymn | | Number', 'hymn'), I('Benediction |', null, 'aaronic-benediction'), I('Postlude |', 'organ')] }
    ],
    // ELCA: Evangelical Lutheran Worship, Holy Communion (Gathering, Word, Meal, Sending)
    'lutheran-elca': (euch) => [
      { h: 'Gathering', items: [I('Prelude |', 'organ'), I('Welcome & Announcements |', 'announce'), I('+ Confession and Forgiveness |'),
        I('+ Gathering Hymn | | Number', 'hymn'), I('+ Greeting |'), I('+ Kyrie |', null, 'kyrie'), I('+ Hymn of Praise |'), I('+ Prayer of the Day |')] },
      { h: 'Word', items: [I('First Reading | | Passage', 'readings'), I('Psalm | | Number', 'readings'), I('Second Reading | | Passage', 'readings'),
        I('+ Gospel Acclamation |'), I('+ Gospel | | Passage', 'readings'), I('Sermon | | Pastor', 'sermon'), I('+ Hymn of the Day | | Number', 'hymn'),
        I('+ Creed |', 'creed', 'nicene-creed'), I('+ Prayers of Intercession |', 'prayers'), I('+ The Peace |')] },
      ...(euch ? [{ h: 'Meal', items: [I('Offering |'), I('Anthem |', 'choir'), I('+ Great Thanksgiving |', null, 'sursum-corda'), I('+ Holy, Holy, Holy |', null, 'sanctus'),
        I('+ Thanksgiving at the Table |'), I('+ The Lord\'s Prayer |', null, 'lords-prayer-trespasses'), I('+ Invitation to Communion |'),
        I('Communion | | Hymns'), I('+ Lamb of God |', null, 'agnus-dei'), I('+ Prayer after Communion |')] }]
        : [{ h: 'Offering', items: [I('Offering |'), I('Anthem |', 'choir')] }]),
      { h: 'Sending', items: [I('+ Blessing |', null, 'aaronic-benediction'), I('+ Sending Hymn | | Number', 'hymn'), I('+ Dismissal |'), I('Postlude |', 'organ')] }
    ],
    // LCMS: Lutheran Service Book, Divine Service
    'lutheran-lcms': (euch) => [
      { h: 'The Entrance', items: [I('Prelude |', 'organ'), I('+ Opening Hymn | | Number', 'hymn'), I('+ Invocation |'), I('+ Confession and Absolution |'),
        I('+ Introit |'), I('+ Kyrie |', null, 'kyrie'), I('+ Hymn of Praise |'), I('+ Salutation and Collect of the Day |')] },
      { h: 'The Service of the Word', items: [I('Old Testament Reading | | Passage', 'readings'), I('Psalm | | Number', 'readings'), I('Epistle | | Passage', 'readings'),
        I('+ Alleluia and Verse |'), I('+ Holy Gospel | | Passage', 'readings'), I('+ Hymn of the Day | | Number', 'hymn'),
        I('Sermon | | Pastor', 'sermon'), I('Offertory |'), I('Anthem |', 'choir'), I('+ Confession of Faith |', 'creed', 'nicene-creed'),
        I('+ Prayer of the Church |', 'prayers'), I('Announcements |', 'announce')] },
      ...(euch ? [{ h: 'The Service of the Sacrament', items: [I('+ Preface |', null, 'sursum-corda'), I('+ Sanctus |', null, 'sanctus'), I('+ Prayer of Thanksgiving |'),
        I('+ The Lord\'s Prayer |', null, 'lords-prayer-trespasses'), I('+ The Words of Our Lord and the Pax Domini |'), I('+ Agnus Dei |', null, 'agnus-dei'),
        I('Distribution Hymns | | Numbers', 'hymn'), I('+ Post-Communion Canticle |', null, 'nunc-dimittis'), I('+ Post-Communion Collect |')] }] : []),
      { h: 'The Sending', items: [I('+ Benediction |', null, 'aaronic-benediction'), I('+ Closing Hymn | | Number', 'hymn'), I('Postlude |', 'organ')] }
    ],
    // United Methodist: Entrance, Proclamation and Response, Thanksgiving and Communion, Sending Forth
    methodist: (euch) => [
      { h: 'Gathering', items: [I('Prelude |', 'organ'), I('Welcome & Announcements |', 'announce'), I('Introit |', 'choir'), I('+ Call to Worship |'),
        I('+ Opening Hymn | | Number', 'hymn'), I('+ Gathering Prayer |'), I('+ Passing of the Peace |')] },
      { h: 'Proclamation and Response', items: [I('First Lesson | | Passage', 'readings'), I('Gospel Lesson | | Passage', 'readings'),
        I('+ Hymn of Preparation | | Number', 'hymn'), I('Sermon | | Pastor', 'sermon'), I('Anthem |', 'choir'),
        I('+ Affirmation of Faith |', 'creed', 'apostles-creed'), I('Pastoral Prayer and the Lord\'s Prayer |', 'prayers', 'lords-prayer-trespasses')] },
      ...(euch ? [{ h: 'Thanksgiving and Communion', items: [I('+ The Great Thanksgiving |', null, 'sursum-corda'), I('+ Holy, Holy, Holy |', null, 'sanctus'),
        I('Communion | | Hymn')] }] : []),
      { h: 'Offering and Sending Forth', items: [I('Offertory |'), I('+ Doxology |', 'hymn', 'doxology'), I('+ Prayer of Dedication |'),
        I('+ Closing Hymn | | Number', 'hymn'), I('+ Benediction |'), I('Postlude |', 'organ')] }
    ],    contemporary: (euch) => [
      { h: 'Gather', items: [I('Welcome & Announcements |', 'announce'), I('Call to Worship |'), I('Prayer |')] },
      { h: 'Praise', items: [I('Song |', 'band'), I('Song |', 'band'), I('Song |', 'band'), I('+ Hymn | | Number', 'hymn'), I('Special Music |', 'choir')] },
      { h: 'Reflect', items: [I('Scripture Reading | | Passage', 'readings'), I('Message | | Speaker', 'sermon')] },
      { h: 'Respond', items: [I('Response Song |', 'band'), I('+ Response Hymn | | Number', 'hymn'), I('Prayers of the People |', 'prayers'), I('Offering |'),
        ...(euch ? [I('Communion |')] : [])] },
      { h: 'Share', items: [I('Benediction |'), I('Postlude |', 'organ')] }
    ],
    simple: (euch) => [
      { h: 'Order of Worship', items: [I('Prelude |', 'organ'), I('Welcome & Announcements |', 'announce'), I('+ Opening Hymn | | Number', 'hymn'), I('Prayer |'),
        I('Scripture Reading | | Passage', 'readings'), I('Special Music |', 'choir'), I('Message | | Speaker', 'sermon'),
        ...(euch ? [I('Communion |')] : []), I('Offering |'), I('+ Closing Hymn | | Number', 'hymn'), I('Benediction |'), I('Postlude |', 'organ')] }
    ]
  };

  const SHORT_EVENING = [
    { h: 'Order of Service', items: [I('Welcome |'), I('Call to Worship |'), I('+ Hymn | | Number', 'hymn'), I('Song |', 'band'), I('Prayer |'),
      I('Scripture Reading | | Passage', 'readings'), I('Message | | Speaker', 'sermon'), I('Special Music |', 'choir'),
      I('+ Closing Hymn | | Number', 'hymn'), I('Benediction |')] }
  ];

  const WORSHIP_TITLES = {
    anglican: ['Holy Eucharist', 'Rite II'], presbyterian: ['Lord\'s Day Worship', ''], 'lutheran-elca': ['Holy Communion', ''], 'lutheran-lcms': ['The Divine Service', ''],
    methodist: ['Sunday Worship', ''], contemporary: ['Sunday Worship', ''], simple: ['Sunday Morning Worship', '']
  };

  // ---------- rendering ----------

  const hasAny = (arr, id) => Array.isArray(arr) && arr.includes(id);

  // sections -> body markup. keep(item) decides which lines stay; print adds library texts.
  // The hymnal each tradition usually prints numbers from, so the placeholder reads naturally.
  const HYMNAL = {
    presbyterian: 'Hymn #', anglican: 'Hymn #', 'lutheran-elca': 'ELW #', 'lutheran-lcms': 'LSB #',
    methodist: 'UMH #', contemporary: 'Number', simple: 'Number'
  };

  function render(sections, keep, print, texts, hymnal) {
    const out = [];
    const outline = [];
    let stand = false;
    for (const sec of sections) {
      const items = sec.items.filter(keep);
      if (!items.length && !(sec.raw && sec.raw.length)) continue;
      outline.push(sec.h);
      if (out.length) out.push('');
      out.push('# ' + sec.h);
      for (const it of items) {
        let line = it.l;
        if (hymnal) line = line.replace(/\| Number$/, '| ' + hymnal).replace(/\| Numbers$/, '| ' + hymnal.replace(/#$/, '#s'));
        if (line.startsWith('+ ')) stand = true;
        out.push(line);
        if (print && it.text && texts && texts[it.text]) out.push('', stripHeading(texts[it.text].body), '');
      }
      if (sec.raw) out.push(...sec.raw);
    }
    let body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    // Nearly every printed bulletin explains its standing mark.
    if (stand) body = '> ▲ Please stand if you are able.\n\n' + body;
    return { body, outline };
  }

  function buildWorship(a, texts, kind) {
    const speaking = a.speaking || [];
    const tags = new Set([...(a.music || []), ...speaking]);
    const short = a.service === 'evening' || a.service === 'midweek';
    const T = a.tradition in ORDERS ? a.tradition : 'simple';
    const euch = !short && (a.service === 'communion' ||
      ((T === 'anglican' || T === 'lutheran-elca' || T === 'lutheran-lcms') && (a.service === 'morning' || a.service === 'special')));
    let sections = short ? SHORT_EVENING.map((s) => ({ ...s, items: [...s.items] })) : ORDERS[T](euch).map((s) => ({ ...s, items: [...s.items] }));

    // Optional extras that attach to the order.
    if (tags.has('responsive') && sections.length) {
      sections[0].items.push(I('Responsive Reading |'), I('Leader: Add the leader\'s line here.'), I('People: Add the people\'s response here.'));
    }
    if (tags.has('children')) {
      for (const s of sections) {
        const at = s.items.findIndex((it) => it.t === 'sermon');
        if (at >= 0) { s.items.splice(at, 0, I('Children\'s Message |')); break; }
      }
    }
    const print = hasAny(a.extras, 'printText');
    const r = render(sections, (it) => !it.t || tags.has(it.t), print, texts, HYMNAL[T]);

    let title, subtitle = '';
    if (short) title = a.service === 'midweek' ? 'Midweek Service' : 'Sunday Evening Service';
    else if (a.service === 'communion') { title = 'Communion Sunday'; subtitle = 'The Lord\'s Supper'; }
    else if (a.service === 'special') { title = 'Special Service'; }
    else [title, subtitle] = WORSHIP_TITLES[T];
    if (T === 'anglican' && !short && a.service !== 'communion' && a.service !== 'special') { /* keeps 'Holy Eucharist' */ }
    return { name: title, title, subtitle, body: r.body, sheetMode: 'service', outline: r.outline };
  }

  function buildFuneral(a, texts) {
    const inc = new Set(a.includes || []);
    const sections = [
      { h: 'Gathering', items: [I('Prelude |', 'music'), I('Welcome |'), I('+ Call to Worship |'), I('+ Opening Hymn | | Number', 'hymn'), I('Invocation |')] },
      { h: 'Remembrance', items: [I('Obituary |', 'obituary'), I('Eulogy |', 'eulogy'), I('Special Music |', 'music')] },
      { h: 'The Word', items: [I('Scripture Reading | | Passage', 'readings'), I('+ Hymn | | Number', 'hymn'), I('Message of Comfort | | Speaker', 'sermon'),
        I('+ Apostles\' Creed |', 'creed', 'apostles-creed'), I('Prayer |', null, 'lords-prayer-debts')] },
      { h: 'Committal', items: [I('Committal |', 'committal'), I('Benediction |', null, 'aaronic-benediction'), I('+ Closing Hymn | | Number', 'hymn'),
        I('Recessional |')] },
      { h: 'Family and Friends', items: [I('Pallbearers |', 'pallbearers'), I('Honorary Pallbearers |', 'pallbearers'), I('Acknowledgment of the Family |', 'family'),
        I('Interment | | Cemetery', 'committal'), I('Reception | | Location', 'reception')] }
    ];
    const r = render(sections, (it) => !it.t || inc.has(it.t), hasAny(a.extras, 'printText'), texts, HYMNAL[a.tradition]);
    const title = a.tradition === 'anglican' ? 'The Burial of the Dead' : 'In Loving Memory';
    return { name: 'Funeral Service', title, subtitle: 'Full Name · Birth Year – Death Year', body: r.body, sheetMode: 'service', outline: r.outline };
  }

  function buildWedding(a, texts) {
    const inc = new Set(a.includes || []);
    const sections = [
      { h: 'Order of Ceremony', items: [I('Prelude |', 'music'), I('Seating of Family |'), I('Processional |', 'music'), I('Welcome and Call to Worship |'),
        I('+ Hymn | | Number', 'hymn'), I('Prayer |'), I('Scripture Reading | | Passage', 'readings'), I('Message | | Officiant', 'sermon'),
        I('Exchange of Vows |'), I('Exchange of Rings |'), I('Unity Candle |', 'unity'), I('Communion |', 'communion'),
        I('Pronouncement |'), I('Blessing and Benediction |', null, 'aaronic-benediction'), I('Recessional |', 'music')] },
      { h: 'The Wedding Party', items: [I('Officiant | | Name', 'party'), I('Maid of Honor | | Name', 'party'), I('Best Man | | Name', 'party'),
        I('Bridesmaids | | Names', 'party'), I('Groomsmen | | Names', 'party'), I('Flower Girl and Ring Bearer | | Names', 'party'), I('Parents | | Names', 'party')] },
      { h: 'Reception', items: [I('Reception | | Location and time', 'reception')] }
    ];
    const r = render(sections, (it) => !it.t || inc.has(it.t), true, texts, HYMNAL[a.tradition]);
    return { name: 'Wedding Ceremony', title: 'The Wedding of', subtitle: 'Bride & Groom', body: r.body, sheetMode: 'service', outline: r.outline };
  }

  const GROUPS = { band: 'Concert Band', choir: 'Choir', orchestra: 'Orchestra', jazz: 'Jazz Band', soloists: 'Soloists' };
  const PIECE = 'Piece Title | | Composer Name (1732–1809)';

  function buildSchool(a) {
    const speak = new Set(a.speaking || []);
    const extra = new Set(a.extras || []);
    const groups = (a.groups && a.groups.length ? a.groups : ['band']).filter((g) => GROUPS[g]);
    const sections = [];
    let title = 'Spring Concert', subtitle = '', name = 'Concert Program', sheetMode = 'concert';

    const front = [];
    if (speak.has('welcome')) front.push(I('Welcome | | Name'));
    if (speak.has('students')) front.push(I('Student Remarks | | Name'));

    if (a.kind === 'concert') {
      if (front.length) sections.push({ h: 'Welcome', items: front });
      for (const g of groups) sections.push({ h: GROUPS[g], items: [I(PIECE), I(PIECE), I('Piece Title | arr. Arranger | Composer Name (b. 1978)')] });
      if (speak.has('awards')) sections.push({ h: 'Awards', items: [I('Presentation of Awards |')] });
    } else if (a.kind === 'recital') {
      name = 'Recital Program'; title = 'Student Recital';
      if (front.length) sections.push({ h: 'Welcome', items: front });
      sections.push({ h: 'Program', items: [I('Piece Title | Performer | Composer Name (1685–1750)'), I('Piece Title | Performer | Composer Name (1770–1827)'),
        I('Piece Title | Performer | Composer Name (b. 1960)')] });
      if (speak.has('awards')) sections.push({ h: 'Awards', items: [I('Presentation of Awards |')] });
    } else if (a.kind === 'graduation') {
      name = 'Graduation Ceremony'; title = 'Commencement'; subtitle = 'Class of 2026'; sheetMode = 'service';
      const items = [I('Processional |')];
      if (speak.has('welcome')) items.push(I('Welcome | | Name'));
      items.push(I('Invocation | | Name'));
      if (speak.has('students')) items.push(I('Student Address | | Name'));
      items.push(I('Keynote Address | | Name'), I('Presentation of Diplomas | | Name'));
      if (speak.has('awards')) items.push(I('Presentation of Awards |'));
      items.push(I('Alma Mater |'), I('Benediction | | Name'), I('Recessional |'));
      sections.push({ h: 'Ceremony', items });
      sections.push({ h: 'Graduates', items: [], raw: ['Add the graduates\' names here, one per line.'] });
    } else if (a.kind === 'play') {
      name = 'Play Program'; title = 'The School Play'; sheetMode = 'service';
      sections.push({ h: 'Cast', items: [I('Character | | Student Name'), I('Character | | Student Name'), I('Character | | Student Name')] });
      sections.push({ h: 'Scenes', items: [I('Act I | | Setting'), I('Act II | | Setting')] });
      sections.push({ h: 'Crew', items: [I('Director | | Name'), I('Stage Manager | | Name')] });
    } else {
      name = 'Awards Program'; title = 'Awards Night'; sheetMode = 'service';
      const items = [];
      if (speak.has('welcome')) items.push(I('Welcome | | Name'));
      items.push(I('Presentation of Awards |'));
      if (speak.has('students')) items.push(I('Student Remarks | | Name'));
      items.push(I('Closing Remarks | | Name'));
      sections.push({ h: 'Program', items });
      sections.push({ h: 'Award Winners', items: [I('Award Name | | Student Name'), I('Award Name | | Student Name')] });
    }

    if (extra.has('roster')) {
      const names = a.kind === 'concert' ? groups.map((g) => GROUPS[g]) : ['Performers'];
      sections.push({ h: 'Personnel', items: [], raw: names.flatMap((n) => ['', '## ' + n, 'Add the names here, separated by commas.']).slice(1) });
    }
    if (extra.has('notes')) sections.push({ h: 'Program Notes', items: [], raw: ['Add a few sentences about each piece here.'] });
    if (extra.has('sponsors')) sections.push({ h: 'Our Sponsors', items: [], raw: ['## Gold Level', 'Add sponsor names here.', '', '## Silver Level', 'Add sponsor names here.'] });
    if (extra.has('upcoming')) sections.push({ h: 'Upcoming Events', items: [], raw: ['- Event name, date and time', '- Event name, date and time'] });
    if (speak.has('thanks')) sections.push({ h: 'Thank You', items: [], raw: ['Thank you for joining us.'] });

    const r = render(sections, () => true, false, null);
    return { name, title, subtitle, body: r.body, sheetMode, outline: r.outline };
  }

  // A sensible starting cover for each kind of program (the person can change it).
  function coverFor(type, a) {
    const art = (id) => ({ kind: 'builtin', id });
    const none = { kind: 'none', id: '' };
    if (type === 'funeral') return { style: 'framed', art: art('cross') };
    if (type === 'wedding') return { style: 'framed', art: art('flower') };
    if (type === 'school') {
      if (a.kind === 'graduation') return { style: 'banner', art: art('cap') };
      if (a.kind === 'concert' || a.kind === 'recital') return { style: 'picture', art: art('notes') };
      return { style: 'picture', art: art('star') };
    }
    return { style: 'classic', art: none };
  }

  function buildOther() {
    return { name: 'New Program', title: 'Program Title', subtitle: '', sheetMode: 'service', outline: ['Order of Program'],
      body: '# Order of Program\nItem one |\nItem two |\nItem three |' };
  }

  // Turn the wizard's answers into a starting template.
  //   type: 'church' | 'funeral' | 'wedding' | 'school' | 'other'
  //   answers: { questionId: 'single-id' | ['multi','ids'] }, missing answers use defaults
  //   texts: library texts by id ({ id: { body } }) used when "print the text" is on
  function build(type, answers, texts) {
    const a = { ...defaults(type), ...(answers || {}) };
    let out;
    if (type === 'church') out = buildWorship(a, texts);
    else if (type === 'funeral') out = buildFuneral(a, texts);
    else if (type === 'wedding') out = buildWedding(a, texts);
    else if (type === 'school') out = buildSchool(a);
    else out = buildOther();
    return { formatId: 'letter-bifold', cover: coverFor(type, a), ...out };
  }

  return { TYPES, TRADITIONS, QUESTIONS, defaults, build };
});
