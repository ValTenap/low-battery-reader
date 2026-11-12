
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const docEl = $('#doc');

// ---------- settings ----------
const MARKUP_KEYS = new Set(['bold','tint','acronyms','skim','hideRefs','hideEq']);
// ---------- context from Zotero ----------
const ARGS = (window.arguments && window.arguments[0]) || null;
const Z = ARGS && ARGS.Zotero;
const PREF = 'extensions.lowbattery.settings';
function loadSettings() {
  try {
    const raw = Z ? Z.Prefs.get(PREF, true) : localStorage.getItem('lbr-settings');
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
let S = {...DEFAULTS, ...loadSettings()};
const save = () => {
  try { const v = JSON.stringify(S); if (Z) Z.Prefs.set(PREF, v, true); else localStorage.setItem('lbr-settings', v); } catch (e) {}
};

const fmt = {size:v=>v+'px', lh:v=>(+v).toFixed(2), ls:v=>(+v).toFixed(2)+'em', ws:v=>(+v).toFixed(2)+'em', measure:v=>v+'ch', bold:v=>v>0?Math.round(v*100)+'%':'off'};

function syncControls() {
  $$('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') el.checked = !!S[k]; else el.value = S[k];
  });
  $$('[data-o]').forEach(o => o.textContent = fmt[o.dataset.o](S[o.dataset.o]));
  $$('.sw').forEach(b => b.classList.toggle('on', b.dataset.theme === S.theme));
  $$('.font-opt').forEach(b => { const on = b.dataset.font === S.font; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  $$('[data-preset]').forEach(b => b.classList.toggle('on', Object.keys(DEFAULTS).every(k => PRESETS[b.dataset.preset][k] === S[k])));
}

function applyStyle() {
  const r = document.documentElement.style;
  const stack = {'Literata':"'Literata',Georgia,serif",'Inter':"Inter,system-ui,sans-serif",'Atkinson Hyperlegible':"'Atkinson Hyperlegible',sans-serif",'Lexend':"Lexend,sans-serif",'OpenDyslexic':"'OpenDyslexic',sans-serif",'Comic Neue':"'Comic Neue','Comic Sans MS',sans-serif"};
  r.setProperty('--font', stack[S.font] || S.font);
  r.setProperty('--size', S.size + 'px');
  r.setProperty('--lh', S.lh);
  r.setProperty('--ls', S.ls + 'em');
  r.setProperty('--ws', S.ws + 'em');
  r.setProperty('--measure', S.measure + 'ch');
  document.body.className = document.body.className.replace(/\bt-\w+/, '') .trim() + ' t-' + S.theme;
  document.body.classList.toggle('ruler', !!S.ruler); if (S.ruler) placeRuler(lastY);
  docEl.classList.toggle('focus', !!S.focus && !!DOC);
  if (S.focus && DOC && !docEl.querySelector('.blk.cur')) setCur(firstVisibleBlock());
}

function set(k, v, rerender) {
  S[k] = v; save(); syncControls(); applyStyle();
  if (rerender || MARKUP_KEYS.has(k)) render(); else schedulePaint();
}

$$('[data-k]').forEach(el => el.addEventListener('input', () => {
  const k = el.dataset.k;
  set(k, el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value);
}));
$$('.sw').forEach(b => b.addEventListener('click', () => set('theme', b.dataset.theme)));
$$('.font-opt').forEach(b => b.addEventListener('click', () => set('font', b.dataset.font)));
$$('[data-preset]').forEach(b => b.addEventListener('click', () => { S = {...PRESETS[b.dataset.preset]}; save(); syncControls(); applyStyle(); render(); }));

// ---------- document state ----------
let DOC = null; // {name, blocks, acr}

// characters XML (and so Zotero's windows) refuses: control chars, lone surrogates
const BAD_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const clean = s => String(s == null ? '' : s).replace(BAD_XML, '');
const esc = s => clean(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TINT = {b:'tl-b', d:'tl-d', p:'tl-p', q:'tl-q'};
function chars(s) {
  if (!S.tint) return esc(s);
  let o = '';
  for (const c of s) o += TINT[c] ? `<span class="${TINT[c]}">${c}</span>` : esc(c);
  return o;
}
function wordsHTML(text) {
  const acr = (S.acronyms && DOC && DOC.acr) || {};
  return text.split(/(\s+)/).map(tok => {
    if (!tok) return '';
    if (/^\s+$/.test(tok)) return ' ';
    const m = tok.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    const lead = m[1], core = m[2], trail = m[3];
    let inner;
    if (!core) inner = esc(tok);
    else {
      const k = S.bold > 0 ? Math.min(core.length, Math.max(1, Math.round(core.length * S.bold))) : 0;
      inner = esc(lead) + (k ? '<b>' + chars(core.slice(0, k)) + '</b>' : '') + chars(core.slice(k)) + esc(trail);
    }
    const key = core.replace(/s$/, '');
    const def = acr[core] || acr[key];
    return def && !lead.includes('(') ? `<span class="w acr" data-def="${esc(def)}">${inner}</span>` : `<span class="w">${inner}</span>`;
  }).join('');
}

let EMIT = [];
function blockHTML(b, i) {
  EMIT.push(i);
  const a = `class="blk BTYPE" data-i="${i}"`;
  switch (b.type) {
    case 'title': return `<h1 ${a.replace('BTYPE','')}>${wordsHTML(b.text)}</h1>`;
    case 'h': return `<h2 ${a.replace('BTYPE','')} id="sec-${i}">${wordsHTML(b.text)}</h2>`;
    case 'meta': return `<p ${a.replace('BTYPE','meta')}>${wordsHTML(b.text)}</p>`;
    case 'cap': return `<p ${a.replace('BTYPE','cap')}>${wordsHTML(b.text)}</p>`;
    case 'ref': return `<p ${a.replace('BTYPE','ref')}>${wordsHTML(b.text)}</p>`;
    case 'eq': return S.hideEq
      ? `<details class="blk eq" data-i="${i}"><summary>Equation (extracted text may be garbled)</summary><div class="eqraw">${esc(b.text)}</div></details>`
      : `<p ${a.replace('BTYPE','')}><span class="eqraw">${esc(b.text)}</span></p>`;
    default: return `<p ${a.replace('BTYPE','')}>${wordsHTML(b.text)}</p>`;
  }
}

function sectionsOf(blocks) {
  const secs = []; let cur = {head: null, items: []};
  blocks.forEach((b, i) => {
    if (b.type === 'h') { secs.push(cur); cur = {head: i, items: []}; }
    else cur.items.push(i);
  });
  secs.push(cur);
  return secs;
}

function render() {
  if (!DOC) return;
  const B = DOC.blocks;
  const curIdx = docEl.querySelector('.blk.cur')?.dataset.i;
  let order; // array of {label?, idx[]}
  if (!S.skim) order = [{idx: B.map((_, i) => i)}];
  else {
    const secs = sectionsOf(B), used = new Set();
    const name = s => s.head === null ? '' : B[s.head].text.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.)\s+/, '');
    const take = arr => { const r = arr.filter(i => !used.has(i)); r.forEach(i => used.add(i)); return r; };
    const top = take(B.map((b, i) => (b.type === 'title' || b.type === 'meta') ? i : -1).filter(i => i >= 0));
    let absSec = secs.find(s => /^abstract/i.test(name(s)));
    let abs = absSec ? take([absSec.head, ...absSec.items]) : take(secs[0].items.filter(i => B[i].type === 'p').slice(0, 2));
    const caps = take(B.map((b, i) => b.type === 'cap' ? i : -1).filter(i => i >= 0));
    const conSec = secs.find(s => /conclu/i.test(name(s))) || secs.find(s => /summary|outlook|discussion/i.test(name(s)));
    const con = conSec ? take([conSec.head, ...conSec.items]) : [];
    const rest = take(B.map((_, i) => i));
    order = [{idx: top}, {label: '1 · The gist', idx: abs}, {label: '2 · Figures at a glance', idx: caps},
             {label: '3 · How it ends', idx: con}, {label: '4 · The full paper', idx: rest}].filter(g => g.idx.length);
  }
  let html = '';
  EMIT = [];
  for (const g of order) {
    if (g.label) html += `<div class="group-label">${g.label}</div>`;
    let refs = '';
    for (const i of g.idx) {
      if (B[i].type === 'ref' && S.hideRefs) refs += blockHTML(B[i], i);
      else { if (refs) { html += foldRefs(refs); refs = ''; } html += blockHTML(B[i], i); }
    }
    if (refs) html += foldRefs(refs);
  }
  docEl.innerHTML = html;
  docEl.querySelectorAll('.blk').forEach((el, k) => { if (el.dataset.i === undefined && EMIT[k] !== undefined) el.dataset.i = EMIT[k]; });
  if (curIdx != null) docEl.querySelector(`.blk[data-i="${curIdx}"]`)?.classList.add('cur');
  applyStyle();
  buildOutline();
  if (typeof POS !== 'undefined') POS.mark();
  schedulePaint();
  onScroll();
}
const foldRefs = inner => `<details class="refs"><summary>References (${(inner.match(/class="blk ref"/g) || []).length}) · click to open</summary>${inner}</details>`;

function buildOutline() {
  const B = DOC.blocks, heads = B.map((b, i) => b.type === 'h' ? i : -1).filter(i => i >= 0);
  $('#outline').innerHTML = heads.length ? heads.map(i => {
    const sub = /^\d+\.\d+/.test(B[i].text);
    return `<a href="#" data-go="${i}" class="${sub ? 'sub' : ''}">${esc(B[i].text)}</a>`;
  }).join('') : '<span class="empty-note">No section headings found.</span>';
  $$('#outline a').forEach((a, k) => { if (!a.dataset.go && heads[k] !== undefined) a.dataset.go = heads[k]; });
  const acr = Object.entries(DOC.acr || {});
  $('#gloss').innerHTML = acr.length ? acr.map(([k, v]) => `<li><b>${esc(k)}</b>${esc(v)}</li>`).join('') : '<li class="empty-note">None detected.</li>';
}
$('#outline').addEventListener('click', e => {
  const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault();
  const el = docEl.querySelector(`.blk[data-i="${a.dataset.go}"]`);
  if (el) { el.scrollIntoView({behavior: 'smooth', block: 'start'}); if (S.focus) setCur(el); }
  document.body.classList.remove('side-open');
});

// ---------- line color gradient ----------
let paintTimer = null, painted = false;
function schedulePaint() { clearTimeout(paintTimer); paintTimer = setTimeout(paint, 60); }
function hexRGB(h) { h = h.trim().replace('#', ''); return [0, 2, 4].map(k => parseInt(h.substr(k, 2), 16)); }
function paint() {
  const ws = docEl.querySelectorAll('.blk .w');
  if (!S.gradient) { if (painted) ws.forEach(w => w.style.color = ''); painted = false; return; }
  const cs = getComputedStyle(document.body);
  const fg = hexRGB(cs.getPropertyValue('--fg')), A = hexRGB(cs.getPropertyValue('--ga')), Bc = hexRGB(cs.getPropertyValue('--gb'));
  const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  let line = [], lastTop = null, lastPar = null, n = 0;
  const flush = () => {
    if (!line.length) return;
    const ph = n % 4, [c0, c1] = ph === 0 ? [fg, A] : ph === 1 ? [A, fg] : ph === 2 ? [fg, Bc] : [Bc, fg];
    const L = line.length; line.forEach((w, i) => w.style.color = mix(c0, c1, L === 1 ? 0 : i / (L - 1)));
    n++; line = [];
  };
  for (const w of ws) {
    if (w.offsetParent === null) continue;
    const top = w.offsetTop, par = w.parentElement;
    if (par !== lastPar) { flush(); n = 0; }
    else if (Math.abs(top - lastTop) > 4) flush();
    line.push(w); lastTop = top; lastPar = par;
  }
  flush(); painted = true;
}
window.addEventListener('resize', schedulePaint);
docEl.addEventListener('toggle', schedulePaint, true);
document.fonts && document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', schedulePaint);

// ---------- focus ----------
function setCur(el) {
  if (!el) return;
  docEl.querySelectorAll('.blk.cur').forEach(b => b.classList.remove('cur'));
  el.classList.add('cur');
}
function firstVisibleBlock() {
  return [...docEl.querySelectorAll('.blk')].find(b => b.getBoundingClientRect().bottom > 80) || null;
}
docEl.addEventListener('click', e => {
  if (!S.focus) return;
  const b = e.target.closest('.blk'); if (b) setCur(b);
});
document.addEventListener('keydown', e => {
  if (!S.focus || !DOC || /input|textarea|select/i.test(e.target.tagName)) return;
  if (!['j', 'k', 'J', 'K'].includes(e.key)) return;
  const all = [...docEl.querySelectorAll('.blk')].filter(b => b.offsetParent !== null);
  const cur = docEl.querySelector('.blk.cur'), i = all.indexOf(cur);
  const nx = all[Math.max(0, Math.min(all.length - 1, i + (e.key.toLowerCase() === 'j' ? 1 : -1)))];
  if (nx) { setCur(nx); nx.scrollIntoView({behavior: 'smooth', block: 'center'}); }
});

// ---------- ruler ----------
let lastY = window.innerHeight / 3;
function placeRuler(y) {
  lastY = y;
  const h = S.size * S.lh * 1.35;
  $('#shTop').style.height = Math.max(0, y - h / 2) + 'px';
  $('#shBot').style.height = Math.max(0, window.innerHeight - y - h / 2) + 'px';
}
document.addEventListener('mousemove', e => { if (S.ruler) placeRuler(e.clientY); });

// ---------- progress ----------
function onScroll() {
  const h = document.documentElement.scrollHeight - innerHeight;
  $('#progress').style.width = (DOC && h > 0 ? Math.min(100, scrollY / h * 100) : 0) + '%';
}
addEventListener('scroll', onScroll, {passive: true});

// ---------- loading ----------
function status(msg, ms) {
  const s = $('#status'); s.textContent = msg; s.classList.toggle('show', !!msg);
  if (ms) setTimeout(() => s.classList.remove('show'), ms);
}
function loadBlocks(name, blocks, source) {
  DOC = {name, blocks, acr: findAcronyms(blocks)};
  $('#docName').textContent = name;
  docEl.querySelectorAll('.cur').forEach(b => b.classList.remove('cur'));
  render(); scrollTo(0, 0);
  if (typeof POS !== 'undefined') POS.offerResume();
  if (S.focus) setCur(docEl.querySelector('.blk'));
}

async function openPdfData(data, name, meta) {
  try {
    status('Opening ' + name + '…');
    const pdf = await pdfjsLib.getDocument({data, isEvalSupported: false}).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      status(`Reading page ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p), vp = page.getViewport({scale: 1}), tc = await page.getTextContent();
      const [x0, y0, x1, y1] = vp.viewBox;
      const items = tc.items.map(it => ({...it, str: clean(it.str)}))
        // keep horizontal text, including slightly tilted OCR text; drop sideways stamps
        .filter(it => it.str.trim() && Math.abs(it.transform[1]) < 0.25 * Math.abs(it.transform[0]) && Math.abs(it.transform[0]) > 0)
        .map(it => ({s: it.str, x: it.transform[4] - x0, y: it.transform[5] - y0, w: it.width, h: Math.hypot(it.transform[2], it.transform[3]) || it.height || 10}));
      pages.push(pageLines(items, x1 - x0, y1 - y0, p));
    }
    const parsed = buildBlocks(pages);
    const blocks = withMeta(parsed, meta);
    if (!parsed.some(b => b.type === 'p' || b.type === 'cap' || b.type === 'ref')) {
      if (meta) loadBlocks(name, blocks.concat([{type: 'meta', text: 'This PDF has no readable text layer, so only the library info is shown. It is probably a scanned paper; Zotero can’t reflow those without OCR.'}]));
      status('No text found in this PDF (probably a scan).', 7000);
      return;
    }
    loadBlocks(name, blocks, 'pdf');
    status(`Loaded ${pdf.numPages} pages`, 1800);
  } catch (err) {
    console.error(err);
    status('Could not read that PDF: ' + (err.message || err), 8000);
  }
}
async function openPdf(file) { openPdfData(new Uint8Array(await file.arrayBuffer()), file.name.replace(/\.pdf$/i, ''), null); }

// Put the library's metadata (exact title, authors, abstract) in front of the parsed text
function withMeta(blocks, meta) {
  if (!meta) return blocks;
  let out = blocks.slice();
  const head = [];
  if (meta.title) { out = out.filter(b => b.type !== 'title'); head.push({type: 'title', text: meta.title}); }
  const by = [meta.creators, meta.publication, meta.year].filter(Boolean).join(' · ');
  if (by) { head.push({type: 'meta', text: by}); if (meta.creators) out = out.filter(b => b.type !== 'meta'); }
  const hasAbs = out.some(b => b.type === 'h' && /^abstract/i.test(b.text));
  if (meta.abstract && !hasAbs) head.push({type: 'h', text: 'Abstract'}, {type: 'p', text: meta.abstract});
  return head.concat(out);
}

async function readFileBytes(path) {
  if (typeof IOUtils !== 'undefined') return await IOUtils.read(path);
  const bin = await Z.File.getBinaryContentsAsync(path);
  const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 255; return u;
}

const pick = () => $('#file').click();
$('#openBtn').onclick = pick; $('#openBtn2').onclick = pick;
$('#file').onchange = e => { const f = e.target.files[0]; if (f) openPdf(f); e.target.value = ''; };
let dragN = 0;
addEventListener('dragenter', e => { e.preventDefault(); dragN++; document.body.classList.add('dragging'); });
addEventListener('dragleave', e => { if (--dragN <= 0) { dragN = 0; document.body.classList.remove('dragging'); } });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => {
  e.preventDefault(); dragN = 0; document.body.classList.remove('dragging');
  const f = [...(e.dataTransfer.files || [])].find(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
  if (f) openPdf(f); else status('That doesn’t look like a PDF.', 2500);
});
$('#menuBtn').onclick = () => document.body.classList.toggle('side-open');

// sample
const SAMPLE = [
  {type:'title', text:'Hiding Images in the Polarization of Structured Light'},
  {type:'meta', text:'A sample paper for trying out the reader'},
  {type:'h', text:'Abstract'},
  {type:'p', text:'We show that an image can be concealed in the spatially varying polarization of a laser beam while its intensity profile stays perfectly smooth. Using a spatial light modulator (SLM) and a quarter-wave plate (QWP), we write a hidden pattern that only appears in a polarization-resolved measurement. A camera without a polarizer sees an ordinary Gaussian spot.'},
  {type:'h', text:'1 Introduction'},
  {type:'p', text:'Steganography hides the existence of a message, not just its content. Most optical schemes encode information in intensity or phase, which a careful observer can detect. Polarization is a quieter carrier: the human eye and most detectors are blind to it.'},
  {type:'p', text:'Vector beams, whose polarization changes across the transverse plane, are now routine to generate with liquid-crystal devices such as the SLM or a q-plate. Here we ask how much information such a beam can carry while remaining invisible to an intensity measurement, and how robustly the receiver can recover it.'},
  {type:'h', text:'2 Method'},
  {type:'p', text:'The SLM imprints a phase difference between two orthogonal polarization components. The QWP then converts this phase into a spatially varying polarization state. The receiver measures the Stokes parameters with a rotating polarizer and recovers the image from the map of S2.'},
  {type:'eq', text:'S1 = |Ex|2 − |Ey|2 ,  S2 = 2 Re(Ex E*y)   (1)'},
  {type:'p', text:'Because the total intensity S0 is unchanged by the encoding, the beam looks identical with or without the hidden image unless one looks through a polarizer at the right angle.'},
  {type:'h', text:'3 Results'},
  {type:'cap', text:'Figure 1: Intensity image (left) and recovered S2 map (right). The hidden letters appear only in the polarization measurement.'},
  {type:'p', text:'We recovered the hidden image with high fidelity across a range of beam powers. Misalignment of the receiver polarizer by a few degrees reduced contrast but did not destroy the image, which suggests the scheme is tolerant to modest errors.'},
  {type:'cap', text:'Figure 2: Image contrast versus receiver polarizer angle.'},
  {type:'h', text:'4 Conclusions'},
  {type:'p', text:'Polarization can carry a concealed image that is invisible to intensity detectors. The approach needs only standard components and could be combined with encryption to protect the content as well as its existence.'},
  {type:'h', text:'References'},
  {type:'ref', text:'[1] A. Person, “A first reference,” Opt. Lett. 12, 345 (2020).'},
  {type:'ref', text:'[2] B. Person and C. Person, “A second reference,” APL Photonics 5, 1 (2021).'},
];
$('#sampleBtn').onclick = () => loadBlocks('Sample paper', SAMPLE, 'sample');

// ---------- reading position: "you stopped here" ----------
const POS = (() => {
  const PREF = 'extensions.lowbattery.positions', LS = 'lbr-positions', MAX = 300;
  const hasZ = () => typeof Z !== 'undefined' && Z;
  function key() {
    const id = typeof ARGS !== 'undefined' && ARGS && ARGS.meta && ARGS.meta.itemID;
    return id ? 'z' + id : 'f:' + (DOC ? DOC.name : '') + '|' + (DOC ? DOC.blocks.length : 0);
  }
  function all() {
    try { const raw = hasZ() ? Z.Prefs.get(PREF, true) : localStorage.getItem(LS); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function write(map) {
    const keys = Object.keys(map).sort((a, b) => (map[b].at || 0) - (map[a].at || 0));
    keys.slice(MAX).forEach(k => delete map[k]);
    try { const v = JSON.stringify(map); if (hasZ()) Z.Prefs.set(PREF, v, true); else localStorage.setItem(LS, v); } catch (e) {}
  }
  function get() { return DOC ? all()[key()] || null : null; }
  function save(pos) {
    if (!DOC) return;
    const map = all(); map[key()] = {...pos, at: Date.now()}; write(map);
    mark();
  }
  function clear() { const map = all(); delete map[key()]; write(map); mark(); }

  function wordEl(pos) {
    const b = docEl.querySelector(`.blk[data-i="${pos.blk}"]`);
    if (!b) return null;
    const ws = b.querySelectorAll('.w');
    return ws.length ? ws[Math.min(pos.wi || 0, ws.length - 1)] : b;
  }
  function mark() {
    docEl.querySelectorAll('.stop-here').forEach(e => e.classList.remove('stop-here'));
    const p = get(); if (!p) return null;
    const w = wordEl(p); if (w) w.classList.add('stop-here');
    return w;
  }
  function jump() {
    const w = mark(); if (!w) return;
    w.scrollIntoView({block: 'center', behavior: 'smooth'});
    const b = w.closest('.blk'); if (b && S.focus) setCur(b);
    w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash');
  }
  function sectionOf(blk) {
    for (let k = blk; k >= 0; k--) if (DOC.blocks[k] && DOC.blocks[k].type === 'h') return DOC.blocks[k].text;
    return '';
  }

  // banner when reopening a paper
  function ago(ms) {
    const m = Math.round(ms / 60000);
    if (m < 2) return 'just now'; if (m < 60) return m + ' minutes ago';
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function offerResume() {
    const bar = $('#resume'); if (!bar) return;
    const p = get();
    if (!p || (p.blk <= 1 && !p.wi)) { bar.hidden = true; return; }
    const sec = p.section ? ' in “' + p.section.replace(/^(\d+(\.\d+)*\.?|[IVX]+\.)\s+/, '') + '”' : '';
    $('#resumeText').textContent = 'You stopped at ' + Math.round((p.pct || 0) * 100) + '%' + sec + ', ' + ago(Date.now() - p.at) + '.';
    bar.hidden = false;
  }
  function wire() {
    $('#resumeJump') && ($('#resumeJump').onclick = () => { $('#resume').hidden = true; jump(); });
    $('#resumeClose') && ($('#resumeClose').onclick = () => { $('#resume').hidden = true; });
    // Shift+click a word to mark your place
    docEl.addEventListener('click', e => {
      if (!e.shiftKey || !DOC) return;
      const w = e.target.closest('.w'), b = e.target.closest('.blk');
      if (!w || !b) return;
      e.preventDefault(); window.getSelection && window.getSelection().removeAllRanges();
      const wi = [...b.querySelectorAll('.w')].indexOf(w), blk = +b.dataset.i;
      save({blk, wi, pct: blk / Math.max(1, DOC.blocks.length - 1), section: sectionOf(blk), src: 'manual'});
      status('Place marked 📍', 1500);
    });
    // normal reading: after lingering on a paragraph, move the bookmark forward (never backward)
    let t = null;
    addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!DOC) return;
        const b = firstVisibleBlock(); if (!b) return;
        const blk = +b.dataset.i, p = get();
        if (p && blk <= p.blk) return;
        save({blk, wi: 0, pct: blk / Math.max(1, DOC.blocks.length - 1), section: sectionOf(blk), src: 'scroll'});
      }, 6000);
    }, {passive: true});
  }
  return {get, save, clear, mark, jump, offerResume, wire, sectionOf};
})();
POS.wire();


// close with Ctrl/Cmd+W
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') { e.preventDefault(); window.close(); } });

syncControls(); applyStyle();
if (ARGS && ARGS.meta) {
  const m = ARGS.meta;
  document.title = (m.title || 'Paper') + ' · Low-Battery Reader';
  $('#welcome').style.display = 'none';
  readFileBytes(m.path).then(data => openPdfData(data, m.title || 'Paper', m))
    .catch(err => { $('#welcome').style.display = ''; status('Could not open the PDF file: ' + (err.message || err), 8000); });
}
