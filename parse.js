// ---------- PDF text -> structured blocks ----------
// Input: pages = [{items:[{s,x,y,w,h}], W, H}]  (PDF coordinates, y grows upward)
// Output: [{type:'title'|'h'|'p'|'cap'|'ref'|'eq', text}]

function median(a) { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; }

// private-use markers for inline sub/superscripts: \uE000 sub \uE001 end, \uE002 sup \uE003 end
const SUB0 = '\uE000', SUB1 = '\uE001', SUP0 = '\uE002', SUP1 = '\uE003';
function joinItems(items) {
  items.sort((a, b) => a.x - b.x);
  // main size and baseline of the line
  const hist = {};
  items.forEach(i => { const k = Math.round(i.h * 2) / 2; hist[k] = (hist[k] || 0) + Math.max(1, i.s.trim().length); });
  const main = +Object.entries(hist).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const mainYs = items.filter(i => Math.abs(i.h - main) < main * 0.12).map(i => i.y);
  const base = median(mainYs.length ? mainYs : items.map(i => i.y));
  let text = '', prevEnd = null;
  for (const it of items) {
    let str = it.s, script = false;
    if (it.h < main * 0.86 && str.trim()) {
      if (it.y > base + 0.18 * main) { str = SUP0 + str.replace(/\s+/g, '') + SUP1; script = true; }
      else if (it.y < base - 0.08 * main) { str = SUB0 + str.replace(/\s+/g, '') + SUB1; script = true; }
    }
    if (!script && text && prevEnd !== null && !/\s$/.test(text) && !/^\s/.test(str) && it.x - prevEnd > 0.15 * it.h) text += ' ';
    text += str; prevEnd = it.x + it.w;
  }
  return combineAccents(text.replace(/\s+/g, ' ').trim());
}
const COMBINE = {'ˆ': '\u0302', '˜': '\u0303', '¯': '\u0304', 'ˉ': '\u0304', '˙': '\u0307', '¨': '\u0308', 'ˇ': '\u030C'};
function combineAccents(t) {
  // "yˆ" -> "ŷ" (accent after its letter), "(ˆx" -> "(x̂" (accent before its letter)
  return t.replace(/([\p{L}])\s?([ˆ˜¯ˉ˙¨ˇ])/gu, (m, l, a) => l + COMBINE[a])
          .replace(/([ˆ˜¯ˉ˙¨ˇ])\s?([\p{L}])/gu, (m, a, l) => l + COMBINE[a]);
}

function makeLine(items, col, page) {
  const xs = items.map(i => i.x), xe = items.map(i => i.x + i.w);
  // height weighted toward the dominant text, so superscripts don't distort it
  const hs = []; items.forEach(i => { for (let k = 0; k < Math.max(1, i.s.length); k++) hs.push(i.h); });
  return { text: joinItems(items), items: items.map(i => ({...i, page})), x: Math.min(...xs), xEnd: Math.max(...xe), y: median(items.map(i => i.y)), h: median(hs), col, page };
}

// TeX's extension font (big ∑ ∫ ( ) √) encodes glyphs as control chars / a few letters; detect it per font
const EXT_CHARS = /^[\u0000-\u001FPQRSTXYZpqrstHILMNO\[\\\]()|{}∑∏∐⋃⋂∫∬∭∮√⟨⟩‖⌊⌋⌈⌉⎛⎜⎝⎞⎟⎠⎡⎢⎣⎤⎥⎦⎧⎨⎩⎪⎫⎬⎭⎮⌠⌡]+$/;
function markExtFonts(items) {
  const by = {};
  items.forEach(i => { if (i.f) (by[i.f] = by[i.f] || []).push(i); });
  for (const f in by) {
    const its = by[f];
    const ext = its.every(i => i.s.trim().length <= 2 && EXT_CHARS.test(i.s.trim())) &&
      (its.some(i => /[\u0000-\u001F∑∏∫√⎛⎝⎧]/.test(i.s)) || its.length <= 6);
    if (ext) its.forEach(i => { i.ext = true; });
  }
}

