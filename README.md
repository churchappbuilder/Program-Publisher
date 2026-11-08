# Program Publisher

A free, open-source, offline publishing tool for churches, schools and other
organizations. Pick a template, fill in your order of service, choose your paper,
and export a print-ready PDF. Everything runs on your own computer: no cloud, no
accounts, no fees.

> **Status:** early development (v0.1). Windows first; macOS planned.

## Planned features
- Multiple organizations (a church, a school, a ministry), each with its own logos, fonts and preferences
- Templates per service type: morning, evening, Wednesday, funeral, wedding and more
- Fill-in sections with automatic fitting, so the layout can't break
- Paper sizes: half sheet, letter, legal, tabloid, A4/A5, bi-fold and tri-fold
- Paper color and weight preview
- Print-ready PDF with booklet page ordering for folded formats
- Local SQLite database for your fonts, logos and settings

## Roadmap
- [x] Local database, organizations, logos, fonts, per-organization templates
- [x] Print-ready PDF with fold-aware page ordering (bi-fold and tri-fold)
- [x] Flowing multi-page booklets (4, 8, 12 â€¦ pages) with correct nested-sheet page order
- [x] Rich body markup: section headings, hymn lines, Leader/People speaker labels, stand marks, instructions, notes lines, page breaks
- [x] Text library: built-in public-domain texts (creeds, Lord's Prayer, Ten Commandments, benedictions, ...) plus a per-church library, loose inserts, and a "Next week" button
- [ ] Weekly fill-in sheet (spreadsheet-style entry for hymns, readings, pieces and composers, with Excel/CSV paste)
- [ ] Worship traditions: liturgical (Anglican/Episcopal, Presbyterian, Lutheran, Catholic, Methodist, Orthodox) and free-form styles, each with a matching order of service
- [ ] Responsive readings (Leader / People), seasons of the church year, lectionary readings
- [ ] Wider scope than churches: school programs, concerts, recitals, events
- [ ] App icon and Windows installer built automatically on GitHub
- [ ] Bleed and crop marks for print shops
- [ ] macOS version

## Run from source
Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm start
```

## License
GPL v3 or later. See `LICENSE`.


