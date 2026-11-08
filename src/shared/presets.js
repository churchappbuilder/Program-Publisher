'use strict';

// Starter content for each kind of service. Users edit this per template.
// Body markup:  # Heading | Label | Detail | + stand | > instruction |
//               Leader: / People: | - bullet | [notes] | === (new page)
const SERVICE_TYPES = [
  {
    id: 'morning', label: 'Morning service', name: 'Sunday Morning Worship',
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
    id: 'evening', label: 'Evening service', name: 'Sunday Evening Service',
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
    id: 'wednesday', label: 'Wednesday / midweek', name: 'Wednesday Night Service',
    title: 'Wednesday Night Service', subtitle: '',
    body: `# Order of Service
Welcome |
Worship |
Prayer Requests |
Bible Study | | Passage
Closing Prayer |`
  },
  {
    id: 'funeral', label: 'Funeral / memorial', name: 'Funeral Service',
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
    id: 'wedding', label: 'Wedding ceremony', name: 'Wedding Ceremony',
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
    id: 'school', label: 'School / concert program', name: 'Concert Program',
    title: 'Spring Concert', subtitle: '', sheetMode: 'concert',
    body: `# Program
Piece Title | | Composer Name (1732–1809)
Piece Title | arr. Arranger | Composer Name (b. 1978)
Piece Title | | Traditional

# Thank You
Thank you for joining us.`
  },
  {
    id: 'general', label: 'Blank / other', name: 'New Program',
    title: 'Program Title', subtitle: '',
    body: `# Order of Program
Item one |
Item two |
Item three |`
  }
];

module.exports = { SERVICE_TYPES };