// Springer/Elsevier "Adv…" math fonts label their glyphs with the wrong characters
const ADV_SYM = {'ð': '(', 'Þ': ')', '¼': '=', 'þ': '+', 'j': '|', 'k': '‖', '\u0002': '−', 'À': '−', 'Â': '×', 'Á': '·', 'Ã': '*', '½': '[', 'Š': ']', 'f': '{', 'g': '}', 'h': '⟨', 'i': '⟩', ' ': ' '};
function fixAdvFonts(items) {
  const by = {};
  items.forEach(i => { if (i.f) (by[i.f] = by[i.f] || []).push(i); });
  let adv = false;
  for (const f in by) {
    const chars = by[f].map(i => i.s).join('');
    if (/[ðÞ¼þ]/.test(chars) && [...chars].every(c => ADV_SYM[c] !== undefined)) {
      adv = true;
      by[f].forEach(i => { i.s = [...i.s].map(c => ADV_SYM[c]).join(''); i.adv = true; });
    }
  }
  for (const f in by) {
    const its = by[f];
    // radical: a 'p' glyph followed by a run of 'ffi' glyphs that draws the overline
    its.filter(i => /^(ffi)+f{0,2}$/.test(i.s.trim()) && i.s.trim().length >= 3).forEach(ov => {
      ov.overline = true; ov.s = ''; ov.adv = true;
      const p = its.find(i => i.s.trim() === 'p' && Math.abs(i.x + i.w - ov.x) < 1.5);
      if (p) { p.s = '√'; p.adv = true; }
    });
    // companion punctuation font: ';' is a comma and '=' a slash
    if (adv && its.every(i => /^[;=]+$/.test(i.s.trim())) && its.some(i => i.s.includes(';'))) its.forEach(i => { i.s = i.s.replace(/;/g, ',').replace(/=/g, '/'); });
  }
}

// TeX math-italic fonts (e.g. MathTime) whose capital Greek (codes 0–10) come out as digits: Δ shows up as a wide "1"
const OML_GREEK = {'0': 'Γ', '1': 'Δ', '2': 'Θ', '3': 'Λ', '4': 'Ξ', '5': 'Π', '6': 'Σ', '7': 'Υ', '8': 'Φ', '9': 'Ψ'};
function fixGreekDigits(items) {
  const by = {};
  items.forEach(i => { if (i.f) (by[i.f] = by[i.f] || []).push(i); });
  for (const f in by) {
    const its = by[f];
    if (!its.some(i => /[α-ωϕϑϵ]/.test(i.s))) continue;          // a math-italic font
    its.forEach(i => {
      const c = i.s.trim();
      if (c.length === 1 && OML_GREEK[c] && i.w > 0.62 * i.h) i.s = i.s.replace(c, OML_GREEK[c]);
      else if (c.length > 1) i.s = i.s.replace(/[0-9](?=[A-Za-zα-ωΑ-Ω])/g, d => OML_GREEK[d]);   // a digit glued to a letter in a math-italic run
    });
  }
}

// Mathematica's "Mathematica2" font draws tall brackets from letter-coded pieces stacked at one x
const MMA_PIECE = {'i': '⎛', 'j': '⎜', 'k': '⎝', 'y': '⎞', 'z': '⎟', '{': '⎠', 'g': '⎡', 'h': '⎢', 'l': '⎣', 'w': '⎤', 'x': '⎥', '|': '⎦'};
function fixBracketPieces(items) {
  const by = {};
  items.forEach(i => { if (i.f) (by[i.f] = by[i.f] || []).push(i); });
  for (const f in by) {
    const its = by[f];
    if (its.length < 3 || !its.every(i => i.s.trim().length === 1 && MMA_PIECE[i.s.trim()])) continue;
    const stacked = its.some(a => its.some(b => b !== a && b.s === a.s && Math.abs(b.x - a.x) < 0.5 && Math.abs(b.y - a.y) < 1.2 * a.h));
    if (!stacked) continue;
    its.forEach(i => { i.s = MMA_PIECE[i.s.trim()]; i.ext = true; });
  }
}

