# Program Publisher

A free, open-source, offline publishing tool for churches, schools and other
organizations. Pick a template, fill in your order of service, choose your paper,
and export a print-ready PDF. Everything runs on your own computer: no cloud, no
accounts, no fees.

> **Status:** early development (v0.1). Windows first; macOS planned.

## Download

**[Download the latest Windows installer](https://github.com/churchappbuilder/Program-Publisher/releases/latest)** (Windows 10 or 11, 64-bit).
Run it and follow the steps. It installs for your user account and does not need administrator rights.
Windows may say "Windows protected your PC" because the installer is not code-signed yet. Click **More info**, then **Run anyway**.
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
- [x] Flowing multi-page booklets (4, 8, 12 ... pages) with correct nested-sheet page order
- [x] Rich body markup: section headings, hymn lines, Leader/People speaker labels, stand marks, instructions, notes lines, page breaks
- [x] Text library: built-in public-domain texts (creeds, Lord's Prayer, Ten Commandments, benedictions, ...) plus a per-church library, loose inserts, and a "Next week" button
- [x] Catechism picker (Westminster Shorter and Larger, Heidelberg, Baptist 1693) by question number or range
- [x] Weekly fill-in sheet: spreadsheet-style entry for hymns, readings, pieces and composers, with paste from Excel
- [x] Start screen (new program, recent, church and school templates) and a New program wizard
- [x] Worship styles in the wizard: Presbyterian, Anglican, Lutheran (ELCA and LCMS), Methodist, contemporary, simple (Catholic and Orthodox are not planned for now)
- [ ] Seasons of the church year and lectionary readings
- [x] School programs: concert, recital, graduation, play and awards night, each with its own questions and sections
- [x] Cover designer: six layouts, your own pictures or built-in seasonal art
- [ ] Windows installer built automatically on GitHub
- [ ] Bleed and crop marks for print shops
- [ ] macOS version

## Run from source
Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm start
```

## Versions
See [CHANGELOG.md](CHANGELOG.md). The current version is shown in the app under the title.

## Credits
Catechism texts come from [reformededucation.org](https://reformededucation.org/catechisms.html) (public domain); see `src/data/catechisms/README.md`.

## License
GPL v3 or later. See `LICENSE`.


