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
