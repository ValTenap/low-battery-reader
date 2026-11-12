# Low-Battery Paper Reader

A calmer way to read scientific papers on days your brain is out of charge.

**Live site:** https://valtenap.github.io/low-battery-reader/

Drop in a PDF and it gets reflowed into one adjustable column:

- **Presets:** Fine / Tired / Fried
- **Text:** OpenDyslexic, Atkinson Hyperlegible, Lexend and more; size, line, letter and word spacing; line width; cream, mint, sky and dark backgrounds
- **Emphasis:** bold the start of each word, line color gradients for tracking, tinted b / d / p / q
- **Focus:** paragraph spotlight (J / K to move), a reading ruler, and **one word at a time** mode (words flash in one spot so your eyes don't have to move; adjustable speed, pauses at sentence ends, Space / ← → / ↑ / Esc controls)
- **Equations:** PDFs don't contain LaTeX, so the reader rebuilds it from where each glyph sits and where fraction bars are drawn (sub/superscripts, fractions, limits on ∑ and ∫, square roots, matrices, `cases`, accents, equation numbers) and typesets it with KaTeX in your reading theme. Each equation has **Show original** (a crisp snapshot from the PDF, used automatically when the rebuild looks unreliable) and **Copy LaTeX**. Inline sub/superscripts in sentences are kept too, and pasted text can include `$$ … $$` equations.
- **Your place, remembered:** a 📍 *You stopped here* marker on the exact word where you left off, saved per paper (per library item in Zotero). Reopen a paper to jump back or continue in one-word mode; Shift+click any word to mark your place. Great for textbooks.
- **Paper tools:** acronym hover hints, skim order (abstract → figures → conclusion), outline, folded references and equations

The PDF is processed entirely in your browser and is never uploaded.

## Does this actually help? The research
I built this as a tool for my own ADHD, and I've tried to be honest about what the evidence supports. **Full write-up with 18 references: [RESEARCH.md](RESEARCH.md).**

- **Best supported:** personalization (the best font differs per person, with ~35% speed gaps between someone's best and worst fonts), reflowing text into a clean single column, extra letter spacing, shorter lines, and digital reading rulers.
- **ADHD-specific:** a 2025 study found that reducing eye movements during reading improved comprehension for students with ADHD but not for controls, and on-screen text tends to be harder for readers with ADHD than print.
- **Not supported, kept as comfort options:** dyslexia fonts and bolding the start of words showed no average benefit in controlled studies. Line color gradients have mixed results, and dark mode generally reads slightly worse than light backgrounds.

That's why the tool focuses on letting each reader find their own settings, and why the prototype collects anonymous settings data to tune the presets.

## Zotero plugin
**[Download Low-Battery Reader for Zotero](https://valtenap.github.io/low-battery-reader/zotero/low-battery-reader.xpi)** (latest, currently v0.3.1) (Zotero 7 and 8)

Install: in Zotero go to **Tools → Plugins**, then drag the `.xpi` file onto that window (or use the gear menu → *Install Plugin From File…*).

Use it either way:
- right-click a paper → **Open in Low-Battery Reader**
- or press the **Aa** button in Zotero's PDF reader toolbar

The paper opens reflowed in its own window, with the exact title, authors and abstract from your library. Settings are remembered between papers, and your reading position is remembered for each item in your library. Everything runs locally (fonts and PDF.js are bundled), so it works offline. The one-word-at-a-time mode is website-only.

Source: [`zotero-plugin/`](zotero-plugin/). When releasing a new version, also copy the xpi to `zotero/low-battery-reader.xpi` (the website links there) and update `zotero/updates.json`. To rebuild: `cd zotero-plugin && zip -r ../low-battery-reader.xpi manifest.json bootstrap.js locale content`. Presets live in `zotero-plugin/content/presets.js`.

## Feedback (prototype testing)
The bottom of the page asks testers to tune the settings until reading feels comfortable, rate how tired they are (0–10), and press **Send settings to developer**. Each submission becomes one row in a Google Sheet (download as CSV). No paper text or file names are sent. The data will be used to fine-tune the Fine / Tired / Fried presets.

Collected columns: `submitted_at, session_id, tiredness, font, size, lh, ls, ws, measure, theme, bold, gradient, tint, focus, ruler, skim, acronyms, hideRefs, hideEq, last_preset, setting_changes, minutes_on_page, content, viewport_width, touch_device, name, note, app_version, received_at`

Backend setup: see [`feedback-backend/Code.gs`](feedback-backend/Code.gs). The web-app URL goes in `FEEDBACK_URL` near the top of the main script in `index.html`. Until it's set, the button shows the settings as CSV for testers to copy.

## Limitations
- Equation rebuilding is tested on LaTeX-made PDFs (Computer Modern / Latin Modern) and Springer Nature typesetting. Equations from other tools may fall back to the original snapshot.
- Unusual layouts may scramble reading order; scanned PDFs have no text layer.
- Figures are shown by caption only.

## Files
- `index.html`: the whole app (the parser is inlined)
- `parse.js`: readable copy of the PDF-to-paragraphs parser
- `eqmath.js`: rebuilds LaTeX from equation glyphs and fraction bars

## Credits
- [PDF.js](https://mozilla.github.io/pdf.js/) (Apache 2.0)
- [OpenDyslexic](https://opendyslexic.org/) font, embedded (SIL Open Font License 1.1)
- Other fonts via Google Fonts
