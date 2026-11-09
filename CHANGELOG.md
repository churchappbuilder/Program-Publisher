# Changelog

All notable changes to Program Publisher. Versions follow [Semantic Versioning](https://semver.org):
while the app is below 1.0, new features bump the middle number (0.2.0 → 0.3.0) and fixes bump the last (0.2.0 → 0.2.1).
The version shows in the app under the title and in the installer file name.

## 0.9.0 — 2026-11-09
### Added
- **Literary night or showcase** program for schools: readings, scenes, poems, Bible verses, speeches and songs, organized by class or teacher. Each section can carry a **teacher's note** (a shaded box, written with `[note Title] ... [/note]`) about the author or the work, such as why Milton or Pilgrim's Progress matters.
- **One-off moments in a church service:** the wizard can add a baptism, reception of new members, public profession of faith, installation of officers, a public notice of church discipline, or a commissioning, placed right after the sermon.

## 0.8.0 — 2026-11-09
### Added
- **Design the back page:** choose the name and address, announcements (with the name at the bottom), only your own text, or blank. Choose what shows at the bottom.
- **Notes page is optional.** Spare pages in a booklet can be left blank instead (Paper section).
- **Your own cover layout (expert):** drag the logo, name, title, picture, date and more anywhere on the cover, and make any piece bigger, smaller, wider or narrower. The default layouts stay safe and automatic.
- **Add a list, table or Bible passage:** bulleted announcements, tables and grids (paste from Excel), names in columns, and Bible passages of any length with small verse numbers.
- The church wizard can print the call-to-worship verses and the Scripture reading text, and put announcements on the back page.

### Changed
- The "My programs" list is gone from the editor; open programs from the start screen. Deleting a program returns to the start screen.

## 0.7.0 — 2026-11-08
### Added
- **Logo library** for every church and school: add every version of your logo (shield, banner, seal...), choose the main one, and pick a different one for any cover. Works when setting up a new organization too.
- **Add a list of names** (graduates, performers, roster, donors): paste from Excel or Word and print in 1–4 columns, with hometown or honors beside each name.
- Item lines can show composers with dates stacked beside each piece, dotted leaders, and indented sub-lines (movements, texts), matching real concert programs.
- Cover options: a faint logo watermark, and "presents" and performer lines on the Traditional cover.
- Graduation wizard asks whether it is a school (diplomas) or a college (degrees).
- **Project website** (GitHub Pages) with pictures of programs made by the app, plus CONTRIBUTING and issue templates.

### Fixed
- Existing schools that were created as churches are now detected by name, and you are offered the school program choices instead of weekly services.
- Cleaner alignment of dotted leaders and keeping headings together with the line after them.

## 0.6.0 — 2026-11-08
### Added
- **Traditional cover**, modeled on formal concert and commencement programs: your logo and name at the top, a line such as "presents", the title, performers or details, and the place and date at the bottom.
- **Logo size** (small, medium, large) on every cover. The logo is large by default, since it is one of the most prominent things on a cover.
- Graduations now ask graduation questions: processional music, speakers, honors, diplomas, the list of graduates, faculty and board, class motto, and more. Concerts, recitals, plays and awards nights each have their own questions and sections too.
- New "School program" fill-in sheet columns (Item, Detail, Name or details) for graduations, plays and awards.

### Changed
- Schools no longer see weekly worship services. A new school starts with an empty list, the New menu lists only school programs, and the wording is "The program" and "Fill in the program". "Copy for next week" is hidden for schools.
- New concerts, recitals and graduations start with the Traditional cover.
## 0.5.0 — 2026-11-08
### Added
- **Cover designer** ("Design the cover…"): six layouts drawn from real church and school covers (Classic; Name on top, details below; Picture feature; Full-page picture; Color banner; Framed), with a live preview and a choice of what stands out most, the name or the title.
- **Pictures for covers:** your own pictures (saved for each church or school so you can reuse them), or 12 built-in drawings that take your accent color: cross, communion cup, flame, star, Advent wreath, spring flower, autumn leaves, wheat, open Bible, fish, music notes and graduation cap.
- Choose what shows on the cover (logo, name, tagline, date, address and contact), plus an optional verse and extra text at the bottom (such as service times).
- The New program wizard suggests a cover that suits the program, and the start screen's pictures now show real covers.

### Changed
- The name of the church or school is now the largest line on the cover, and the program title is the smaller line.
- For schools, the creed, prayer and catechism tools moved under "Advanced". The setup screen asks whether this is a church, a school or something else, and schools see the School templates first.

### Fixed
- A save in progress could overwrite an edit made a split second earlier.
## 0.4.0 — 2026-11-08
### Added
- Start screen, like Word's: a **New program** tile, your **recent** programs beside it, and a gallery of starter templates split into **Church** and **School**. Every picture uses your own logo, colors and fonts.
- **New program wizard**: asks what you are making (church service, funeral, wedding, school program, other), then the style, music and speaking, and builds a starting program.
- Worship styles in the wizard, drawn from real bulletins: Presbyterian / Reformed, Anglican / Episcopal, Lutheran (ELCA), Lutheran (LCMS Divine Service), Methodist, Contemporary and Simple. Hymn placeholders use the right hymnal (ELW, LSB, UMH).
- School programs: concert (band, choir, orchestra, jazz, soloists), recital, graduation, play and awards night, with optional roster, sponsors, program notes and upcoming events.
- More starter templates: Communion Sunday, Christmas Eve, Recital, Graduation, Play, Awards night.

### Changed
- Plainer wording throughout and a simpler editor: three numbered steps (About this program, This week's service, Paper), a large **Save as PDF** button beside the preview, and the text-formatting box moved under "Advanced".
- Adding a creed, prayer or catechism questions now puts it at the end of the service unless you were typing in the text box.
- "Set up your church or school" welcome when you first open the app.
## 0.3.0 — 2026-11-08
### Added
- Weekly fill-in sheet: a spreadsheet-style grid for each week's hymn numbers, readings, preacher and standing marks (▲). It edits the same text as the body box, so prayers and other text stay untouched. Paste a block of cells straight from Excel or Google Sheets, or copy the rows out as a table.
- Concert program mode for the sheet: Piece, Note (arranger or work), Composer and Years (for example Haydn (1732–1809)).
- School / concert program starter now uses composer and dates.

## 0.2.0 — 2026-11-08
### Added
- Flowing multi-page booklets (4, 8, 12 … pages) with correct nested-sheet page order for folding and stapling.
- Body markup: section headings, hymn and order-of-service lines, Leader/People speaker labels, standing marks (▲), instructions, bullets, ruled notes lines, page breaks.
- Sheet stepper in the preview to browse every printed side.
- Text library: 17 built-in public-domain texts (creeds, Lord's Prayer, Ten Commandments, benedictions, and more) and a per-church library of saved wording.
- Inserts: a separate printable page sized to fit inside a bulletin.
- "Next week" button: copies a template and clears the date, hymn numbers and readings.
- Catechism picker: the Westminster Shorter and Larger Catechisms, Heidelberg Catechism and Baptist Catechism (1693), by question number or range, with optional Scripture references.
- A4 and A3 bi-fold booklet formats, and loose insert sizes (7 × 8.5 and tri-fold panel).
- App version shown in the app.

### Changed
- Pages are now left-aligned, flowing documents; older templates convert automatically.

## 0.1.0 — 2026-11-08
- First version: organizations, local database, logos and fonts, templates by service type, paper size/color/weight preview, print-ready PDF with bi-fold and tri-fold page ordering, app icon, Windows installer.
