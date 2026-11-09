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

      // ----- concert -----
      { id: 'groups', label: 'Who is performing?', kind: 'multi', showIf: (a) => a.kind === 'concert',
        options: [opt('band', 'Concert band', true), opt('choir', 'Choir', true), opt('orchestra', 'Orchestra'),
          opt('jazz', 'Jazz band'), opt('soloists', 'Soloists')] },
      { id: 'speaking', label: 'What speaking will there be?', kind: 'multi', showIf: (a) => a.kind === 'concert',
        options: [opt('welcome', 'A welcome', true), opt('students', 'Student speakers'), opt('awards', 'Presentation of awards'),
          opt('thanks', 'Thank-yous', true)] },
      { id: 'extras', label: 'What else should be printed?', kind: 'multi', showIf: (a) => a.kind === 'concert',
        options: [opt('roster', 'Roster of performers, by section'), opt('sponsors', 'Sponsors and donors'), opt('notes', 'Program notes'),
          opt('etiquette', 'A request to silence phones and not record'), opt('friends', 'A list of friends and donors'), opt('upcoming', 'Upcoming events')] },

      // ----- recital -----
      { id: 'recitalExtras', label: 'What else should be printed?', kind: 'multi', showIf: (a) => a.kind === 'recital',
        options: [opt('guests', 'Accompanist and guest performers', true), opt('numerals', 'Group the pieces with Roman numerals (I, II)'),
          opt('degree', 'A note that this recital is part of a degree'), opt('studio', 'The teacher or studio'),
          opt('notes', 'Program notes (with texts and translations)'), opt('roster', 'List of performers'), opt('welcome', 'A welcome'),
          opt('etiquette', 'A request to silence phones and not record'), opt('friends', 'A list of friends and donors'),
          opt('upcoming', 'Upcoming events'), opt('thanks', 'Thank-yous', true)] },

      // ----- graduation -----
      { id: 'gradLevel', label: 'What kind of school?', kind: 'single', def: 'highschool', showIf: (a) => a.kind === 'graduation',
        options: [opt('highschool', 'A school (diplomas)'), opt('college', 'A college or university (degrees)')] },
      { id: 'gradCeremony', label: 'What will the ceremony include?', kind: 'multi', showIf: (a) => a.kind === 'graduation',
        options: [opt('presiding', 'The presiding officers listed at the top'), opt('processional', 'Processional music', true), opt('anthem', 'The national anthem'),
          opt('welcome', 'A welcome', true), opt('invocation', 'An opening prayer or invocation', true), opt('music', 'Choir, band or other music'),
          opt('studentAddress', 'A student address (valedictorian or salutatorian)', true), opt('keynote', 'A commencement speaker', true),
          opt('charge', 'A charge to the class'), opt('honors', 'Honors and awards'), opt('scholarships', 'Scholarships'),
          opt('tassel', 'Turning of the tassels'), opt('alma', 'A class song or alma mater'),
          opt('benediction', 'A closing prayer or benediction', true), opt('recessional', 'Recessional music', true)] },
      { id: 'gradPrint', label: 'What should be printed in the program?', kind: 'multi', showIf: (a) => a.kind === 'graduation',
        options: [opt('graduates', 'The list of graduates', true), opt('honorGrads', 'Honor graduates (valedictorian, salutatorian)'),
          opt('honorsKey', 'A key to honors markings (summa, magna, cum laude)'), opt('awardsList', 'Awards and scholarships and who won them'),
          opt('faculty', 'Faculty, staff and board'), opt('motto', 'Class motto, colors and flower'),
          opt('welcomeNote', 'A welcome message to families'), opt('notices', 'A note for guests (phones, photos, applause)'),
          opt('hymn', 'The school hymn or song'), opt('baccalaureate', 'A baccalaureate service, printed first'),
          opt('thanks', 'A word of congratulations and thanks', true)] },

      // ----- play or musical -----
      { id: 'playExtras', label: 'What should be printed?', kind: 'multi', showIf: (a) => a.kind === 'play',
        options: [opt('cast', 'The cast', true), opt('scenes', 'Acts and scenes', true), opt('crew', 'The crew', true),
          opt('director', 'A note from the director'), opt('sponsors', 'Sponsors and donors'), opt('upcoming', 'Upcoming events'),
          opt('thanks', 'Thank-yous', true)] },

      // ----- awards night -----
      { id: 'awardsExtras', label: 'What should be printed?', kind: 'multi', showIf: (a) => a.kind === 'awards',
        options: [opt('welcome', 'A welcome', true), opt('students', 'Student remarks'), opt('winners', 'The list of award winners', true),
          opt('sponsors', 'Sponsors and donors'), opt('thanks', 'Thank-yous', true)] }
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
      if (sec.h) { outline.push(sec.h); if (out.length) out.push(''); out.push('# ' + sec.h); } else if (out.length) out.push('');
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

  // Extra sections printed after the main order (rosters, sponsors, notes…), as plain text to fill in.
  // A section with no heading (h null) is just lines, such as a page break or a note.
  const rawSection = (h, lines) => ({ h, items: [], raw: lines });
  const SPONSORS = rawSection('Our Sponsors', ['## Gold Level', 'Add sponsor names here.', '', '## Silver Level', 'Add sponsor names here.']);
  const UPCOMING = rawSection('Upcoming Events', ['- Event name, date and time', '- Event name, date and time']);
  const ETIQUETTE = rawSection(null, ['*Please silence all cell phones and other electronic devices before the performance. Cameras, flash photography and recording devices create distractions and may infringe on copyright law.*']);
  const FRIENDS = rawSection('Friends and Donors', ['[columns 2]', 'Anonymous', 'Mr. and Mrs. Name', 'Dr. and Mrs. Name', 'Ms. Name', '[/columns]']);

  // Section players for each kind of ensemble, used for rosters.
  const ROSTER = {
    band: ['Flute', 'Clarinet', 'Saxophone', 'Trumpet', 'Horn', 'Trombone', 'Euphonium', 'Tuba', 'Percussion'],
    orchestra: ['Violin I', 'Violin II', 'Viola', 'Cello', 'Bass', 'Flute', 'Oboe', 'Clarinet', 'Bassoon', 'Horn', 'Trumpet', 'Trombone', 'Percussion'],
    choir: ['Soprano', 'Alto', 'Tenor', 'Bass'],
    jazz: ['Saxophone', 'Trumpet', 'Trombone', 'Rhythm Section']
  };
  const ROSTER_COLS = { band: 3, orchestra: 3, choir: 4, jazz: 3 };

  function rosterLines(groups) {
    const lines = [];
    for (const g of groups) {
      if (!ROSTER[g]) continue;
      if (lines.length) lines.push('');
      lines.push('## ' + GROUPS[g], `[columns ${ROSTER_COLS[g]}]`);
      for (const s of ROSTER[g]) lines.push('## ' + s, 'Name', 'Name');
      lines.push('[/columns]');
    }
    return lines;
  }

  function buildConcert(a) {
    const speak = new Set(a.speaking || []);
    const extra = new Set(a.extras || []);
    const groups = (a.groups && a.groups.length ? a.groups : ['band']).filter((g) => GROUPS[g]);
    const sections = [];
    const front = [];
    if (speak.has('welcome')) front.push(I('Welcome | | Name'));
    if (speak.has('students')) front.push(I('Student Remarks | | Name'));
    if (front.length) sections.push({ h: 'Welcome', items: front });
    for (const g of groups) sections.push({ h: GROUPS[g], items: [I(PIECE), I(PIECE), I('Piece Title | arr. Arranger | Composer Name (b. 1978)')] });
    if (speak.has('awards')) sections.push({ h: 'Awards', items: [I('Presentation of Awards |')] });
    if (extra.has('roster')) sections.push(rawSection('Personnel', rosterLines(groups)));
    if (extra.has('notes')) sections.push(rawSection('Program Notes', ['## Piece Title', 'Add a few sentences about the piece here.', '', '## Piece Title', 'Add a few sentences about the piece here.']));
    if (extra.has('sponsors')) sections.push(SPONSORS);
    if (extra.has('friends')) sections.push(FRIENDS);
    if (extra.has('upcoming')) sections.push(UPCOMING);
    if (extra.has('etiquette')) sections.push(ETIQUETTE);
    if (speak.has('thanks')) sections.push(rawSection('Thank You', ['Thank you for joining us.']));
    return { name: 'Concert Program', title: 'Spring Concert', subtitle: '', sections, sheetMode: 'concert' };
  }

  function buildRecital(a) {
    const x = new Set(a.recitalExtras || []);
    const sections = [];
    if (x.has('welcome')) sections.push({ h: 'Welcome', items: [I('Welcome | | Name')] });
    const num = (n) => (x.has('numerals') ? [I(`^ **${n}**`)] : []);
    const items = [];
    if (x.has('guests')) items.push(I('^ *Performer Name*, instrument'), I('^ *Accompanist Name*, piano'));
    items.push(...num('I'),
      I('Piece Title | from *Source Title* | Composer Name (1756–1791)'), I('  I. First movement'), I('  II. Second movement'),
      I('Piece Title | | Composer Name (1797–1828)'));
    if (x.has('guests')) items.push(I('^ *Guest Performer*, instrument'));
    items.push(...num('II'),
      I('Piece Title | | Composer Name (1843–1907)'), I('Piece Title | | Composer Name (b. 1960)'));
    sections.push({ h: 'Program', items });
    if (x.has('roster')) sections.push(rawSection('Performers', ['[columns 2]', 'Name', 'Name', 'Name', '[/columns]']));
    if (x.has('degree')) sections.push(rawSection(null, ['^ This recital is presented in partial fulfillment of the requirements for the degree, Bachelor of Music in Instrument or Voice.']));
    if (x.has('studio')) sections.push(rawSection(null, ['^ From the studio of Teacher Name']));
    if (x.has('etiquette')) sections.push(ETIQUETTE);
    if (x.has('upcoming')) sections.push(UPCOMING);
    if (x.has('friends')) sections.push(FRIENDS);
    if (x.has('thanks')) sections.push(rawSection('Thank You', ['Thank you to our teachers, families and friends.']));
    if (x.has('notes')) {
      sections.push(rawSection(null, ['===']));
      sections.push(rawSection('Program Notes', ['## Piece Title', 'Add a few sentences about the piece here.', '*Translation or text of the piece, if it has one*', '',
        '## Piece Title', 'Add a few sentences about the piece here.']));
    }
    return { name: 'Recital Program', title: 'Senior Recital', subtitle: 'Performer Name, instrument', sections, sheetMode: 'concert' };
  }

  // A graduation is a ceremony, not a concert: speakers, honors, diplomas or degrees, and the list of graduates.
  // For a college or university the list is grouped by college and program, with hometowns.
  function buildGraduation(a) {
    const college = a.gradLevel === 'college';
    const c = new Set(a.gradCeremony || []);
    const p = new Set(a.gradPrint || []);
    const sections = [];

    if (p.has('welcomeNote')) sections.push(rawSection('Welcome', ['^ The administration, faculty and staff extend a warm welcome to the families and friends of this graduating class.', '', '^ Your support has made this day possible, and we applaud you for investing in the next generation of leaders.']));
    if (p.has('notices')) sections.push(rawSection(null, ['*Please silence all cell phones and electronic devices. Photography and recording distract others; please hold your applause until all of the names have been read.*']));
    if (p.has('baccalaureate')) {
      sections.push({ h: 'Baccalaureate Service', items: [I('Prelude | | Name'), I('+ Processional | | Music'), I('+ Hymn | | Title'), I('+ Invocation | | Name | Title'),
        I('Special Music | | Performer'), I('Welcome | | Name | Title'), I('Scripture Reading | | Passage'), I('Baccalaureate Sermon | | Speaker | Title'),
        I('+ Recessional | | Music'), I('+ Benediction | | Name | Title')] });
      sections.push(rawSection(null, ['===']));
    }

    const items = [];
    if (c.has('presiding')) items.push(I('^ Presiding: Name, Title'));
    if (c.has('processional')) items.push(I('+ Processional | | Music'));
    if (c.has('anthem')) items.push(I('+ National Anthem | | Performer'));
    if (c.has('welcome')) items.push(I('Welcome | | Name | Title'));
    if (c.has('invocation')) items.push(I('Invocation | | Name | Title'));
    if (c.has('music')) items.push(I('Music | | Performer'));
    if (c.has('studentAddress')) items.push(I('Student Address | | Name'));
    if (c.has('keynote')) items.push(I('Commencement Address | | Name | Title'));
    if (c.has('charge')) items.push(I('Charge to the Class | | Name | Title'));
    if (c.has('honors')) items.push(I('Presentation of Honors and Awards | | Name | Title'));
    if (c.has('scholarships')) items.push(I('Presentation of Scholarships | | Name | Title'));
    if (college) items.push(I('Presentation of Candidates | | Name | Title'), I('Conferring of Degrees | | Name | Title'));
    else items.push(I('Presentation of Diplomas | | Name | Title'));
    if (c.has('tassel')) items.push(I('Turning of the Tassels |'));
    if (c.has('alma')) items.push(I('+ Class Song or Alma Mater |'));
    if (c.has('benediction')) items.push(I('+ Benediction | | Name | Title'));
    if (c.has('recessional')) items.push(I('+ Recessional | | Music'));
    sections.push({ h: college ? 'Commencement Exercises' : 'Order of Ceremony', items });

    if (p.has('graduates')) {
      const group = ['## College or School Name', '^ Dean Name, Title', '[columns 2]', '## Degree and Major', 'Graduate Name | Hometown, ST', 'Graduate Name | Hometown, ST', 'Graduate Name | Hometown, ST', '[/columns]'];
      if (college) {
        sections.push(rawSection('Undergraduate Degree Candidates', group));
        sections.push(rawSection('Graduate Degree Candidates', group));
      } else {
        sections.push(rawSection('The Graduates', ['[columns 3]', 'Graduate Name', 'Graduate Name', 'Graduate Name', 'Graduate Name', 'Graduate Name', 'Graduate Name', '[/columns]']));
      }
    }
    if (p.has('honorsKey')) sections.push(rawSection('Honors', ['* Summa Cum Laude', '† Magna Cum Laude', '‡ Cum Laude']));
    if (p.has('honorGrads')) sections.push({ h: 'Honor Graduates', items: [I('Valedictorian | | Name'), I('Salutatorian | | Name')] });
    if (p.has('awardsList')) sections.push({ h: 'Awards and Scholarships', items: [I('Award Name | | Student Name'), I('Scholarship Name | | Student Name')] });
    if (p.has('faculty')) sections.push(rawSection('Faculty, Staff and Board', ['## Board of Directors', '[columns 3]', 'Name', 'Name', 'Name', '[/columns]', '## Faculty and Staff', '[columns 3]', 'Name', 'Name', 'Name', '[/columns]']));
    if (p.has('motto')) sections.push({ h: 'Our Class', items: [I('Class Motto | | Words'), I('Class Colors | | Colors'), I('Class Flower | | Flower')] });
    if (p.has('hymn')) sections.push(rawSection('School Hymn', ['^ First line of the hymn', '^ Second line of the hymn', '^ Third line of the hymn', '^ Fourth line of the hymn']));
    if (p.has('thanks')) sections.push(rawSection('Congratulations', ['Congratulations, graduates! Thank you to the families, teachers and friends who made this day possible.']));
    return { name: 'Graduation Ceremony', title: college ? 'Commencement Exercises' : 'Commencement', subtitle: college ? '' : 'Class of 2026', sections, sheetMode: 'program' };
  }

  function buildPlay(a) {
    const x = new Set(a.playExtras || []);
    const sections = [];
    if (x.has('cast')) sections.push({ h: 'Cast', items: [I('Character | | Student Name'), I('Character | | Student Name'), I('Character | | Student Name')] });
    if (x.has('scenes')) sections.push({ h: 'Scenes', items: [I('Act I | | Setting'), I('Act II | | Setting')] });
    if (x.has('crew')) sections.push({ h: 'Crew', items: [I('Director | | Name'), I('Stage Manager | | Name')] });
    if (x.has('director')) sections.push(rawSection('A Note from the Director', ['Add the director\'s note here.']));
    if (x.has('sponsors')) sections.push(SPONSORS);
    if (x.has('upcoming')) sections.push(UPCOMING);
    if (x.has('thanks')) sections.push(rawSection('Thank You', ['Thank you to everyone who made this production possible.']));
    return { name: 'Play Program', title: 'The School Play', subtitle: '', sections, sheetMode: 'program' };
  }

  function buildAwards(a) {
    const x = new Set(a.awardsExtras || []);
    const items = [];
    if (x.has('welcome')) items.push(I('Welcome | | Name'));
    items.push(I('Presentation of Awards |'));
    if (x.has('students')) items.push(I('Student Remarks | | Name'));
    items.push(I('Closing Remarks | | Name'));
    const sections = [{ h: 'Program', items }];
    if (x.has('winners')) sections.push({ h: 'Award Winners', items: [I('Award Name | | Student Name'), I('Award Name | | Student Name')] });
    if (x.has('sponsors')) sections.push(SPONSORS);
    if (x.has('thanks')) sections.push(rawSection('Thank You', ['Thank you to everyone who made tonight possible.']));
    return { name: 'Awards Program', title: 'Awards Night', subtitle: '', sections, sheetMode: 'program' };
  }

  function buildSchool(a) {
    const b = a.kind === 'recital' ? buildRecital(a) : a.kind === 'graduation' ? buildGraduation(a)
      : a.kind === 'play' ? buildPlay(a) : a.kind === 'awards' ? buildAwards(a) : buildConcert(a);
    const r = render(b.sections, () => true, false, null);
    return { name: b.name, title: b.title, subtitle: b.subtitle, body: r.body, sheetMode: b.sheetMode, outline: r.outline };
  }

  // A sensible starting cover for each kind of program (the person can change it).
  function coverFor(type, a) {
    const art = (id) => ({ kind: 'builtin', id });
    const none = { kind: 'none', id: '' };
    if (type === 'funeral') return { style: 'framed', art: art('cross') };
    if (type === 'wedding') return { style: 'framed', art: art('flower') };
    if (type === 'school') {
      // Concerts, recitals and graduations get a formal Traditional cover: logo and name on top,
      // the title and performers in the middle, the place and date at the bottom.
      if (a.kind === 'graduation') return { style: 'traditional', art: none, footer: 'Place of the ceremony' };
      if (a.kind === 'concert') return { style: 'traditional', art: none, intro: 'presents', middle: 'with the\n**Ensemble Name**\nConductor Name, conductor', footer: 'Venue name' };
      if (a.kind === 'recital') return { style: 'traditional', art: none, intro: 'presents', middle: '', footer: 'Venue name' };
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
