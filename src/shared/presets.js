'use strict';

// Starter content for each kind of service. Users edit this per template.
const SERVICE_TYPES = [
  {
    id: 'morning', label: 'Morning service', name: 'Sunday Morning Worship',
    title: 'Sunday Morning Worship', subtitle: '',
    items: ['Prelude', 'Welcome & Announcements', 'Call to Worship', 'Opening Hymn', 'Scripture Reading', 'Message', 'Offering', 'Closing Hymn', 'Benediction']
  },
  {
    id: 'evening', label: 'Evening service', name: 'Sunday Evening Service',
    title: 'Sunday Evening Service', subtitle: '',
    items: ['Welcome', 'Opening Song', 'Prayer', 'Scripture Reading', 'Message', 'Closing Song']
  },
  {
    id: 'wednesday', label: 'Wednesday / midweek', name: 'Wednesday Night Service',
    title: 'Wednesday Night Service', subtitle: '',
    items: ['Welcome', 'Worship', 'Prayer Requests', 'Bible Study', 'Closing Prayer']
  },
  {
    id: 'funeral', label: 'Funeral / memorial', name: 'Funeral Service',
    title: 'In Loving Memory', subtitle: 'Full Name · Birth Year – Death Year',
    items: ['Prelude', 'Welcome', 'Opening Hymn', 'Scripture Reading', 'Obituary', 'Eulogy', 'Message of Comfort', 'Committal', 'Benediction', 'Recessional']
  },
  {
    id: 'wedding', label: 'Wedding ceremony', name: 'Wedding Ceremony',
    title: 'The Wedding of', subtitle: 'Bride & Groom',
    items: ['Prelude', 'Processional', 'Welcome', 'Prayer', 'Scripture Reading', 'Exchange of Vows', 'Exchange of Rings', 'Unity Candle', 'Pronouncement', 'Recessional']
  },
  {
    id: 'school', label: 'School program', name: 'School Program',
    title: 'Spring Program', subtitle: '',
    items: ['Welcome', 'Opening Remarks', 'Student Performances', 'Awards', 'Closing Remarks']
  },
  {
    id: 'general', label: 'Blank / other', name: 'New Bulletin',
    title: 'Bulletin Title', subtitle: '',
    items: ['Item one', 'Item two', 'Item three']
  }
];

module.exports = { SERVICE_TYPES };
