// ---------- equations: rebuild LaTeX from a PDF's glyphs and rules ----------
// A PDF stores where each glyph sits and where lines are drawn, not LaTeX. We rebuild structure:
//  - fraction bars and radical overlines come from drawn rules (thin rectangles/lines)
//  - small raised/lowered glyphs -> ^{} / _{}; limits on big operators
//  - rows inside big brackets without a bar -> matrices; an unmatched "{" -> cases
//  - TeX extension-font glyphs (big ( ) ∑ ∫ √) -> commands; accents; equation numbers -> \tag
const EQTEX = (() => {
  const GREEK = {'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\varepsilon','ϵ':'\\epsilon','ζ':'\\zeta','η':'\\eta','θ':'\\theta','ϑ':'\\vartheta','ι':'\\iota','κ':'\\kappa','λ':'\\lambda','μ':'\\mu','ν':'\\nu','ξ':'\\xi','π':'\\pi','ϖ':'\\varpi','ρ':'\\rho','ϱ':'\\varrho','σ':'\\sigma','ς':'\\varsigma','τ':'\\tau','υ':'\\upsilon','φ':'\\varphi','ϕ':'\\phi','χ':'\\chi','ψ':'\\psi','ω':'\\omega',
    'Γ':'\\Gamma','Δ':'\\Delta','Θ':'\\Theta','Λ':'\\Lambda','Ξ':'\\Xi','Π':'\\Pi','Σ':'\\Sigma','Υ':'\\Upsilon','Φ':'\\Phi','Ψ':'\\Psi','Ω':'\\Omega'};
  const SYM = {'−':'-','–':'-','×':'\\times ','·':'\\cdot ','⋅':'\\cdot ','∗':'*','≤':'\\le ','≥':'\\ge ','≪':'\\ll ','≫':'\\gg ','≈':'\\approx ','≃':'\\simeq ','≅':'\\cong ','∼':'\\sim ','≡':'\\equiv ','≠':'\\neq ','∝':'\\propto ',
    '∞':'\\infty ','∂':'\\partial ','∇':'\\nabla ','±':'\\pm ','∓':'\\mp ','→':'\\to ','←':'\\leftarrow ','↔':'\\leftrightarrow ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','↦':'\\mapsto ',
    '∈':'\\in ','∉':'\\notin ','⊂':'\\subset ','⊆':'\\subseteq ','∪':'\\cup ','∩':'\\cap ','∅':'\\emptyset ','∀':'\\forall ','∃':'\\exists ','¬':'\\neg ','∧':'\\wedge ','∨':'\\vee ',
    '⟨':'\\langle ','⟩':'\\rangle ','〈':'\\langle ','〉':'\\rangle ','†':'^\\dagger','‡':'\\ddagger ','ℏ':'\\hbar ','ℓ':'\\ell ','′':"'",'″':"''",'…':'\\ldots ','⋯':'\\cdots ','⊗':'\\otimes ','⊕':'\\oplus ','⊥':'\\perp ','∥':'\\parallel ','‖':'\\|','∘':'\\circ ','°':'^\\circ',
    '∑':'\\sum ','∏':'\\prod ','∫':'\\int ','∮':'\\oint ','√':'\\surd ','ℜ':'\\Re ','ℑ':'\\Im ','ℝ':'\\mathbb{R}','ℂ':'\\mathbb{C}','ℕ':'\\mathbb{N}','ℤ':'\\mathbb{Z}','ı':'\\imath ','ȷ':'\\jmath ',
    '{':'\\{','}':'\\}','#':'\\#','%':'\\%','&':'\\&','$':'\\$','_':'\\_','\\':'\\backslash ','~':'\\sim ','^':'\\wedge '};
  const ACCENT = {'ˆ':'\\hat','˜':'\\tilde','¯':'\\bar','ˉ':'\\bar','˙':'\\dot','¨':'\\ddot','ˇ':'\\check','˘':'\\breve','⃗':'\\vec','\u0302':'\\hat','\u0303':'\\tilde','\u0304':'\\bar','\u0307':'\\dot','\u0308':'\\ddot','\u20D7':'\\vec'};
  const FUNCS = new Set(['sin','cos','tan','cot','sec','csc','sinh','cosh','tanh','coth','arcsin','arccos','arctan','exp','log','ln','lg','det','dim','ker','deg','gcd','max','min','sup','inf','lim','arg','Pr','tr','Tr','sgn']);
  // TeX extension font (cmex) by character code
  const EXT = {};
  [['\u0000\u0010\u0012\u0020\u0030\u0040','(', 'open'],['\u0001\u0011\u0013\u0021\u0031\u0041',')','close'],['\u0002\u0014\u0022\u0032\u0068','[','open'],['\u0003\u0015\u0023\u0033\u0069',']','close'],
   ['\u0008\u001A\u0028\u0038\u003A\u003C\u003E\u006E','\\{','open'],['\u0009\u001B\u0029\u0039\u003B\u003D\u006F','\\}','close'],['\u000A\u001C\u002A\u0044','\\langle','open'],['\u000B\u001D\u002B\u0045','\\rangle','close'],
   ['\u000C\u0042','|','bar'],['\u000D\u0043','\\|','bar'],['\u0004\u0016\u0024\u0034','\\lfloor','open'],['\u0005\u0017\u0025\u0035','\\rfloor','close'],['\u0006\u0018\u0026\u0036','\\lceil','open'],['\u0007\u0019\u0027\u0037','\\rceil','close'],
   ['PX','\\sum','op'],['QY','\\prod','op'],['RZ','\\int','int'],['HI','\\oint','int'],['S[','\\bigcup','op'],['T\\','\\bigcap','op'],['NO','\\bigotimes','op'],['LM','\\bigoplus','op'],['pqrst','\\sqrt','sqrt']
  ].forEach(([cs, tex, role]) => { for (const c of cs) EXT[c] = {tex, role}; });
  // extension fonts that use real Unicode (Latin Modern, STIX, Cambria Math, ...)
  const UNI = {'∑':['\\sum','op'],'∏':['\\prod','op'],'∐':['\\coprod','op'],'⋃':['\\bigcup','op'],'⋂':['\\bigcap','op'],'⨁':['\\bigoplus','op'],'⨂':['\\bigotimes','op'],'∫':['\\int','int'],'∬':['\\iint','int'],'∭':['\\iiint','int'],'∮':['\\oint','int'],'√':['\\sqrt','sqrt'],
    '(':['(','open'],')':[')','close'],'[':['[','open'],']':[']','close'],'{':['\\{','open'],'}':['\\}','close'],'⟨':['\\langle','open'],'⟩':['\\rangle','close'],'〈':['\\langle','open'],'〉':['\\rangle','close'],'|':['|','bar'],'‖':['\\|','bar'],'∣':['|','bar'],
    '⌊':['\\lfloor','open'],'⌋':['\\rfloor','close'],'⌈':['\\lceil','open'],'⌉':['\\rceil','close'],
    '⎛':['(','open'],'⎞':[')','close'],'⎡':['[','open'],'⎤':[']','close'],'⎧':['\\{','open'],'⎫':['\\}','close'],'⌠':['\\int','int'],
    '\uF8EB':['(','open'],'\uF8F6':[')','close'],'\uF8EE':['[','open'],'\uF8F9':[']','close'],'\uF8F1':['\\{','open'],'\uF8FC':['\\}','close'],
    '\uF8EC':['','piece'],'\uF8ED':['','piece'],'\uF8F7':['','piece'],'\uF8F8':['','piece'],'\uF8EF':['','piece'],'\uF8F0':['','piece'],'\uF8FA':['','piece'],'\uF8FB':['','piece'],
    '\uF8F2':['','piece'],'\uF8F3':['','piece'],'\uF8F4':['','piece'],'\uF8FD':['','piece'],'\uF8FE':['','piece'],'\uF8E5':['','piece'],'\uF8E6':['','piece'],'\uF8E7':['','piece'],
    '⎜':['','piece'],'⎝':['','piece'],'⎟':['','piece'],'⎠':['','piece'],'⎢':['','piece'],'⎣':['','piece'],'⎥':['','piece'],'⎦':['','piece'],'⎨':['','piece'],'⎩':['','piece'],'⎪':['','piece'],'⎬':['','piece'],'⎭':['','piece'],'⎮':['','piece'],'⌡':['','piece']};
  const EXT_SIZE = c => { // total height (em) of cmex sizes
    const k = c.charCodeAt(0);
    if (k <= 0x0F) return 1.2; if (k <= 0x11) return 1.8; if (k <= 0x1F) return 2.4; if (k <= 0x2F) return 3.0;
    if (k >= 0x70 && k <= 0x74) return [1.0, 1.2, 1.8, 2.4, 3.0][k - 0x70];
    return 1.4;
  };
  const MATENV = {'(':'pmatrix','[':'bmatrix','\\{':'Bmatrix','|':'vmatrix','\\|':'Vmatrix'};
  const OPS_RE = /^[=+\-−<>≤≥≈∼≡,;]$/;
  const TAG_RE = /^\((\d+[a-z]?|[A-Z]?\d+(\.\d+)*[a-z]?)\)$/;
  const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

  let fontNames = {};
  const fam = it => {
    const n = fontNames[it.f] || '';
    if (/CMEX|esint/i.test(n)) return 'xc';                                       // code-based extension font
    if (/MathExtension|txex|pxex|Extension|Euclid.*Extra/i.test(n)) return 'xu'; // unicode extension font
    if (it.ext && (!n || /Mathematica/i.test(n))) return /[\u0000-\u001F]/.test(it.s) || /^[PQRSTXYZpqrst]$/.test(it.s.trim()) ? 'xc' : 'xu';
    if ((/Bold|CMBX|BX\d/i.test(n) || /\.B(\+|$)/.test(n)) && !/Italic/i.test(n)) return 'bf';
    if (/CMSY|MathSymbols|txsy|pxsy|Symbol/i.test(n)) return 'sy';
    if (/CMMI|MathItalic|txmi|pxmi|Italic|Oblique/i.test(n) || /\.I(\+|$)/.test(n)) return 'mi';
    return 'r';
  };
  const isExt = f => f === 'xc' || f === 'xu';
  const why = (flags, r) => { flags.bad++; (flags.why = flags.why || []).push(r); };

  // ---- characters -> LaTeX (with accents attached to the right letter) ----
  function texText(s, f, flags) {
    const atoms = []; let pendingAcc = null, k = 0;
    const push = a => { if (pendingAcc) { a = pendingAcc + '{' + a + '}'; pendingAcc = null; } atoms.push(a); };
    while (k < s.length) {
      const c = s[k];
      if (ACCENT[c]) {
        const next = s[k + 1];
        if (next && (/[A-Za-z]/.test(next) || GREEK[next])) pendingAcc = ACCENT[c];
        else if (atoms.length) atoms[atoms.length - 1] = ACCENT[c] + '{' + atoms[atoms.length - 1] + '}';
        k++; continue;
      }
      if (/[A-Za-z]/.test(c)) {
        let j = k; while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
        const word = s.slice(k, j);
        if (FUNCS.has(word)) push('\\' + word + ' ');
        else if (word === 'Re' || word === 'Im') push('\\mathrm{' + word + '}');
        else if (f === 'r' && word.length >= 2) push(word.length >= 4 ? '\\text{' + word + '}' : '\\mathrm{' + word + '}');
        else if (f === 'bf') push('\\mathbf{' + word + '}');
        else for (const ch of word) push(ch);
        k = j; continue;
      }
      if (/[0-9.,:;!?()\[\]|=+<>\/'*-]/.test(c)) push(c);
      else if (/\s/.test(c)) { if (f === 'r' && /[A-Za-z]{4,}/.test(s)) atoms.push('\\ '); }
      else if (GREEK[c]) push(f === 'bf' ? '\\boldsymbol{' + GREEK[c] + '}' : GREEK[c] + ' ');
      else if (SYM[c] !== undefined) push(SYM[c]);
      else if (/[\uE000-\uF8FF\uFFFD\u0000-\u001F]/.test(c)) why(flags, 'char ' + c.charCodeAt(0).toString(16));
      else push(c);
      k++;
    }
    return atoms.join('');
  }

  // ---- tokens ----
  function splitAccents(list) {
    const out = [];
    list.forEach(i => {
      if (i.kind || !i.s || i.s.trim().length < 2 || ![...i.s].some(c => ACCENT[c])) { out.push(i); return; }
      const chars = [...i.s], n = chars.length, cw = i.w / n;
      let buf = '', bx = 0;
      chars.forEach((c, k) => {
        const loose = ACCENT[c] && !(/[A-Za-zα-ωΑ-Ω]/.test(chars[k + 1] || ''));
        if (loose) {
          if (buf.trim()) out.push({...i, s: buf, x: i.x + bx * cw, w: buf.length * cw});
          out.push({...i, s: c, x: i.x + k * cw, w: cw}); buf = ''; bx = k + 1;
        } else buf += c;
      });
      if (buf.trim()) out.push({...i, s: buf, x: i.x + bx * cw, w: buf.length * cw});
    });
    return out;
  }
  function splitInterleaved(list) {
    const plain = list.filter(i => !i.kind && i.s && i.s.trim());
    const out = [];
    list.forEach(i => {
      if (i.kind || !i.s || i.s.length < 2) { out.push(i); return; }
      const n = i.s.length, cw = i.w / n;
      const cuts = new Map();
      plain.forEach(o => {
        if (o === i) return;
        const cx = o.x + Math.min(o.w, cw) / 2;
        if (cx > i.x + 0.6 * cw && cx < i.x + i.w - 0.4 * cw && Math.abs(o.y - i.y) < (o.h >= 0.86 * i.h ? 0.45 : 1.2) * i.h) { const c = Math.max(1, Math.min(n - 1, Math.round((o.x - i.x) / cw))); cuts.set(c, Math.max(cuts.get(c) || 0, o.x + Math.min(o.w, 2 * cw) * 0.6)); }
      });
      if (!cuts.size) { out.push(i); return; }
      let prev = 0, after = -Infinity;
      [...cuts.keys()].sort((a, b) => a - b).concat([n]).forEach(c => {
        const piece = i.s.slice(prev, c), lead = piece.length - piece.trimStart().length;
        if (piece.trim()) { const x = Math.max(i.x + (prev + lead) * cw, after); out.push({...i, s: piece.trim(), x, w: Math.max(0.5 * cw, i.x + c * cw - x)}); }
        after = cuts.get(c) || after; prev = c;
      });
    });
    return out;
  }
  function tokenize(list, flags) {
    return splitAccents(splitInterleaved(list)).filter(i => i.kind || i.s.trim()).map(i => {
      if (i.kind) return i;                                      // already built (fraction, matrix…)
      const f = fam(i), c = i.s.trim();
      const t = {it: i, x: i.x, x2: i.x + i.w, y: i.y, h: i.h, s: i.s, f, sub: [], sup: [], kind: 'text'};
      if (f === 'xc') { const e = EXT[c] || EXT[c[0]]; if (e) { t.kind = e.role; t.tex = e.tex; t.size = EXT_SIZE(c); } else { t.kind = 'junk'; why(flags, 'ext ' + c.charCodeAt(0).toString(16)); } }
      else if (f === 'xu') { const e = UNI[c] || UNI[c[0]]; if (e) { t.tex = e[0]; t.kind = e[1]; } }
      else if (c.length === 1 && UNI[c] && ['op', 'int', 'sqrt'].includes(UNI[c][1])) { t.tex = UNI[c][0]; t.kind = UNI[c][1]; }
      else if (c.length === 1 && ACCENT[c]) t.kind = 'accent';
      return t;
    });
  }

  // ---- one equation row -> LaTeX ----
  function row(list, depth, flags, rules) {
    let toks = tokenize(list, flags);
    if (!toks.length) return '';
    if (depth > 8) { why(flags, 'depth'); return ''; }
    const plain = toks.filter(t => t.kind === 'text' && !isExt(t.f));
    const hist = {};
    (plain.length ? plain : toks).forEach(t => { const k = Math.round(t.h * 2) / 2; hist[k] = (hist[k] || 0) + Math.min(2, Math.max(1, (t.s || 'x').trim().length)); });
    const sizes = Object.entries(hist).map(([k, v]) => [+k, v]);
    const total = sizes.reduce((a, b) => a + b[1], 0);
    const main = Math.max(...sizes.filter(([, v]) => v >= total * 0.2).map(([k]) => k));
    const isSmall = t => t.kind === 'text' && !isExt(t.f) && t.h < main * 0.86;
    toks.forEach(t => { t.small = isSmall(t); });
    const relTok = toks.filter(t => t.kind === 'text' && !t.small && /^[\s)]*[=≈<>≤≥∼≡]/.test(t.s)).sort((a, b) => a.x - b.x)[0];  // the leftmost relation sets the baseline
    const base = relTok ? relTok.y : median(toks.filter(t => t.kind === 'text' && !t.small).map(t => t.y).concat(toks.filter(t => t.kind === 'frac').map(t => t.y - 0.25 * main)));
    const yMid = t => t.kind === 'sqrt' ? (t.rule ? t.rule.y - 0.6 * main : t.y - 0.5 * t.h)
      : isExt(t.f) && t.size ? t.y + 0.04 * t.h - t.size * t.h / 2
      : isExt(t.f) ? t.y - 0.4 * t.h
      : (t.kind === 'frac' || t.kind === 'mat') ? t.y : t.y + 0.25 * t.h;

    // 1. standalone accents sit above their letter
    toks.filter(t => t.kind === 'accent').forEach(a => {
      const cx = (a.x + a.x2) / 2;
      const tgt = toks.filter(t => t !== a && t.kind === 'text' && !t.small && cx >= t.x - 0.5 && cx <= t.x2 + 0.5 && a.y >= t.y - 0.6 && a.y - t.y < 1.3 * main)
        .sort((p, q) => Math.abs((p.x + p.x2) / 2 - cx) - Math.abs((q.x + q.x2) / 2 - cx))[0];
      if (tgt) tgt.acc = ACCENT[a.s.trim()]; else why(flags, 'accent');
      a.drop = true;
    });
    toks = toks.filter(t => !t.drop);

    // 2. fraction bars (shortest first so nested fractions resolve inside-out) and radical overlines
    if (rules && rules.length) {
      const minx = Math.min(...toks.map(t => t.x)), maxx = Math.max(...toks.map(t => t.x2));
      const ys = toks.map(t => t.y), miny = Math.min(...ys), maxy = Math.max(...ys);
      let rs = rules.filter(r => !r.taken && r.x1 >= minx - 3 && r.x2 <= maxx + 3 && r.y > miny - 1.5 * main && r.y < maxy + 1.5 * main);
      rs = rs.filter((r, k) => !rs.some((q, j) => j < k && Math.abs(q.y - r.y) < 1.2 && Math.abs(q.x1 - r.x1) < 1.5 && Math.abs(q.x2 - r.x2) < 1.5));
      toks.filter(t => t.kind === 'sqrt' && !t.rule).forEach(sq => {
        const r = rs.find(r => !r.taken && Math.abs(r.x1 - sq.x2) < 2.5 && r.y > sq.y - 2.2 * main);
        if (r) { r.taken = true; sq.rule = r; }
      });
      rs.filter(r => !r.taken).forEach(r => {
        const inside = t => { const cx = (t.x + t.x2) / 2; return cx >= r.x1 - 0.5 && cx <= r.x2 + 0.5; };
        const below = toks.filter(t => inside(t) && yMid(t) < r.y && r.y - yMid(t) < 1.4 * main);
        const above = toks.filter(t => inside(t) && yMid(t) > r.y && yMid(t) - r.y < 2.6 * main);
        if (!below.length || above.length) return;
        const left = toks.filter(t => t.x2 <= r.x1 + 0.5 && Math.abs(yMid(t) - r.y) < 2 * main).sort((a, b) => b.x2 - a.x2)[0];
        if (left && r.x1 - left.x2 < 0.35 * main) return;
        r.taken = true;
        toks.push({kind: 'sqrt', x: r.x1 - 0.6 * main, x2: r.x1, y: r.y - main, h: main, f: 'r', s: '√', sub: [], sup: [], rule: r, drawn: true});
      });
      rs = rs.filter(r => !r.taken).sort((a, b) => (a.x2 - a.x1) - (b.x2 - b.x1));
      for (const r of rs) {
        const inside = t => { const cx = (t.x + t.x2) / 2; return cx >= r.x1 - 0.5 && cx <= r.x2 + 0.5; };
        const above = toks.filter(t => inside(t) && yMid(t) > r.y && yMid(t) - r.y < 2.6 * main);
        const below = toks.filter(t => inside(t) && yMid(t) < r.y && r.y - yMid(t) < 2.6 * main);
        if (!above.length || !below.length) continue;
        r.taken = true;
        const tf = Math.max(0, ...above.concat(below).filter(t => t.kind === 'text').map(t => t.h)) < main * 0.86;
        const fr = {kind: 'frac', x: r.x1, x2: r.x2, y: r.y, h: main, num: above, den: below, sub: [], sup: [], small: tf, tf, f: 'r', s: ''};
        toks = toks.filter(t => !above.includes(t) && !below.includes(t)); toks.push(fr);
      }
      toks.filter(t => t.kind === 'sqrt' && t.rule && !t.rad).forEach(sq => {
        const r = sq.rule;
        const rad = toks.filter(t => t !== sq && (t.x + t.x2) / 2 > r.x1 - 0.5 && (t.x + t.x2) / 2 < r.x2 + 0.5 && t.y < r.y + 0.3 && r.y - t.y < 2.4 * main);
        sq.rad = rad; sq.x2 = Math.max(sq.x2, r.x2);
        toks = toks.filter(t => !rad.includes(t));
      });
    }

    // 3. matrices / cases: rows inside big delimiters with no bar between them
    const delims = toks.filter(t => (t.kind === 'open' || t.kind === 'close') && isExt(t.f)).sort((a, b) => a.x - b.x);
    const pairs = []; const stack = [];
    delims.forEach(d => { if (d.kind === 'open') stack.push(d); else if (stack.length) pairs.push([stack.pop(), d]); });
    const unmatched = stack.filter(o => o.tex === '\\{');
    const makeMatrix = (o, c, env) => {
      const xEnd = c ? c.x + 0.5 : Infinity;
      const content = toks.filter(t => t !== o && t !== c && t.x >= o.x2 - 0.5 && t.x2 <= xEnd && !(t.kind === 'text' && TAG_RE.test(t.s.trim()) && !c));
      const big = content.filter(t => !t.small);
      const ys = [...new Set(big.map(t => Math.round(yMid(t))))].sort((a, b) => b - a);
      const bands = [];
      ys.forEach(y => { const b = bands[bands.length - 1]; if (b && b.lo - y < 0.9 * main) b.lo = y; else bands.push({hi: y, lo: y}); });
      if (bands.length < 2) return false;
      const rowsT = bands.map(() => []);
      content.forEach(t => { const y = yMid(t); let best = 0, bd = Infinity; bands.forEach((b, k) => { const d = y > b.hi ? y - b.hi : y < b.lo ? b.lo - y : 0; if (d < bd) { bd = d; best = k; } }); rowsT[best].push(t); });
      const rowsCells = rowsT.map(r => {
        r.sort((a, b) => a.x - b.x);
        const cells = [[]]; let prev = null;
        r.forEach(t => { if (prev && !t.small && t.x - prev.x2 > 0.9 * main) cells.push([]); cells[cells.length - 1].push(t); if (!t.small) prev = t; });
        if (env === 'cases' && cells.length > 2) { const first = cells.shift(); return [first, cells.flat()]; }
        return cells;
      });
      const mat = {kind: 'mat', env, rows: rowsCells, x: o.x, x2: c ? c.x2 : Math.max(...content.map(t => t.x2)), y: base + 0.25 * main, h: main, sub: c ? c.sub : [], sup: c ? c.sup : [], f: 'r', s: ''};
      toks = toks.filter(t => t !== o && t !== c && !content.includes(t)); toks.push(mat);
      return true;
    };
    pairs.sort((a, b) => (a[1].x - a[0].x) - (b[1].x - b[0].x)).forEach(([o, c]) => {
      if (toks.includes(o) && toks.includes(c)) makeMatrix(o, c, MATENV[o.tex] || 'matrix');
    });
    unmatched.forEach(o => { if (toks.includes(o)) makeMatrix(o, null, 'cases'); });

    // 4. levels for anything still stacked (fractions drawn without a detectable bar)
    const norm = toks.filter(t => !t.small);
    norm.forEach(t => {
      const r = (yMid(t) - (base + 0.25 * main)) / main;
      t.level = ['op', 'int', 'piece', 'junk', 'sqrt'].includes(t.kind) ? 'base' : r > 0.45 ? 'num' : r < -0.45 ? 'den' : 'base';
    });
    toks.filter(t => t.kind === 'op' || t.kind === 'int').forEach(op => {
      const n = norm.filter(t => t !== op && t.x >= op.x2 - 0.5 && t.kind !== 'op' && t.kind !== 'int').sort((a, b) => a.x - b.x)[0];
      op.level = n ? n.level : 'base';
    });
    // delimiters take the level of what they enclose (unless we know their exact size)
    toks.filter(t => ['open', 'close', 'bar'].includes(t.kind) && !(t.f === 'xc' && !(rules && rules.length))).forEach(d => {
      const inner = norm.filter(t => !['open', 'close', 'bar', 'piece', 'junk'].includes(t.kind) && (d.kind === 'close' ? t.x2 <= d.x + 0.5 : t.x >= d.x2 - 0.5))
        .sort((a, b) => d.kind === 'close' ? b.x2 - a.x2 : a.x - b.x)[0];
      d.level = inner ? inner.level : 'base';
    });
    const levelBase = {};
    ['base', 'num', 'den'].forEach(L => { const ys = norm.filter(t => t.level === L && t.kind === 'text').map(t => t.y); levelBase[L] = ys.length ? median(ys) : base; });

    let smalls = toks.filter(t => t.small);
    const used = new Set();
    // 5. limits of big operators
    toks.filter(t => t.kind === 'op' || t.kind === 'int').forEach(op => {
      smalls.forEach(s => {
        if (used.has(s)) return;
        const cx = (s.x + s.x2) / 2;
        const inLim = op.kind === 'op' ? cx >= op.x - 0.3 * main && cx <= op.x2 + 0.3 * main
                                       : s.x >= op.x + 0.15 * (op.x2 - op.x) && s.x <= op.x2 + 0.8 * main;
        if (!inLim) return;
        const lb = levelBase[op.level];
        if (s.y > lb + 0.15 * main) op.sup.push(s); else if (s.y < lb - 0.05 * main) op.sub.push(s); else return;
        used.add(s);
      });
    });
    smalls = smalls.filter(s => !used.has(s));
    // 6. a sub+sup pair stacked on one base (E_y^*), or a small fraction drawn without a bar
    const clusters = [];
    smalls.slice().sort((a, b) => a.x - b.x).forEach(s => {
      const c = clusters.find(c => s.x < c.x2 + 0.5 && s.x2 > c.x - 0.5);
      if (c) { c.m.push(s); c.x = Math.min(c.x, s.x); c.x2 = Math.max(c.x2, s.x2); } else clusters.push({x: s.x, x2: s.x2, m: [s]});
    });
    clusters.forEach(c => {
      const ys = [...new Set(c.m.map(s => Math.round(s.y)))].sort((a, b) => b - a);
      let gapAt = -1, gap = 0;
      for (let k = 1; k < ys.length; k++) if (ys[k - 1] - ys[k] > gap) { gap = ys[k - 1] - ys[k]; gapAt = k; }
      const sh = median(c.m.map(s => s.h));
      if (gapAt < 0 || gap < 0.45 * sh) return;
      const cut = (ys[gapAt - 1] + ys[gapAt]) / 2;
      const upper = c.m.filter(s => s.y > cut), lower = c.m.filter(s => s.y <= cut);
      const my = median(c.m.map(s => s.y));
      const L = toks.filter(t => !t.small && t.x2 <= c.x + 1 && (isExt(t.f) || t.kind !== 'text' || Math.abs(t.y - my) < main)).sort((a, b) => b.x2 - a.x2)[0];
      const scriptable = L && c.x - L.x2 < 0.4 * main && (L.kind === 'text' ? !/[=+\-−<>≤≥≈∼≡,;(\[{]$/.test(L.s.trim()) : ['close', 'bar', 'frac', 'mat', 'sqrt'].includes(L.kind));
      if (scriptable) { L.sup.push(...upper); L.sub.push(...lower); }
      else {
        const r = (cut - (base + 0.25 * main)) / main;
        toks.push({kind: 'frac', small: false, tiny: true, x: c.x, x2: c.x2, y: cut, h: sh, num: upper, den: lower, sub: [], sup: [], level: r > 0.45 ? 'num' : r < -0.45 ? 'den' : 'base', f: 'r', s: ''});
        if (rules && rules.length) flags.low++;
      }
      c.m.forEach(s => used.add(s));
    });
    smalls = smalls.filter(s => !used.has(s));
    // 7. remaining scripts attach to the glyph on their left
    smalls.forEach(s => {
      const cands = toks.filter(t => !t.small && !used.has(t) && t.x2 <= s.x + 1.5 && (isExt(t.f) || t.kind !== 'text' || Math.abs(t.y - s.y) < 0.95 * main));
      const L = cands.sort((a, b) => b.x2 - a.x2)[0];
      if (!L) { s.small = false; s.level = 'base'; return; }
      const ref = L.kind === 'text' && !isExt(L.f) ? L.y : (L.kind === 'frac' || L.kind === 'mat') ? L.y - 0.25 * main : levelBase[L.level || 'base'];
      const lh = L.kind === 'text' && !isExt(L.f) ? L.h : main;
      if (s.y > ref + 0.15 * lh) L.sup.push(s);
      else if (s.y < ref - 0.05 * lh) L.sub.push(s);
      else { s.small = false; s.level = L.level || 'base'; return; }
      used.add(s);
    });

    const flat = toks.filter(t => !used.has(t)).sort((a, b) => a.x - b.x || b.y - a.y);
    const ex2 = t => Math.max(t.x2, ...t.sub.map(q => q.x2), ...t.sup.map(q => q.x2));

    const scripts = t => (t.sub.length ? '_{' + row(t.sub, depth + 1, flags, rules) + '}' : '') + (t.sup.length ? '^{' + row(t.sup, depth + 1, flags, rules) + '}' : '');
    const emitTok = t => {
      switch (t.kind) {
        case 'frac': return ((t.tf || t.tiny) ? '\\tfrac{' : '\\frac{') + row(t.num, depth + 1, flags, rules) + '}{' + row(t.den, depth + 1, flags, rules) + '}' + scripts(t);
        case 'mat': {
          const body = t.rows.map(r => r.map(cell => row(cell, depth + 1, flags, rules)).join(' & ')).join(' \\\\ ');
          return '\\begin{' + t.env + '} ' + body + ' \\end{' + t.env + '}' + scripts(t) + ' ';
        }
        case 'open': return '\\left' + t.tex + ' ';
        case 'close': return '\\right' + t.tex + scripts(t) + ' ';
        case 'bar': return t.tex + scripts(t);
        case 'op': return t.tex + '\\limits' + scripts(t) + ' ';
        case 'int': return t.tex + scripts(t) + ' ';
        case 'sqrt': return '\\sqrt{' + (t.rad ? row(t.rad, depth + 1, flags, rules) : '') + '}' + scripts(t);
        case 'junk': case 'piece': return '';
        default: {
          let tx = texText(t.s, t.f, flags);
          if (t.acc) tx = t.acc + '{' + tx + '}';
          return tx + scripts(t);
        }
      }
    };
    const emitSeq = list => {
      let out = '', prev = null;
      for (let k = 0; k < list.length; k++) {
        const t = list[k];
        if (t.kind === 'sqrt' && !t.rad) { // no overline found: take what follows up to an operator
          const rad = [];
          let j = k + 1, end = t.x2;
          while (j < list.length && list[j].x < end + 0.45 * main && !(list[j].kind === 'text' && OPS_RE.test(list[j].s.trim()))) { rad.push(list[j]); end = list[j].x2; j++; }
          t.rad = rad; out += emitTok(t); prev = list[j - 1] || t; k = j - 1; continue;
        }
        if (prev && prev.kind !== 'op' && prev.kind !== 'int' && t.x - ex2(prev) > 1.4 * main && depth === 0) out += '\\quad ';
        out += emitTok(t); prev = t;
      }
      return out;
    };

    let out = '', k = 0, tag = '';
    if (depth === 0) {
      for (const n of [1, 2, 3]) {   // "(1)" may be one glyph run or three
        if (flat.length <= n) break;
        const tail = flat.slice(-n);
        if (!tail.every(t => t.kind === 'text' || t.kind === 'open' || t.kind === 'close')) continue;
        const txt = tail.map(t => (t.s || t.tex || '').trim()).join('');
        const m = txt.match(TAG_RE);
        if (m && tail[0].x - ex2(flat[flat.length - n - 1]) > 2 * main) { tag = '\\tag{' + m[1] + '}'; flat.splice(-n); break; }
      }
    }
    const pending = [];
    const flushBase = () => { if (pending.length) out += emitSeq(pending.splice(0)); };
    while (k < flat.length) {
      const t = flat[k];
      if (!t.level || t.level === 'base') { pending.push(t); k++; continue; }
      flushBase();
      let x2 = t.x2; const grp = [t]; k++;
      while (k < flat.length && flat[k].level && flat[k].level !== 'base' && flat[k].x < x2 + 0.6 * main) { grp.push(flat[k]); x2 = Math.max(x2, flat[k].x2); k++; }
      const num = grp.filter(g => g.level === 'num'), den = grp.filter(g => g.level === 'den');
      if (num.length && den.length) { out += '\\frac{' + emitSeq(num) + '}{' + emitSeq(den) + '}'; if (rules && rules.length) flags.low++; }
      else { why(flags, 'orphan ' + grp.map(g => g.level + ':' + (g.s || g.kind)).join(',')); out += emitSeq(grp); }
    }
    flushBase();
    return out + tag;
  }

  // split a block into equation rows (by equation numbers, else by vertical gaps), rebuild each
  function build(items, names, rules) {
    fontNames = names || {};
    const flags = {bad: 0, low: 0};
    const allItems = items;
    rules = (rules || []).concat(items.filter(i => i.overline).map(i => ({x1: i.x, x2: i.x + i.w, y: i.y + 0.75 * i.h})));
    rules = rules.filter((r, k) => !rules.some((q, m) => m < k && Math.abs(q.y - r.y) < 0.9 && Math.min(q.x2, r.x2) - Math.max(q.x1, r.x1) > 0.8 * Math.min(q.x2 - q.x1, r.x2 - r.x1)));
    rules.forEach(r => { r.taken = false; });
    items = items.filter(i => i.s && i.s.trim());
    const normal = items.filter(i => !isExt(fam(i)));
    rules = rules.concat([]);
    if (!normal.length) return {rows: [], ok: false};
    const hs = normal.map(i => i.h), main = Math.max(...hs.filter(h => h >= median(hs) * 0.9));
    const vy = i => isExt(fam(i)) ? i.y - i.h : i.y;
    const maxX = Math.max(...items.map(i => i.x + i.w));
    const tags = normal.filter(i => TAG_RE.test(i.s.trim()) && i.x + i.w > maxX - 2);
    let bands;
    if (tags.length >= 2) bands = tags.map(t => ({hi: t.y, lo: t.y})).sort((a, b) => b.hi - a.hi);
    else {
      const ys = [...new Set(normal.filter(i => i.h >= main * 0.86).map(i => i.y))].sort((a, b) => b - a);
      bands = [];
      ys.forEach(y => { const b = bands[bands.length - 1]; if (b && b.lo - y < 1.6 * main) b.lo = y; else bands.push({hi: y, lo: y}); });
    }
    const rowsItems = bands.map(() => []);
    items.forEach(i => {
      const y = vy(i);
      let best = 0, bd = Infinity;
      bands.forEach((b, k) => { const d = y > b.hi ? y - b.hi : y < b.lo ? b.lo - y : 0; if (d < bd) { bd = d; best = k; } });
      rowsItems[best].push(i);
    });
    const rows = rowsItems.map(r => {
      let tex = row(r, 0, flags, rules).replace(/\s+/g, ' ').trim();
      const l = (tex.match(/\\left/g) || []).length, rr = (tex.match(/\\right/g) || []).length;
      if (l !== rr) tex = tex.replace(/\\left/g, '').replace(/\\right/g, '');
      return tex;
    }).filter(Boolean);
    const fixed = rows.map(t => t.replace(/a\\mathrm\{rg\}/g, '\\arg ').replace(/\\mathrm\{a\}rg/g, '\\arg '));
    return {rows: fixed, ok: flags.bad === 0 && flags.low === 0 && rows.length > 0, why: flags.why || (flags.low ? ['no bar'] : [])};
  }

  // thin filled rectangles / horizontal strokes on a page = fraction bars and radical overlines
  async function pageRules(page, OPS, offset) {
    const ol = await page.getOperatorList();
    const rules = []; let ctm = [1, 0, 0, 1, 0, 0]; const stack = []; let pending = [], cur = null;
    const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    const ap = (x, y) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
    const [ox, oy] = offset || [0, 0];
    for (let k = 0; k < ol.fnArray.length; k++) {
      const fn = ol.fnArray[k], a = ol.argsArray[k];
      if (fn === OPS.save) stack.push(ctm.slice());
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, a);
      else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm.slice()); if (a && a[0]) ctm = mul(ctm, a[0]); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.constructPath) {
        const ops = a[0], args = a[1]; let j = 0;
        for (const op of ops) {
          if (op === OPS.rectangle) { const [x, y, w, h] = args.slice(j, j + 4); j += 4; const p1 = ap(x, y), p2 = ap(x + w, y + h); pending.push({x1: Math.min(p1[0], p2[0]), x2: Math.max(p1[0], p2[0]), y1: Math.min(p1[1], p2[1]), y2: Math.max(p1[1], p2[1])}); }
          else if (op === OPS.moveTo) { cur = ap(args[j], args[j + 1]); j += 2; }
          else if (op === OPS.lineTo) { const p = ap(args[j], args[j + 1]); j += 2; if (cur && Math.abs(p[1] - cur[1]) < 0.5 && Math.abs(p[0] - cur[0]) > 2) pending.push({x1: Math.min(p[0], cur[0]), x2: Math.max(p[0], cur[0]), y1: p[1] - 0.2, y2: p[1] + 0.2}); cur = p; }
          else if (op === OPS.curveTo) j += 6;
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) j += 4;
        }
      } else if ([OPS.fill, OPS.eoFill, OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(fn)) {
        for (const r of pending) { const h = r.y2 - r.y1, w = r.x2 - r.x1; if (h < 1.6 && w > 2 && w > h * 4) rules.push({x1: r.x1 - ox, x2: r.x2 - ox, y: (r.y1 + r.y2) / 2 - oy}); }
        pending = []; cur = null;
      } else if (fn === OPS.endPath) { pending = []; cur = null; }
    }
    return rules;
  }
  return {build, pageRules};
})();
if (typeof module !== 'undefined') module.exports = EQTEX;
