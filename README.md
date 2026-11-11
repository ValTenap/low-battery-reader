# Low-Battery Paper Reader

A calmer way to read scientific papers on days your brain is out of charge.

**Live site:** https://valtenap.github.io/low-battery-reader/

Drop in a PDF and it gets reflowed into one adjustable column:

- **Presets:** Fine / Tired / Fried
- **Text:** OpenDyslexic, Atkinson Hyperlegible, Lexend and more; size, line, letter and word spacing; line width; cream, mint, sky and dark backgrounds
- **Emphasis:** bold the start of each word, line color gradients for tracking, tinted b / d / p / q
- **Focus:** paragraph spotlight (J / K to move) and a reading ruler
- **Paper tools:** acronym hover hints, skim order (abstract → figures → conclusion), outline, folded references and equations

The PDF is processed entirely in your browser and is never uploaded.

## Feedback (prototype testing)
The bottom of the page asks testers to tune the settings until reading feels comfortable, rate how tired they are (0–10), and press **Send settings to developer**. Each submission becomes one row in a Google Sheet (download as CSV). No paper text or file names are sent. The data will be used to fine-tune the Fine / Tired / Fried presets.

Collected columns: `submitted_at, session_id, tiredness, font, size, lh, ls, ws, measure, theme, bold, gradient, tint, focus, ruler, skim, acronyms, hideRefs, hideEq, last_preset, setting_changes, minutes_on_page, content, viewport_width, touch_device, name, note, app_version, received_at`

Backend setup: see [`feedback-backend/Code.gs`](feedback-backend/Code.gs). The web-app URL goes in `FEEDBACK_URL` near the top of the main script in `index.html`. Until it's set, the button shows the settings as CSV for testers to copy.

## Limitations
- Equations come out garbled (PDFs store math as scattered glyphs), so they can be folded away.
- Unusual layouts may scramble reading order; scanned PDFs have no text layer.
- Figures are shown by caption only.

## Files
- `index.html`: the whole app (the parser is inlined)
- `parse.js`: readable copy of the PDF-to-paragraphs parser

## Credits
- [PDF.js](https://mozilla.github.io/pdf.js/) (Apache 2.0)
- [OpenDyslexic](https://opendyslexic.org/) font, embedded (SIL Open Font License 1.1)
- Other fonts via Google Fonts