function pageLines(items, W, H, page) {
  items = items.filter(i => !/^[\s■▪◼□●◆]+$/.test(i.s));   // decorative section bullets (ACS)
  fixBracketPieces(items);
  fixAdvFonts(items);
  fixGreekDigits(items);
  markExtFonts(items);
  // big extension glyphs hang below their reported baseline: cluster them by their visual centre
  const yc = it => it.ext || it.overline ? it.y - it.h : it.s.trim() === '√' ? it.y - 0.8 * it.h : it.y;
  // rows: first full-size glyphs, then attach smaller ones (scripts) to the nearest row
  items = items.slice().sort((a, b) => yc(b) - yc(a) || a.x - b.x);
  const hist = {};
  items.forEach(i => { const k = Math.round(i.h * 2) / 2; hist[k] = (hist[k] || 0) + i.s.length; });
  const body = +(Object.entries(hist).sort((a, b) => b[1] - a[1])[0] || [10])[0];
  // huge lone symbols (section bullets like ■) would swallow neighbouring lines into one row
  items.forEach(c => { if (!c.ext && c.s.trim().length === 1 && !/\p{L}/u.test(c.s) && c.h > 2.2 * body && !EXT_CHARS.test(c.s.trim())) c.h = body; });
  // drop caps: one huge letter that starts a paragraph; move it onto the first line beside it
  items.filter(c => c.s.trim().length === 1 && /\p{L}/u.test(c.s) && c.h > 1.8 * body).forEach(c => {
    const near = items.filter(j => j !== c && j.h < 1.3 * body && j.x >= c.x + c.w - 1 && j.x < c.x + c.w + 1.5 * body && j.y > c.y - 0.5 * body && j.y < c.y + c.h);
    if (!near.length) return;
    const top = near.sort((a, b) => b.y - a.y || a.x - b.x)[0];
    c.y = top.y; c.h = top.h; c.w = Math.max(0.1, top.x - c.x);
  });
  items.sort((a, b) => yc(b) - yc(a) || a.x - b.x);
  const cluster = (list, rows) => {
    for (const it of list) {
      const r = rows[rows.length - 1];
      if (r && Math.abs(r.y - yc(it)) < 0.6 * Math.max(it.h, r.h)) {
        r.items.push(it);
        if (!it.ext && (it.h > r.h * 1.05 || r.extOnly)) { r.y = yc(it); r.h = it.h; r.extOnly = false; }
      }
      else rows.push({ y: yc(it), h: it.h, items: [it], extOnly: !!it.ext });
    }
    return rows;
  };
  // a glyph is a script only if it is smaller than text right next to it (not just smaller than the page's body text)
  const isScript = it => !it.ext && !it.overline && items.some(j => j !== it && j.h * 0.86 >= it.h && Math.abs(yc(j) - yc(it)) < 1.0 * j.h &&
    j.x - 1.2 * it.h < it.x + it.w && it.x < j.x + j.w + 1.2 * it.h);
  const scriptSet = new Set(items.filter(isScript));
  const big = items.filter(i => !scriptSet.has(i)), small = items.filter(i => scriptSet.has(i));
  const rows = cluster(big, []);
  const loose = [];
  small.forEach(it => {
    let best = null, bd = Infinity;
    rows.forEach(r => {
      if (!r.items.some(j => j.x - 3 * it.h < it.x + it.w && it.x < j.x + j.w + 3 * it.h)) return;
      const d = Math.abs(r.y - yc(it)); if (d < bd) { bd = d; best = r; }
    });
    if (best && bd < 0.85 * best.h) best.items.push(it); else loose.push(it);
  });
  cluster(loose, []).forEach(r => rows.push(r));
  rows.sort((a, b) => b.y - a.y);
  // gutter detection on a coverage histogram
  const N = 240, cov = new Array(N).fill(0);
  for (const it of items) {
    const a = Math.max(0, Math.floor((it.x + 1) / W * N)), b = Math.min(N - 1, Math.floor((it.x + it.w - 1) / W * N));
    for (let k = a; k <= b; k++) cov[k]++;
  }
  let minB = -1, minV = Infinity;
  for (let k = Math.floor(N * 0.38); k <= Math.ceil(N * 0.62); k++) if (cov[k] < minV) { minV = cov[k]; minB = k; }
  const side = [...cov.slice(Math.floor(N * .12), Math.floor(N * .33)), ...cov.slice(Math.ceil(N * .67), Math.ceil(N * .88))];
  const sideAvg = side.reduce((a, b) => a + b, 0) / side.length;
  let twoCol = sideAvg > 4 && minV < 0.3 * sideAvg;
  let g = (minB + 0.5) / N * W;
  if (!twoCol) {
    // a full-width abstract or banner can hide the gutter: look for a vertical gap that many rows share
    let bestN = 0, bestG = g;
    for (let k = Math.floor(N * 0.4); k <= Math.ceil(N * 0.6); k++) {
      const gx = (k + 0.5) / N * W; let n = 0;
      for (const r of rows) {
        if (r.items.some(i => i.x < gx - 2 && i.x + i.w > gx + 2)) continue;
        const l = r.items.filter(i => i.x + i.w <= gx), rt = r.items.filter(i => i.x >= gx);
        if (l.length && rt.length && Math.min(...rt.map(i => i.x)) - Math.max(...l.map(i => i.x + i.w)) > 0.5 * r.h) n++;
      }
      if (n > bestN) { bestN = n; bestG = gx; }
    }
    if (bestN >= 6 && bestN >= 0.15 * rows.length) { twoCol = true; g = bestG; }
  }

  const out = []; let L = [], R = [];
  const flush = () => { out.push(...L, ...R); L = []; R = []; };
  for (const row of rows) {
    if (!twoCol) { out.push(makeLine(row.items, 0, page)); continue; }
    const its = row.items.slice().sort((a, b) => a.x - b.x);
    const spans = its.some(i => i.x < g - 2 && i.x + i.w > g + 2);
    const left = its.filter(i => i.x + i.w / 2 < g), right = its.filter(i => i.x + i.w / 2 >= g);
    let full = spans;
    if (!spans && left.length && right.length) {
      const lEnd = Math.max(...left.map(i => i.x + i.w)), rStart = Math.min(...right.map(i => i.x));
      if (rStart - lEnd < 0.5 * row.h) full = true; // continuous text across the middle
    }
    if (full) { flush(); out.push(makeLine(its, 'F', page)); }
    else { if (left.length) L.push(makeLine(left, 0, page)); if (right.length) R.push(makeLine(right, 1, page)); }
  }
  flush();
  // per-column left/right margins
  const by = {};
  out.forEach(l => (by[l.col] = by[l.col] || []).push(l));
  for (const k in by) {
    const xs = by[k].map(l => l.x).sort((a, b) => a - b), xe = by[k].map(l => l.xEnd).sort((a, b) => a - b);
    const left = xs[Math.floor(xs.length * 0.1)], right = xe[Math.floor(xe.length * 0.9)];
    by[k].forEach(l => { l.left = left; l.right = right; });
  }
  out.forEach(l => { l.H = H; });
  return out;
}

