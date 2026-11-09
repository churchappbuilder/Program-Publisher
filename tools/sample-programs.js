'use strict';

// Made-up churches and schools, and realistic sample programs for them. Used to make the pictures on
// the project's website (tools/make-gallery.js) and the app screenshots (tools/make-screenshots.js).
// Every name, date and logo here is invented. The logos are original drawings.

const { BUILTIN_TEXTS } = require('../src/shared/texts');

const text = (id) => BUILTIN_TEXTS.find((t) => t.id === id).body.replace(/^##[^\n]*\n/, '').trim();

// ---------- original logos (SVG) ----------
const shieldSvg = (c1, c2, symbol) => {
  const sym = {
    cross: `<path d="M46 32h8v22h20v8H54v30h-8V62H26v-8h20z" fill="${c2}"/>`,
    book: `<path d="M24 46c10-4 20-3 26 3 6-6 16-7 26-3v32c-10-4-20-3-26 3-6-6-16-7-26-3z" fill="${c2}"/><path d="M50 49v32" stroke="${c1}" stroke-width="2"/>`,
    star: `<path d="M50 30l7 17 18 1-14 11 5 18-16-10-16 10 5-18-14-11 18-1z" fill="${c2}"/>`,
    flame: `<path d="M50 28c4 12 20 20 18 38-1 12-9 22-18 24-9-2-17-12-18-24-2-14 8-18 10-30 3 5 6 0 8-8z" fill="${c2}"/>`
  }[symbol];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 4L94 18v40c0 30-22 50-44 58C28 108 6 88 6 58V18z" fill="${c1}"/>` +
    `<path d="M50 12l36 12v34c0 24-18 41-36 49-18-8-36-25-36-49V24z" fill="none" stroke="${c2}" stroke-width="3"/>${sym}</svg>`;
};

const sealSvg = (c1, c2, letters) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="${c1}"/>` +
  `<circle cx="60" cy="60" r="50" fill="none" stroke="${c2}" stroke-width="2"/><circle cx="60" cy="60" r="38" fill="none" stroke="${c2}" stroke-width="1.5"/>` +
  `<text x="60" y="71" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="${c2}">${letters}</text>` +
  [0, 60, 120, 180, 240, 300].map((a) => `<circle cx="60" cy="${60 - 44}" r="2.2" fill="${c2}" transform="rotate(${a} 60 60)"/>`).join('') + '</svg>';

const bannerSvg = (c1, c2, label, sub) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 70"><path d="M2 8h316l-14 27 14 27H2l14-27z" fill="${c1}"/>` +
  `<text x="160" y="${sub ? 36 : 43}" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="700" letter-spacing="3" fill="${c2}">${label}</text>` +
  (sub ? `<text x="160" y="54" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="4" fill="${c2}">${sub}</text>` : '') + '</svg>';

const dataUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// ---------- made-up organizations ----------
const ORGS = {
  grace: { name: 'Grace Community Church', kind: 'church', tagline: 'A place to belong', address: '412 Maple Avenue, Springfield', phone: '(555) 010-2468', website: 'gracecommunity.example',
    primary_color: '#1f3a5f', accent_color: '#b08d3c', heading_font: 'Georgia', body_font: 'Segoe UI',
    logos: [{ name: 'Shield', role: 'shield', svg: shieldSvg('#1f3a5f', '#d8b45a', 'cross') }, { name: 'Banner', role: 'banner', svg: bannerSvg('#1f3a5f', '#d8b45a', 'GRACE', 'COMMUNITY CHURCH') }] },
  covenant: { name: 'Covenant Presbyterian Church', kind: 'church', tagline: 'Reformed and always reforming', address: '88 College Street, Riverton', phone: '(555) 010-7731', website: 'covenantpres.example',
    primary_color: '#7a1f2b', accent_color: '#b08d3c', heading_font: 'Palatino Linotype', body_font: 'Georgia',
    logos: [{ name: 'Seal', role: 'seal', svg: sealSvg('#7a1f2b', '#e8cf8a', 'CPC') }] },
  aidan: { name: 'St. Aidan’s Anglican Church', kind: 'church', tagline: 'Ancient faith, living worship', address: '7 Abbey Lane, Marlow', phone: '(555) 010-3392', website: 'staidans.example',
    primary_color: '#1e4d3a', accent_color: '#b89a52', heading_font: 'Cambria', body_font: 'Cambria',
    logos: [{ name: 'Crest', role: 'shield', svg: shieldSvg('#1e4d3a', '#e2cf9b', 'book') }] },
  redeemer: { name: 'Redeemer Lutheran Church', kind: 'church', tagline: 'Gathered by grace, sent in love', address: '1520 Lakeshore Drive, Eastport', phone: '(555) 010-5518', website: 'redeemerlc.example',
    primary_color: '#3b2a63', accent_color: '#c9a24a', heading_font: 'Constantia', body_font: 'Constantia',
    logos: [{ name: 'Seal', role: 'seal', svg: sealSvg('#3b2a63', '#e6c978', 'RLC') }] },
  wesley: { name: 'Wesley Chapel United Methodist Church', kind: 'church', tagline: 'Open hearts. Open minds. Open doors.', address: '230 Church Street, Fairview', phone: '(555) 010-9047', website: 'wesleychapel.example',
    primary_color: '#9a2a24', accent_color: '#c79a2f', heading_font: 'Georgia', body_font: 'Segoe UI',
    logos: [{ name: 'Flame', role: 'shield', svg: shieldSvg('#9a2a24', '#f0cf7a', 'flame') }] },
  heritage: { name: 'Heritage University', kind: 'school', tagline: 'Division of Music', address: '2300 University Drive, Highland', phone: '(555) 010-6600', website: 'heritage.example',
    primary_color: '#16284a', accent_color: '#9a7b2f', heading_font: 'Georgia', body_font: 'Georgia',
    logos: [{ name: 'Crest', role: 'shield', svg: shieldSvg('#16284a', '#e6d3a1', 'book') }] },
  cornerstone: { name: 'Cornerstone Christian Academy', kind: 'school', tagline: 'Pursuing truth with wisdom', address: '905 Orchard Road, Fairview', phone: '(555) 010-4120', website: 'cornerstoneacademy.example',
    primary_color: '#14507a', accent_color: '#d19a2a', heading_font: 'Georgia', body_font: 'Segoe UI',
    logos: [{ name: 'Seal', role: 'seal', svg: sealSvg('#14507a', '#f2c45a', 'CCA') }] }
};

// ---------- sample programs ----------
const EXAMPLES = [
  {
    id: 'presbyterian', org: 'covenant', group: 'Church', label: 'Presbyterian worship', blurb: 'Formal order of worship with hymns, the creed and the Lord’s Prayer.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Lord’s Day Worship', subtitle: 'The Twenty-Fourth Sunday after Pentecost', date: 'November 8, 2026',
      cover: { style: 'headerfooter', show: { address: true }, footer: 'Worship at 8:30 and 11:00 am' },
      body: `> ▲ Please stand if you are able.

# The Lord Calls Us into His Presence
Prelude | “Jesus, Priceless Treasure” | J. S. Bach
Welcome & Announcements | | Rev. Daniel Hart
+ Call to Worship | | Psalm 95:1–7
+ Opening Hymn | O Worship the King | 98
Invocation | | Rev. Daniel Hart

# The Lord Cleanses Us in His Son
Call to Confession | | Romans 3:21–26
Prayer of Confession |
Assurance of Pardon | | 1 John 1:9
+ Gloria Patri | | 735

# The Lord Consecrates Us with His Word
Prayer for Illumination |
Scripture Reading | | Mark 4:35–41
Sermon | “Who Then Is This?” | Rev. Daniel Hart
+ The Apostles’ Creed |

${text('apostles-creed')}

+ Hymn of Response | Be Thou My Vision | 445

# The Lord Receives Our Offerings
Offering |
Anthem | “Come, Thou Fount” | Sanctuary Choir
+ Doxology | | 731
Pastoral Prayer and the Lord’s Prayer |

# The Lord Commissions Us
+ Closing Hymn | A Mighty Fortress Is Our God | 91
Benediction |
Postlude | | Fanfare in D

# Announcements
- Fellowship lunch after the 11:00 service in Johnson Hall.
- Men’s breakfast Saturday at 7:30 am.
- Please pray for our missionaries in Peru, the Alvarez family.`
    }
  },
  {
    id: 'anglican', org: 'aidan', group: 'Church', label: 'Anglican Holy Eucharist', blurb: 'Full liturgy with Celebrant and People parts, in bold where the congregation speaks.',
    format: 'letter-bifold', color: 'ivory',
    content: {
      title: 'Holy Eucharist', subtitle: 'Rite II', date: 'Sunday, November 8, 2026',
      cover: { style: 'traditional', middle: 'The Twenty-Fourth Sunday after Pentecost\nProper 27', footer: '10:00 am · The Sanctuary' },
      body: `> ▲ Please stand if you are able.

# The Gathering of the Community
Prelude | “Rhosymedre” | Ralph Vaughan Williams
+ Processional Hymn | Come, Thou Fount of Every Blessing | 686
+ Opening Acclamation |
Celebrant: Blessed be God: Father, Son, and Holy Spirit.
People: And blessed be his kingdom, now and for ever. Amen.

+ Collect for Purity |

${text('collect-for-purity')}

+ Song of Praise | Glory to God in the highest | S 280
+ Collect of the Day |
Celebrant: The Lord be with you.
People: And with thy spirit.

# The Word of God
First Reading | | Amos 5:18–24
Psalm | | Psalm 70
Second Reading | | 1 Thessalonians 4:13–18
+ Sequence Hymn | Lift High the Cross | 473
+ The Gospel | | Matthew 25:1–13
Sermon | | The Rev. Elizabeth Marsh
+ The Nicene Creed |

${text('nicene-creed')}

Prayers of the People |
Confession and Absolution |
The Peace |

# The Holy Communion
Offertory Hymn | O Love, How Deep, How Broad | 448
Anthem | “Ubi Caritas” | Maurice Duruflé
The Great Thanksgiving |

${text('sursum-corda')}

Sanctus |
The Lord’s Prayer |
Communion | | Hymns 335 and 304
Prayer after Communion |

# The Sending
Blessing |
+ Closing Hymn | Eternal Father, Strong to Save | 608
Dismissal |
Postlude | | Fugue in G minor`
    }
  },
  {
    id: 'lutheran', org: 'redeemer', group: 'Church', label: 'Lutheran Holy Communion', blurb: 'Gathering, Word, Meal and Sending, with the hymnal numbers Lutherans use.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Holy Communion', subtitle: 'Reformation Sunday', date: 'October 25, 2026',
      cover: { style: 'banner', art: { kind: 'builtin', id: 'flame' }, footer: 'Worship at 9:00 am' },
      body: `> ▲ Please stand if you are able.

# Gathering
Prelude | “A Mighty Fortress” | Johann Walther
Welcome & Announcements |
+ Confession and Forgiveness |
+ Gathering Hymn | A Mighty Fortress Is Our God | ELW 504
+ Greeting |
+ Kyrie |
+ Hymn of Praise | This Is the Feast | ELW p. 138
+ Prayer of the Day |

# Word
First Reading | | Jeremiah 31:31–34
Psalm | | Psalm 46
Second Reading | | Romans 3:19–28
+ Gospel Acclamation |
+ Gospel | | John 8:31–36
Sermon | | Pastor Karen Lindqvist
+ Hymn of the Day | Salvation unto Us Has Come | ELW 590
+ The Nicene Creed |
+ Prayers of Intercession |
+ The Peace |

# Meal
Offering |
Anthem | “Ein feste Burg” | Chancel Choir
+ Great Thanksgiving |
+ Holy, Holy, Holy |
+ The Lord’s Prayer |
+ Invitation to Communion |
Communion | | ELW 472 and 485
+ Lamb of God |
+ Prayer after Communion |

# Sending
+ Blessing |
+ Sending Hymn | Lord, Keep Us Steadfast in Your Word | ELW 517
+ Dismissal |
Postlude | | Toccata on “Ein feste Burg”`
    }
  },
  {
    id: 'methodist', org: 'wesley', group: 'Church', label: 'Methodist Sunday worship', blurb: 'A responsive call to worship, the Doxology and a prayer of dedication.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Pentecost Sunday', subtitle: 'Come, Holy Spirit', date: 'May 24, 2026',
      cover: { style: 'picture', art: { kind: 'builtin', id: 'flame' }, footer: 'Worship at 10:30 am' },
      body: `> ▲ Please stand if you are able.

# Gathering
Prelude | “Veni Creator Spiritus” | Healey Willan
Welcome & Announcements | | Rev. Marcus Bell
+ Call to Worship |
Leader: The Spirit of the Lord fills the whole world.
People: **Come, Holy Spirit, and fill our hearts.**
Leader: Like a mighty wind and tongues of fire,
People: **Come, Holy Spirit, and fill our hearts.**
Leader: Let us worship God, who makes all things new.
People: **Amen. Alleluia!**
+ Opening Hymn | Spirit of the Living God | UMH 393
+ Gathering Prayer |
+ Passing of the Peace |

# Proclamation and Response
First Lesson | | Acts 2:1–21
Gospel Lesson | | John 20:19–23
+ Hymn of Preparation | Breathe on Me, Breath of God | UMH 503
Sermon | “Fire in the Bones” | Rev. Marcus Bell
Anthem | “Spirit of God, Descend upon My Heart” | Wesley Choir
+ Affirmation of Faith |
Pastoral Prayer and the Lord’s Prayer |

# Offering and Sending Forth
Offertory | | Maria Santos, piano
+ Doxology | | UMH 95
+ Prayer of Dedication |
+ Closing Hymn | Come, Holy Ghost, Our Hearts Inspire | UMH 651
+ Benediction |
Postlude | | “Hail, Thou Once Despised Jesus”`
    }
  },
  {
    id: 'christmas', org: 'grace', group: 'Church', label: 'Christmas Eve', blurb: 'Lessons and carols with seasonal art on the cover, printed on cream paper.',
    format: 'letter-bifold', color: 'cream',
    content: {
      title: 'Christmas Eve', subtitle: 'A Service of Lessons and Carols', date: 'Thursday, December 24, 2026 · 7:00 pm',
      cover: { style: 'picture', art: { kind: 'builtin', id: 'star' }, quote: 'For unto us a child is born. Isaiah 9:6' },
      body: `# Gathering
Prelude | “Carol Fantasy” | Grace Community Orchestra
+ Processional Carol | O Come, All Ye Faithful | 252
Welcome |

# Lessons and Carols
First Lesson | | Genesis 3:8–15
+ Carol | Once in Royal David’s City | 250
Second Lesson | | Isaiah 9:2, 6–7
+ Carol | O Little Town of Bethlehem | 230
Third Lesson | | Luke 1:26–38
Carol | “The Angel Gabriel from Heaven Came” | Children’s Choir
Fourth Lesson | | Luke 2:1–20
+ Carol | Hark! The Herald Angels Sing | 240
Message | | Pastor Ruth Alvarez

# Candlelight
+ Silent Night | | 265
Benediction |
Postlude | | “Joy to the World”

# Announcements
- Christmas Day worship is at 10:00 am. Come in your pajamas!
- Pick up a gift for a neighbor in need from the Giving Tree in the lobby.`
    }
  },
  {
    id: 'funeral', org: 'grace', group: 'Church', label: 'Funeral service', blurb: 'A quiet, framed cover and a complete order of service for a memorial.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'In Loving Memory of', subtitle: 'Margaret Ellen Whitaker', date: '1938 – 2026',
      cover: { style: 'framed', art: { kind: 'builtin', id: 'cross' }, quote: 'Precious in the sight of the Lord is the death of his saints. Psalm 116:15', footer: 'Saturday, November 14, 2026 · 11:00 am' },
      body: `> ▲ Please stand if you are able.

# Order of Service
Prelude | | Gail Moreno, organ
Welcome | | Pastor Ruth Alvarez
+ Call to Worship | | Psalm 23
+ Opening Hymn | Be Thou My Vision | 445
Invocation |
Scripture Reading | | John 14:1–6
Obituary |
Tribute | | Her grandson, Thomas
Special Music | “It Is Well with My Soul” | Elena Park, soloist
Message of Comfort | | Pastor Ruth Alvarez
+ The Apostles’ Creed |
Prayer and the Lord’s Prayer |
+ Closing Hymn | Amazing Grace | 275
Committal | | Pastor Ruth Alvarez
Benediction |
Recessional |

# Obituary
Margaret Ellen Whitaker was born in Springfield on March 3, 1938. She taught third grade for thirty-one years, sang alto in the church choir for fifty, and never met a casserole she could not improve. She is survived by her husband of sixty-three years, Robert; her children, Susan and David; and five grandchildren.

# Pallbearers
[columns 2]
Thomas Whitaker
Michael Whitaker
Daniel Reyes
Samuel Park
[/columns]

# Interment
Springfield Memorial Gardens, followed by a luncheon in the fellowship hall.`
    }
  },
  {
    id: 'wedding', org: 'grace', group: 'Church', label: 'Wedding ceremony', blurb: 'A framed cover and the order of the ceremony with the wedding party.',
    format: 'letter-bifold', color: 'ivory',
    content: {
      title: 'The Wedding of', subtitle: 'Emily Rose Carter & Daniel James Hughes', date: 'Saturday, June 13, 2026 · 2:00 pm',
      cover: { style: 'framed', art: { kind: 'builtin', id: 'flower' }, quote: 'Love is patient, love is kind. 1 Corinthians 13:4' },
      body: `# Order of Ceremony
Prelude | | Gail Moreno, organ
Seating of Family |
Processional | “Trumpet Voluntary” | Jeremiah Clarke
Welcome and Call to Worship |
+ Hymn | Love Divine, All Loves Excelling | 366
Prayer |
Scripture Reading | | 1 Corinthians 13
Message | | Pastor Ruth Alvarez
Exchange of Vows |
Exchange of Rings |
Unity Candle |
Pronouncement |
Blessing and Benediction |
Recessional | “Ode to Joy” | Beethoven

# The Wedding Party
Officiant | | Pastor Ruth Alvarez
Maid of Honor | | Hannah Carter
Best Man | | Jonathan Hughes
Bridesmaids | | Olivia Reyes, Grace Park, Lily Moore
Groomsmen | | Caleb Hughes, Noah Carter, Ethan Moore
Flower Girl | | Ava Reyes
Ring Bearer | | Mason Carter

# Reception
Fellowship Hall, immediately following the ceremony.`
    }
  },
  {
    id: 'graduation', org: 'heritage', group: 'School', label: 'College commencement', blurb: 'Baccalaureate and commencement orders, then degree candidates by college with hometowns.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Commencement Exercises', subtitle: '', date: 'Saturday, May 16, 2026 · 10:00 a.m.',
      cover: { style: 'traditional', watermark: true, intro: 'Class of 2026', middle: 'Conferring of Degrees\nUndergraduate and Graduate', footer: 'The University Arena' },
      body: `> ▲ Please stand if you are able.

# Welcome
^ The administration, faculty and staff of Heritage University extend a warm welcome to the families and friends of this graduating class.

# Commencement Exercises
^ Presiding: Dr. Evelyn Park, President
+ Processional | “Pomp and Circumstance” | Edward Elgar
+ National Anthem | | University Choir
Welcome | | Dr. Evelyn Park | President
Invocation | | Rev. Thomas Lindgren | Chaplain
Student Address | | Sarah Michelle Brooks | Class President
Commencement Address | | Dr. Michael Ortega | Chairman of the Board
Presentation of Candidates | | Dr. Laura Chen | Provost
Conferring of Degrees | | Dr. Evelyn Park | President
+ Alma Mater | | University Choir
+ Benediction | | Rev. Thomas Lindgren | Chaplain
+ Recessional | | University Brass

# Undergraduate Degree Candidates
## College of Arts and Sciences
^ Dr. Laura Chen, Dean
[columns 2]
## Bachelor of Arts in English
Jack Aaron Bovay | Peoria, IL
Anna Grace Morken | Dallas, TX
Natalie Elisabeth Zwolanek | Omaha, NE
Peter James Alvarez | Tucson, AZ
Rebecca Joy Marsh | Madison, WI
Daniel Thomas Keller | Denver, CO
## Bachelor of Science in Biology
Hannah Louise Park | Seattle, WA
Marcus Andrew Reyes | San Diego, CA
Olivia Grace Bennett | Atlanta, GA
Samuel Joseph Ortiz | Houston, TX
[/columns]
## School of Music
^ Dr. Michael Moore, Dean
[columns 2]
## Bachelor of Music in Voice
Elizabeth Marie Hartley | Springfield, MO
Caleb Matthew Stone | Nashville, TN
Grace Ellen Whitaker | Lancaster, PA
## Bachelor of Music in Piano Pedagogy
Joshua David Kim | Portland, OR
Abigail Ruth Foster | Raleigh, NC
[/columns]

# Graduate Degree Candidates
## School of Education
^ Dr. Robert Ellison, Dean
[columns 2]
## Master of Education in Teaching and Learning
Rachel Anne Hollis | Fort Worth, TX
Timothy Paul Nguyen | Phoenix, AZ
Lydia Christine Barnes | Columbus, OH
Andrew Michael Cole | Chicago, IL
[/columns]

# Honors
* Summa Cum Laude
† Magna Cum Laude
‡ Cum Laude`
    }
  },
  {
    id: 'orchestra', org: 'heritage', group: 'School', label: 'Orchestra concert', blurb: 'Composers and dates stacked beside each piece, with the orchestra listed by section.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Winter Concert', subtitle: '', date: 'Friday, December 5, 2025 · 7:30 p.m.',
      cover: { style: 'traditional', intro: 'presents', middle: 'with the\n**UNIVERSITY SYMPHONY ORCHESTRA**\nMichael Moore, conductor', footer: 'Rodeheaver Auditorium' },
      body: `# Program
Polonaise from *Christmas Eve Suite* | | Nikolai Rimsky-Korsakov (1844–1908)
Overture on French Carols | | Philip Lane (b. 1950)
Farandole from *L’Arlésienne*, Suite No. 2 | | Georges Bizet (1838–1875)
Sleigh Ride | | Frederick Delius (1862–1934)
Silent Night | | Franz Xaver Gruber (1787–1863) | arr. Richard Kaufman
Pas de deux from *The Nutcracker* | | Pyotr Ilyich Tchaikovsky (1840–1893)
  Intrada
  Variation I
  Coda

# Personnel
## University Symphony Orchestra
[columns 3]
## Violin I
Eric Probst
Elizabeth Dorey
Micah Hyink
Laura Roland
## Violin II
Kate Watson
Adelyn Newton
Lincoln Buchanan
## Viola
Abby Blake
Mike Hou
Anna Heinrich
## Cello
Benjamin Hyink
Luke Probus
Caleb Aniol
## Bass
Luke Bomar
Christian Loeffler
## Flute
Emily Tuttle
Joelle Russell
## Oboe
Ashley Darst
Leah Bedard
## Clarinet
Aaron Steel
Tim Lauriault
## Horn
Stefan Gradwell
Tim Bedard
## Trumpet
Jon Freeman
Trevor Lyons
## Percussion
Noah Broadwell
Salem Eoute
[/columns]

*Please silence all cell phones and other electronic devices before the performance. Cameras, flash photography and recording devices create distractions and may infringe on copyright law.*

# Upcoming Events
- Strings Chamber Groups, December 6, 3:00 p.m., War Memorial Chapel
- Symphonic Wind Band, December 11, 7:00 p.m., Rodeheaver Auditorium

# Friends and Donors
[columns 2]
Anonymous
Mr. and Mrs. John E. Adair
Dr. and Mrs. Bruce B. Cox
Ms. Annie Ager
Mr. and Mrs. Andrew Clark
Dr. and Mrs. David M. Dersch
Mr. Stephen L. Bomar
[/columns]`
    }
  },
  {
    id: 'recital', org: 'heritage', group: 'School', label: 'Senior recital', blurb: 'Works with sources and movements, Roman-numeral groups and program notes.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'Senior Recital', subtitle: 'Elizabeth Marie Hartley, soprano', date: 'Saturday, April 25, 2026 · 3:00 p.m.',
      cover: { style: 'traditional', intro: 'presents', footer: 'War Memorial Chapel' },
      body: `# Program
^ *Elizabeth Marie Hartley*, soprano
^ *Dr. Samuel Wellman*, piano
^ **I**
Un moto di gioia, K. 579 | from *Le Nozze di Figaro* | Wolfgang Amadeus Mozart (1756–1791)
Ridente la calma | | Wolfgang Amadeus Mozart (1756–1791)
Die Forelle, D. 550 | | Franz Schubert (1797–1828)
Nacht und Träume, D. 827 | | Franz Schubert (1797–1828)
^ *Reagan Allen*, harp
^ **II**
Nuit d’étoiles | | Claude Debussy (1862–1918)
Let Beauty Awake | from *Songs of Travel* | Ralph Vaughan Williams (1872–1958)
It’s All I Have to Bring | | Ernest Bacon (1898–1990)
This Little Rose | | William Roy (1928–2003)

^ This recital is presented in partial fulfillment of the requirements for the degree, Bachelor of Music in Voice.

^ From the studio of Dr. Katherine Moore

*Please silence all cell phones and other electronic devices before the performance.*

===

# Program Notes
## Un moto di gioia
From the opera *Le Nozze di Figaro*, this aria was written after the opera had previously been performed. Mozart wrote two replacement arias for the new actress who would play Susanna.
*An emotion of joy*
*I feel in my heart*
*That says happiness is coming*

## Die Forelle
Written by Franz Schubert, this piece is a dramatic telling of a simple story. The singer is watching as a fisherman sets a trap for a little trout swimming in the brook.
*In a clear brook*
*There darted in joyful haste*
*The capricious trout*`
    }
  },
  {
    id: 'play', org: 'cornerstone', group: 'School', label: 'School play', blurb: 'Cast, scenes and crew for a school production, with a note from the director.',
    format: 'letter-bifold', color: 'white',
    content: {
      title: 'A Midsummer Night’s Dream', subtitle: 'by William Shakespeare', date: 'November 20–21, 2026 · 7:00 p.m.',
      cover: { style: 'picture', art: { kind: 'builtin', id: 'star' }, footer: 'The Cornerstone Theatre' },
      body: `# Cast
Theseus, Duke of Athens | | Gabriel Moore
Hippolyta | | Sophia Reyes
Hermia | | Lily Chen
Lysander | | Caleb Foster
Helena | | Olivia Brooks
Demetrius | | Ethan Park
Oberon | | Noah Bennett
Titania | | Ava Martinez
Puck | | Mason Cole
Bottom | | Jacob Ellison

# Scenes
Act I | | Athens
Act II | | The Forest
Act III | | The Forest
Act IV | | The Forest and Athens
Act V | | The Palace of Theseus

# A Note from the Director
Every year our students surprise us. This production grew out of a spring workshop where they asked a simple question: what would it mean to love without fear? We hope you laugh, and we hope the forest feels as strange and wonderful to you as it did to us.

# Crew
Director | | Mrs. Katherine Ellis
Stage Manager | | Hannah Lee
Lighting | | Samuel Ortiz
Costumes | | Grace Whitaker

# Thank You
Thank you to our families, our faculty and everyone who helped build this production.`
    }
  }
];

module.exports = { ORGS, EXAMPLES, dataUrl, shieldSvg, sealSvg, bannerSvg };
