'use strict';

// Built-in public-domain texts that churches reuse every week.
// Wording is the traditional English used in the Book of Common Prayer (1662)
// and the King James Version (1611), both in the public domain. Churches that
// use a different translation can copy any of these into their own library
// and edit the wording there, so every week uses the same text.
//
// Body markup is the same as the bulletin body (see src/shared/layout.js).

const BUILTIN_TEXTS = [
  {
    id: 'apostles-creed', group: 'Creeds', name: "The Apostles' Creed",
    source: 'Traditional (BCP 1662)',
    body: `## The Apostles' Creed
I believe in God the Father Almighty,
Maker of heaven and earth;

And in Jesus Christ his only Son our Lord;
who was conceived by the Holy Ghost,
born of the Virgin Mary;
suffered under Pontius Pilate,
was crucified, dead, and buried;
he descended into hell;
the third day he rose again from the dead;
he ascended into heaven,
and sitteth on the right hand of God the Father Almighty;
from thence he shall come to judge the quick and the dead.

I believe in the Holy Ghost;
the holy catholic Church;
the communion of saints;
the forgiveness of sins;
the resurrection of the body,
and the life everlasting. Amen.`
  },
  {
    id: 'nicene-creed', group: 'Creeds', name: 'The Nicene Creed',
    source: 'Traditional (BCP 1662), with the filioque',
    body: `## The Nicene Creed
I believe in one God the Father Almighty,
Maker of heaven and earth,
and of all things visible and invisible:

And in one Lord Jesus Christ,
the only-begotten Son of God,
begotten of his Father before all worlds,
God of God, Light of Light,
very God of very God,
begotten, not made,
being of one substance with the Father,
by whom all things were made:

Who for us men and for our salvation
came down from heaven,
and was incarnate by the Holy Ghost of the Virgin Mary,
and was made man;
and was crucified also for us under Pontius Pilate;
he suffered and was buried;
and the third day he rose again according to the Scriptures,
and ascended into heaven,
and sitteth on the right hand of the Father;
and he shall come again, with glory,
to judge both the quick and the dead;
whose kingdom shall have no end.

And I believe in the Holy Ghost,
the Lord and Giver of life,
who proceedeth from the Father and the Son;
who with the Father and the Son together
is worshipped and glorified;
who spake by the Prophets.

And I believe one catholic and apostolic Church;
I acknowledge one Baptism for the remission of sins;
and I look for the Resurrection of the dead,
and the Life of the world to come. Amen.`
  },
  {
    id: 'lords-prayer-debts', group: 'Prayers', name: "The Lord's Prayer (debts)",
    source: 'KJV, Matthew 6:9-13',
    body: `## The Lord's Prayer
Our Father, which art in heaven,
Hallowed be thy name.
Thy kingdom come.
Thy will be done in earth,
as it is in heaven.
Give us this day our daily bread.
And forgive us our debts,
as we forgive our debtors.
And lead us not into temptation,
but deliver us from evil:
For thine is the kingdom, and the power,
and the glory, for ever. Amen.`
  },
  {
    id: 'lords-prayer-trespasses', group: 'Prayers', name: "The Lord's Prayer (trespasses)",
    source: 'Traditional (BCP)',
    body: `## The Lord's Prayer
Our Father, who art in heaven,
hallowed be thy name;
thy kingdom come;
thy will be done,
on earth as it is in heaven.
Give us this day our daily bread.
And forgive us our trespasses,
as we forgive those who trespass against us.
And lead us not into temptation,
but deliver us from evil.
For thine is the kingdom, and the power,
and the glory, for ever and ever. Amen.`
  },
  {
    id: 'ten-commandments', group: 'Law and Gospel', name: 'The Ten Commandments',
    source: 'KJV, Exodus 20:3-17',
    body: `## The Ten Commandments
I. Thou shalt have no other gods before me.

II. Thou shalt not make unto thee any graven image, or any likeness of any thing that is in heaven above, or that is in the earth beneath, or that is in the water under the earth: thou shalt not bow down thyself to them, nor serve them: for I the LORD thy God am a jealous God, visiting the iniquity of the fathers upon the children unto the third and fourth generation of them that hate me; and shewing mercy unto thousands of them that love me, and keep my commandments.

III. Thou shalt not take the name of the LORD thy God in vain; for the LORD will not hold him guiltless that taketh his name in vain.

IV. Remember the sabbath day, to keep it holy. Six days shalt thou labour, and do all thy work: but the seventh day is the sabbath of the LORD thy God: in it thou shalt not do any work, thou, nor thy son, nor thy daughter, thy manservant, nor thy maidservant, nor thy cattle, nor thy stranger that is within thy gates: for in six days the LORD made heaven and earth, the sea, and all that in them is, and rested the seventh day: wherefore the LORD blessed the sabbath day, and hallowed it.

V. Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee.

VI. Thou shalt not kill.

VII. Thou shalt not commit adultery.

VIII. Thou shalt not steal.

IX. Thou shalt not bear false witness against thy neighbour.

X. Thou shalt not covet thy neighbour's house, thou shalt not covet thy neighbour's wife, nor his manservant, nor his maidservant, nor his ox, nor his ass, nor any thing that is thy neighbour's.`
  },
  {
    id: 'summary-of-the-law', group: 'Law and Gospel', name: 'The Summary of the Law',
    source: 'KJV, Matthew 22:37-40',
    body: `## The Summary of the Law
Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind. This is the first and great commandment. And the second is like unto it, Thou shalt love thy neighbour as thyself. On these two commandments hang all the law and the prophets.`
  },
  {
    id: 'collect-for-purity', group: 'Prayers', name: 'Collect for Purity',
    source: 'BCP 1662',
    body: `## Collect for Purity
Almighty God, unto whom all hearts be open,
all desires known, and from whom no secrets are hid:
Cleanse the thoughts of our hearts
by the inspiration of thy Holy Spirit,
that we may perfectly love thee,
and worthily magnify thy holy Name;
through Christ our Lord. Amen.`
  },
  {
    id: 'general-confession', group: 'Prayers', name: 'General Confession',
    source: 'BCP 1662 (Holy Communion)',
    body: `## Confession of Sin
Almighty God, Father of our Lord Jesus Christ,
Maker of all things, Judge of all men;
We acknowledge and bewail our manifold sins and wickedness,
which we, from time to time, most grievously have committed,
by thought, word, and deed,
against thy divine Majesty,
provoking most justly thy wrath and indignation against us.
We do earnestly repent,
and are heartily sorry for these our misdoings;
the remembrance of them is grievous unto us;
the burden of them is intolerable.
Have mercy upon us,
have mercy upon us, most merciful Father;
for thy Son our Lord Jesus Christ's sake,
forgive us all that is past;
and grant that we may ever hereafter
serve and please thee in newness of life,
to the honour and glory of thy Name;
through Jesus Christ our Lord. Amen.`
  },
  {
    id: 'sursum-corda', group: 'Communion', name: 'Sursum Corda',
    source: 'BCP 1662',
    body: `Leader: The Lord be with you.
People: And with thy spirit.
Leader: Lift up your hearts.
People: We lift them up unto the Lord.
Leader: Let us give thanks unto our Lord God.
People: It is meet and right so to do.`
  },
  {
    id: 'sanctus', group: 'Communion', name: 'Sanctus',
    source: 'BCP 1662',
    body: `## Sanctus
Holy, holy, holy, Lord God of hosts,
heaven and earth are full of thy glory:
Glory be to thee, O Lord most high.`
  },
  {
    id: 'agnus-dei', group: 'Communion', name: 'Agnus Dei',
    source: 'Traditional (BCP 1928)',
    body: `## Agnus Dei
O Lamb of God, that takest away the sins of the world,
have mercy upon us.
O Lamb of God, that takest away the sins of the world,
have mercy upon us.
O Lamb of God, that takest away the sins of the world,
grant us thy peace.`
  },
  {
    id: 'kyrie', group: 'Responses', name: 'Kyrie',
    source: 'Traditional',
    body: `## Kyrie
Lord, have mercy upon us.
Christ, have mercy upon us.
Lord, have mercy upon us.`
  },
  {
    id: 'gloria-patri', group: 'Responses', name: 'Gloria Patri',
    source: 'Traditional',
    body: `## Gloria Patri
Glory be to the Father, and to the Son,
and to the Holy Ghost;
as it was in the beginning, is now, and ever shall be,
world without end. Amen.`
  },
  {
    id: 'doxology', group: 'Responses', name: 'The Doxology',
    source: 'Thomas Ken, 1674',
    body: `## The Doxology
Praise God, from whom all blessings flow;
Praise him, all creatures here below;
Praise him above, ye heavenly host;
Praise Father, Son, and Holy Ghost. Amen.`
  },
  {
    id: 'nunc-dimittis', group: 'Canticles', name: 'Nunc Dimittis',
    source: 'BCP 1662 (Luke 2:29-32)',
    body: `## Nunc Dimittis
Lord, now lettest thou thy servant depart in peace,
according to thy word.
For mine eyes have seen thy salvation,
which thou hast prepared before the face of all people;
to be a light to lighten the Gentiles,
and to be the glory of thy people Israel.`
  },
  {
    id: 'aaronic-benediction', group: 'Benedictions', name: 'The Aaronic Benediction',
    source: 'KJV, Numbers 6:24-26',
    body: `## Benediction
The LORD bless thee, and keep thee:
the LORD make his face shine upon thee,
and be gracious unto thee:
the LORD lift up his countenance upon thee,
and give thee peace.`
  },
  {
    id: 'apostolic-benediction', group: 'Benedictions', name: 'The Apostolic Benediction',
    source: 'KJV, 2 Corinthians 13:14',
    body: `## Benediction
The grace of the Lord Jesus Christ,
and the love of God,
and the communion of the Holy Ghost,
be with you all. Amen.`
  }
];

module.exports = { BUILTIN_TEXTS };