const SECTION_WORDS = /^(abstract|introduction|background|theory|methods?|methodology|experiment(al)?( setup| methods)?|results?( and discussion)?|discussion|conclusions?|summary|outlook|references|bibliography|acknowledge?ments?|funding|data availability|supplementary( material| information)?|appendix.*)$/i;

function buildBlocks(pages) {
  let lines = pages.flat();
  // drop running headers/footers and page numbers
  const key = t => t.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1).sort().join(' ');
  const cnt = {};
  lines.forEach(l => { const k = key(l.text); cnt[k] = (cnt[k] || new Set()).add(l.page); });
  const np = pages.length;
  lines = lines.filter(l => {
    const label = /^(article|letter|review|open|research article|communication|perspective|brief communication|research|report|editorial)$/i.test(l.text.trim()) ||
      (/doi\.org|www\.|https?:\/\/|©|all rights reserved|creativecommons|\b\w+\.(org|com)\/\S/i.test(l.text) && l.text.length < 220);
    if (label && l.page === 1 && l.y > l.H * 0.7) return false;     // journal labels above the title on page 1
    if (/^(cite this:|read online|downloaded (via|from)|see https?:|access metrics|metrics & more|article recommendations)|^\S+\.(org|com|net|edu)\/\S*( article)?$|^https?:\/\/\S+$/i.test(l.text.trim())) return false;
    if (/\b(cite this|read online)\b.*\b(read online|cite this)\b|metrics & more.*recommendations/i.test(l.text)) return false;
    const edge = l.y > l.H * 0.9 || l.y < l.H * 0.08;
    if (!edge) return true;
    if (/^\s*(page\s*)?\d{1,4}(\s*(of|\/)\s*\d+)?\s*$/i.test(l.text)) return false;
    if (/doi\.org|www\.|https?:\/\/|©|all rights reserved|creativecommons|\b\w+\.(org|com)\/\S/i.test(l.text) && l.text.length < 220) return false;
    if (/^(article|letter|review|open|research article|communication|perspective|brief communication|research|report|editorial)$/i.test(l.text.trim())) return false;
    if (np >= 3 && key(l.text).length >= 4 && cnt[key(l.text)].size >= Math.max(3, np * 0.5)) return false;
    return true;
  });
  if (!lines.length) return [];

  // body font size = most common size, weighted by characters
  const hist = {};
  lines.forEach(l => { const k = Math.round(l.h * 2) / 2; hist[k] = (hist[k] || 0) + l.text.length; });
  const body = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1], b = lines[i];
    if (a.page === b.page && a.col === b.col && Math.abs(a.h - body) < body * .1 && Math.abs(b.h - body) < body * .1) {
      const dy = a.y - b.y; if (dy > 0 && dy < 3 * body) gaps.push(dy);
    }
  }
  const gap = median(gaps) || body * 1.2;

  const letters = t => (t.match(/\p{L}/gu) || []).length;
  // real words (3+ letters) outside sub/superscripts, ignoring function names like cos/exp
  const words = t => (t.replace(/[\uE000\uE002][^\uE001\uE003]*[\uE001\uE003]/g, ' ').match(/\p{L}{3,}/gu) || [])
    .filter(w => !/^(exp|sin|cos|tan|cot|log|ln|max|min|det|sinh|cosh|tanh|lim|sup|inf|arg|eff)$/.test(w)).length;
  const hasMath = (t, b) => /[=+−<>≤≥≈∼∑∏∫√∂∇±×·∞→⟨⟩]|[\uE000-\uE003]|[α-ωΑ-Ω]|[\u0000-\u001F]/.test(t) || !!(b && b.mathFont);
  const TAGEND = /\(\s*\d{1,3}[a-z]?\s*\)\s*$/;
  const strongMath = (t, b) => /[=+−<>≤≥≈∼∑∏∫√∂∇±×·∞→⟨⟩]|[α-ωΑ-Ω]|[\u0000-\u001F]/.test(t) || !!(b && b.mathFont);
  const mathFontLine = l => (l.items || []).some(i => i.ext || i.adv || i.overline);
  const isHeading = (l, prev) => {
    const t = l.text, bare = t.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.|[A-H]\.)\s+/, '');
    if (t.length <= 110 && t === t.toUpperCase() && /\p{Lu}{3}/u.test(t) && letters(t) >= 8 && letters(t) >= t.length * 0.6 && t.split(/\s+/).length <= 10 && !/[=+−<>.]$/.test(t) &&
      (!prev || endsSent(prev.text) || prev.isHead || prev.page !== l.page || prev.col !== l.col || prev.y - l.y > 1.6 * gap)) return true;   // ALL-CAPS section titles (ACS)
    if (t.length > 110 || t.length < 3 || /[,;]$/.test(t) || letters(t) < t.length * 0.6) return false;
    if (SECTION_WORDS.test(bare.replace(/[.:]$/, ''))) return true;
    if (/[.:]$/.test(t)) return false;
    if (l.h > body * 1.15) return true;
    if (/^((\d+(\.\d+)*\.?)|([IVX]+\.))\s+[A-Z]/.test(t) && t.split(/\s+/).length <= 9 && (!prev || /[.!?:]$/.test(prev.text) || prev.page !== l.page || prev.col !== l.col)) return true;
    return false;
  };
  const endsSent = t => /[.!?:]["')\]]?$/.test(t);
  const bare = t => t.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.|[A-H]\.)\s+/, '').replace(/[.:]$/, '');

  const blocks = []; let cur = null, prev = null, inRefs = false, titleDone = false;
  const close = () => { if (cur) blocks.push(cur); cur = null; };
  for (const l of lines) {
    let t = l.text;
    if (!t) continue;
    const ab = t.match(/^abstract\s*[—–:.\-]\s*(.+)$/i);
    if (ab) { close(); blocks.push({ type: 'h', text: 'Abstract' }); t = ab[1]; cur = { type: 'p', text: '', items: [] }; }
    else if (prev && prev.isHead && blocks.length && blocks[blocks.length - 1].type === 'h' && prev.page === l.page && prev.col === l.col && prev.y - l.y < 1.8 * gap &&
      t === t.toUpperCase() && /\p{Lu}{3}/u.test(t) && t.length < 70 && /[,A-Z]$/.test(prev.text.trim()) && !/^(\d+(\.\d+)*\.?|[IVX]+\.)\s/.test(t)) {
      blocks[blocks.length - 1].text += ' ' + t; l.isHead = true; prev = l; continue;   // heading wrapped onto a second line
    }
    else if (isHeading(l, prev)) {
      close();
      const isTitle = !titleDone && l.page === 1 && l.h > body * 1.3 && !/^((\d+(\.\d+)*\.?)|([IVX]+\.))\s/.test(t) && !SECTION_WORDS.test(bare(t));
      const last = blocks[blocks.length - 1];
      if (isTitle && last && last.type === 'title') last.text += ' ' + t;
      else if (!isTitle && last && last.type === 'h' && prev && prev.isHead && prev.page === l.page && prev.col === l.col && prev.y - l.y < 1.8 * gap && !/^(\d+(\.\d+)*\.?|[IVX]+\.)\s/.test(t)) last.text += ' ' + t;
      else blocks.push({ type: isTitle ? 'title' : 'h', text: t });
      if (!isTitle && blocks.some(b => b.type === 'title')) titleDone = true;
      inRefs = /^(\d+\.?\s*)?(references|bibliography)$/i.test(t);
      l.isHead = true; prev = l; continue;
    }
    let newPara = !cur || !!(prev && prev.isHead);
    if (cur && prev) {
      const sameFlow = prev.page === l.page && prev.col === l.col && prev.y > l.y;
      const indent = l.x - l.left > 0.8 * body;
      const prevShort = prev.xEnd < prev.right - 2 * body;
      if (sameFlow && prev.y - l.y > gap * 1.45) newPara = true;
      if (Math.abs(l.h - prev.h) > body * 0.18) newPara = true;
      if (prev.page === l.page && prev.col !== l.col && (prev.col === 'F' || l.col === 'F')) newPara = true;   // full-width block -> columns
      if (/^(keywords|key words|index terms|ocis codes)\b/i.test(t)) newPara = true;
      if (endsSent(prev.text) && (indent || prevShort)) newPara = true;
      if (/^(fig(ure)?\.?|table)\s*\d+[.:|]/i.test(t)) newPara = true;
      if (inRefs && /^\[?\d{1,3}[\].)]\s/.test(t)) newPara = true;
      const mathy = x => {
        const p = x.text.replace(/[\uE000-\uE003]/g, '');
        if (mathFontLine(x) || /[\u0000-\u001F]/.test(p)) return words(x.text) <= 3;
        if (words(x.text) <= 2 && hasMath(x.text) && (x.x - x.left > 0.9 * body || TAGEND.test(x.text))) return true;
        return p.length < 40 && words(x.text) <= 2 && x.x > x.left + 3 * body && x.xEnd < x.right - 3 * body;
      };
      if (mathy(l) !== mathy(prev)) newPara = true;
    }
    if (newPara && cur && cur.text) close();
    if (!cur) cur = { type: 'p', text: '', items: [] };
    if (!cur.items) cur.items = [];
    cur.indent = Math.min(cur.indent === undefined ? Infinity : cur.indent, l.x - (l.left || 0));
    cur.mathFont = cur.mathFont || mathFontLine(l);
    { const its = (l.items || []).slice().sort((a, b) => a.x - b.x); let g = 0;   // wide gaps = table columns
      for (let k = 1; k < its.length; k++) if (its[k].x - (its[k - 1].x + its[k - 1].w) > 2 * body) g++;
      cur.gaps = Math.max(cur.gaps || 0, g); }
    cur.items.push(...(l.items || []).map(i => ({...i, H: l.H})));
    if (!cur.text) cur.text = t;
    else if (/[a-z]-$/.test(cur.text) && /^[a-z]/.test(t)) cur.text = cur.text.slice(0, -1) + t;
    else cur.text += ' ' + t;
    if (inRefs) cur.type = 'ref';
    prev = l;
  }
  close();
  // classify
  const plain = t => t.replace(/[\uE000-\uE003]/g, '');
  for (const b of blocks) {
    if (b.type !== 'p') continue;
    const t = plain(b.text);
    if (/^(fig(ure)?\.?|table)\s*\d+[.:|]/i.test(t)) b.type = 'cap';
    else if (t.length < 260 && words(b.text) <= 2 && strongMath(t, b) && !(b.gaps >= 2 && !/[=<>≤≥≈]/.test(t)) && (b.indent > 0.9 * body || b.mathFont || TAGEND.test(t))) b.type = 'eq';
  }
  // short fragments right next to an equation are usually its numerator/denominator rows
  const isFrag = b => b.type === 'p' && plain(b.text).length <= 30 && !/[.?!:;]$/.test(b.text) && plain(b.text).split(/\s+/).length <= 4;
  for (let k = 0; k < blocks.length; k++) {
    if (!isFrag(blocks[k])) continue;
    if ((blocks[k - 1] && blocks[k - 1].type === 'eq') || (blocks[k + 1] && blocks[k + 1].type === 'eq')) blocks[k].type = 'eq';
  }
  // author/affiliation lines between the title and the first real section
  const tIdx = blocks.findIndex(b => b.type === 'title');
  if (tIdx >= 0) for (let i = tIdx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    const bare = b.text.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.)\s+/, '').replace(/[.:]$/, '');
    if (b.type === 'h' && (SECTION_WORDS.test(bare) || /^(\d|[IVX]+\.)/.test(b.text))) break;
    if (i - tIdx > 8) break;
    // prose (a real paragraph) ends the author/affiliation run
    const prose = b.text.length > 160 || (b.text.length > 60 && /[.!?]["')]?$/.test(b.text) && b.text.split(/\s+/).length > 10);
    if (prose) break;
    if (b.type === 'h' || b.type === 'p') b.type = 'meta';
  }
  // merge consecutive equation fragments
  const merged = [];
  for (const b of blocks) {
    const m = merged[merged.length - 1];
    if (m && m.type === 'eq' && b.type === 'eq') { m.text += '  ' + b.text; m.items = (m.items || []).concat(b.items || []); m.mathFont = m.mathFont || b.mathFont; }
    else merged.push(b);
  }
  merged.forEach(b => { if (b.type !== 'eq') delete b.items; });
  return merged;
}

