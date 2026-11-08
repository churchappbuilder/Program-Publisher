'use strict';

// Starter templates shown in the start screen's gallery. Each can be customized afterwards.
// category: 'church' | 'school' | 'both'
// Body markup:  # Heading | Label | Detail | + stand | > instruction |
//               Leader: / People: | - bullet | [notes] | === (new page)
const SERVICE_TYPES = [
  {
    id: 'morning', category: 'church', label: 'Morning service', name: 'Sunday Morning Worship',
    desc: 'Welcome, worship, Scripture and sermon, offering, benediction.',
    title: 'Sunday Morning Worship', subtitle: '',
    body: `# Welcome
Welcome & Announcements |

# Gathering
Prelude |
+ Call to Worship |
> Please stand.
Leader: The Lord be with you.
People: And also with you.
+ Opening Hymn | | Number
Prayer of Invocation |

# The Word
Scripture Reading | | Passage
Sermon | | Pastor
+ Closing Hymn | | Number

# Sending
Offering |
Benediction |
Postlude |

# Announcements
- First announcement
- Second announcement`
  },
  {
    id: 'evening', category: 'church', label: 'Evening service', name: 'Sunday Evening Service',
    desc: 'A shorter order for an evening gathering.',
    title: 'Sunday Evening Service', subtitle: '',
    body: `# Order of Service
Welcome |
Opening Song |
Prayer |
Scripture Reading | | Passage
Message | | Speaker
Closing Song |

# Announcements
- First announcement`
  },
  {
    id: 'wednesday', category: 'church', label: 'Wednesday / midweek', name: 'Wednesday Night Service',
    desc: 'Worship, prayer requests and Bible study.',
    title: 'Wednesday Night Service', subtitle: '',
    body: `# Order of Service
Welcome |
Worship |
Prayer Requests |
Bible Study | | Passage
Closing Prayer |`
  },
  {
    id: 'communion', category: 'church', label: 'Communion Sunday', name: 'Communion Service',
    desc: 'A morning service that includes the Lord\'s Supper.',
    title: 'Communion Sunday', subtitle: 'The Lord\'s Supper',
    body: `# Gathering
Prelude |
+ Call to Worship |
+ Opening Hymn | | Number
Prayer of Confession |
Assurance of Pardon | | Passage

# The Word
Scripture Reading | | Passage
Sermon | | Pastor
+ Apostles' Creed |

# The Lord's Supper
Invitation to the Table |
Prayer of Thanksgiving |
Institution of the Lord's Supper |
Communion | | Hymn

# Sending
+ Closing Hymn | | Number
Benediction |`
  },
  {
    id: 'christmas', category: 'church', label: 'Christmas Eve', name: 'Christmas Eve Service',
    desc: 'Lessons, carols and candlelight.',
    title: 'Christmas Eve', subtitle: 'Lessons and Carols',
    body: `# Gathering
Prelude |
+ Processional Carol | | Number
Welcome |

# Lessons and Carols
First Lesson | | Genesis 3:8-15
+ Carol | | Number
Second Lesson | | Isaiah 9:2, 6-7
+ Carol | | Number
Third Lesson | | Luke 1:26-38
+ Carol | | Number
Fourth Lesson | | Luke 2:1-20
Message | | Pastor

# Candlelight
+ Silent Night | | Number
Benediction |
Postlude |`
  },
  {
    id: 'funeral', category: 'church', label: 'Funeral / memorial', name: 'Funeral Service',
    desc: 'A service of remembrance with committal.',
    title: 'In Loving Memory', subtitle: 'Full Name · Birth Year – Death Year',
    body: `# Order of Service
Prelude |
Welcome |
+ Opening Hymn | | Number
Scripture Reading | | Passage
Obituary |
Eulogy |
Message of Comfort |
Committal |
Benediction |
Recessional |

# Family
Pallbearers |
Interment | | Cemetery`
  },
  {
    id: 'wedding', category: 'church', label: 'Wedding ceremony', name: 'Wedding Ceremony',
    desc: 'Processional, vows, rings and recessional.',
    title: 'The Wedding of', subtitle: 'Bride & Groom',
    body: `# Order of Ceremony
Prelude |
Processional |
Welcome |
Prayer |
Scripture Reading | | Passage
Exchange of Vows |
Exchange of Rings |
Unity Candle |
Pronouncement |
Recessional |

# Wedding Party
Officiant | | Name`
  },
  {
    id: 'school', category: 'school', label: 'Concert program', name: 'Concert Program',
    desc: 'Pieces with composers and dates, ready for band, choir or orchestra.',
    title: 'Spring Concert', subtitle: '', sheetMode: 'concert',
    body: `# Program
Piece Title | | Composer Name (1732–1809)
Piece Title | arr. Arranger | Composer Name (b. 1978)
Piece Title | | Traditional

# Thank You
Thank you for joining us.`
  },
  {
    id: 'recital', category: 'school', label: 'Recital', name: 'Recital Program',
    desc: 'Soloists and their pieces.',
    title: 'Student Recital', subtitle: '', sheetMode: 'concert',
    body: `# Program
Piece Title | Performer | Composer Name (1685–1750)
Piece Title | Performer | Composer Name (1770–1827)
Piece Title | Performer | Composer Name (b. 1960)

# Thank You
Thank you to our teachers, families and friends.`
  },
  {
    id: 'graduation', category: 'school', label: 'Graduation', name: 'Graduation Ceremony',
    desc: 'Processional, addresses, diplomas and recessional.',
    title: 'Commencement', subtitle: 'Class of 2026',
    body: `# Ceremony
Processional |
Welcome | | Name
Invocation | | Name
Student Address | | Name
Keynote Address | | Name
Presentation of Diplomas | | Name
Alma Mater |
Benediction | | Name
Recessional |

# Graduates
Add the graduates' names here, one per line.`
  },
  {
    id: 'play', category: 'school', label: 'Play or musical', name: 'Play Program',
    desc: 'Cast, scenes and crew.',
    title: 'The School Play', subtitle: '',
    body: `# Cast
Character | | Student Name
Character | | Student Name
Character | | Student Name

# Scenes
Act I | | Setting
Act II | | Setting

# Crew
Director | | Name
Stage Manager | | Name

# Thank You
Thank you to everyone who made this production possible.`
  },
  {
    id: 'awards', category: 'school', label: 'Awards night', name: 'Awards Program',
    desc: 'Welcome, awards and recognition.',
    title: 'Awards Night', subtitle: '',
    body: `# Program
Welcome | | Name
Presentation of Awards |
Closing Remarks | | Name

# Award Winners
Award Name | | Student Name
Award Name | | Student Name`
  },
  {
    id: 'general', category: 'both', label: 'Blank / other', name: 'New Program',
    desc: 'Start from a simple blank order.',
    title: 'Program Title', subtitle: '',
    body: `# Order of Program
Item one |
Item two |
Item three |`
  }
];

module.exports = { SERVICE_TYPES };
