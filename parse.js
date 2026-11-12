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

function pageLines(items, W, H, page) {
  markExtFonts(items);
  // big extension glyphs hang below their reported baseline: cluster them by their visual centre
  const yc = it => it.ext ? it.y - it.h : it.s.trim() === '√' ? it.y - 0.8 * it.h : it.y;
  // rows: first full-size glyphs, then attach smaller ones (scripts) to the nearest row
  items = items.slice().sort((a, b) => yc(b) - yc(a) || a.x - b.x);
  const hist = {};
  items.forEach(i => { const k = Math.round(i.h * 2) / 2; hist[k] = (hist[k] || 0) + i.s.length; });
  const body = +(Object.entries(hist).sort((a, b) => b[1] - a[1])[0] || [10])[0];
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
  const big = items.filter(i => i.ext || i.h >= body * 0.86), small = items.filter(i => !(i.ext || i.h >= body * 0.86));
  const rows = cluster(big, []);
  const loose = [];
  small.forEach(it => {
    let best = null, bd = Infinity;
    rows.forEach(r => { const d = Math.abs(r.y - yc(it)); if (d < bd) { bd = d; best = r; } });
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
  const twoCol = sideAvg > 4 && minV < 0.3 * sideAvg;
  const g = (minB + 0.5) / N * W;

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
  const key = t => t.replace(/\d+/g, '#').toLowerCase();
  const cnt = {};
  lines.forEach(l => { const k = key(l.text); cnt[k] = (cnt[k] || new Set()).add(l.page); });
  const np = pages.length;
  lines = lines.filter(l => {
    const edge = l.y > l.H * 0.9 || l.y < l.H * 0.08;
    if (!edge) return true;
    if (/^\s*(page\s*)?\d{1,4}(\s*(of|\/)\s*\d+)?\s*$/i.test(l.text)) return false;
    if (np >= 3 && cnt[key(l.text)].size >= Math.max(3, np * 0.5)) return false;
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
  const isHeading = (l, prev) => {
    const t = l.text, bare = t.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.|[A-H]\.)\s+/, '');
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
    else if (isHeading(l, prev)) {
      close();
      const isTitle = !titleDone && l.page === 1 && l.h > body * 1.3 && !/^((\d+(\.\d+)*\.?)|([IVX]+\.))\s/.test(t) && !SECTION_WORDS.test(bare(t));
      const last = blocks[blocks.length - 1];
      if (isTitle && last && last.type === 'title') last.text += ' ' + t;
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
      if (endsSent(prev.text) && (indent || prevShort)) newPara = true;
      if (/^(fig(ure)?\.?|table)\s*\d+[.:|]/i.test(t)) newPara = true;
      if (inRefs && /^\[?\d{1,3}[\].)]\s/.test(t)) newPara = true;
      const mathy = x => { const p = x.text.replace(/[\uE000-\uE003]/g, ''); if ((p.match(/(^|[^\p{L}])[a-z]{3,}(?=[^\p{L}]|$)/gu) || []).length >= 3) return false; return /[\u0000-\u001F]/.test(p) || letters(p) < p.length * 0.55 || (p.length < 40 && x.x > x.left + 3 * body && x.xEnd < x.right - 3 * body); };
      if (mathy(l) !== mathy(prev)) newPara = true;
    }
    if (newPara && cur && cur.text) close();
    if (!cur) cur = { type: 'p', text: '', items: [] };
    if (!cur.items) cur.items = [];
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
  const words = t => (t.match(/(^|[^\p{L}])[a-z]{3,}(?=[^\p{L}]|$)/gu) || []).filter(w => !/^\W*(exp|sin|cos|tan|log|max|min|det|sinh|cosh|tanh|lim|sup|inf|arg)$/.test(w)).length;
  for (const b of blocks) {
    if (b.type !== 'p') continue;
    const t = plain(b.text);
    if (/^(fig(ure)?\.?|table)\s*\d+[.:|]/i.test(t)) b.type = 'cap';
    else if (t.length < 260 && letters(t) < t.length * 0.55 && words(t) < 3) b.type = 'eq';
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
    if (m && m.type === 'eq' && b.type === 'eq') { m.text += '  ' + b.text; m.items = (m.items || []).concat(b.items || []); }
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