// ---------- acronyms: "spatial light modulator (SLM)" ----------
const STOP = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'to', 'a', 'an', 'with', 'by', 'at', 'from', 'via']);
function findAcronyms(blocks) {
  const map = {};
  const re = /\(([A-Z][A-Za-z]{0,3}[A-Z][A-Za-z]{0,3})s?\)/g;
  for (const b of blocks) {
    if (b.type !== 'p' && b.type !== 'cap') continue;
    let m;
    while ((m = re.exec(b.text))) {
      const acr = m[1].replace(/s$/, ''), caps = acr.replace(/[^A-Z]/g, '').toLowerCase();
      if (caps.length < 2 || map[acr]) continue;
      const before = b.text.slice(Math.max(0, m.index - 140), m.index).trim().split(/\s+/).slice(-10);
      let ci = caps.length - 1, start = -1;
      for (let wi = before.length - 1; wi >= 0 && ci >= 0; wi--) {
        const w = before[wi].replace(/[^\p{L}\p{N}-]/gu, '');
        if (!w) break;
        const parts = w.split('-').filter(Boolean).reverse();
        let matched = false;
        for (const p of parts) if (ci >= 0 && p[0].toLowerCase() === caps[ci]) { ci--; matched = true; }
        if (matched) start = wi;
        else if (!STOP.has(w.toLowerCase())) break;
        if (ci < 0) break;
      }
      if (ci < 0 && start >= 0) map[acr] = before.slice(start).join(' ').replace(/^[^\p{L}]+|[^\p{L}\p{N})]+$/gu, '');
    }
  }
  return map;
}

if (typeof module !== 'undefined') module.exports = { pageLines, buildBlocks, findAcronyms };
