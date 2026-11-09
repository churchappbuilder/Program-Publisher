# Helping with Program Publisher

Thank you! You do not need to write code to help. Pastors, church secretaries, band directors and teachers know things programmers do not.

## Ways to help without code

- **Tell us what you print.** Open an issue ("Idea") describing the program you make each week and what is hard about it.
- **Correct an order of worship.** If a tradition's order is off (Presbyterian, Anglican, Lutheran, Methodist and others), open a "Worship order correction" issue and describe how yours actually goes.
- **Report a problem.** Say what you clicked, what you expected and what happened. A screenshot helps.
- **Share examples.** Real bulletins and programs (with names removed) help us make the layouts match what you actually print.
- **Proofread.** The Heidelberg and Baptist catechism texts in `src/data/catechisms/` are marked "not yet proofread".

## Changing the code

```bash
git clone https://github.com/churchappbuilder/Program-Publisher.git
cd Program-Publisher
npm install
npm start     # run the app
npm test      # run the tests (please keep them passing)
```

1. Fork the repository and create a branch.
2. Make one focused change. Add or update a test in `test/` when you can.
3. Run `npm test`.
4. Open a pull request and say, in plain words, what it changes and why.

### Ground rules

- Every screen must make sense to someone who is not technical. Plain language, no jargon.
- The app works fully offline. No accounts, no cloud, no tracking.
- Shared layout code lives in `src/shared/` and is used by both the app and the tests.
- Changes are released under the GNU GPL v3, like the rest of the project.

## Website

The project page is `index.html` at the repository root, with pictures in `site/img/`. Regenerate the sample pictures with `npx electron tools/make-gallery.js` and the app screenshots with `npx electron tools/make-screenshots.js`.
