// Low-Battery Reader presets.
// Tune these from the feedback data: DEFAULTS is the 'Fine' baseline.
const DEFAULTS = {font:'Literata', size:18, lh:1.6, ls:0, ws:0, measure:68, theme:'white', bold:0, gradient:false, tint:false,
  focus:false, ruler:false, skim:false, acronyms:true, hideRefs:true, hideEq:false};
const PRESETS = {
  normal: {...DEFAULTS},
  tired:  {...DEFAULTS, font:'Atkinson Hyperlegible', size:20, lh:1.85, ls:0.02, ws:0.1, measure:60, theme:'cream', bold:0.4, gradient:true, hideEq:true},
  very:   {...DEFAULTS, font:'OpenDyslexic', size:20, lh:2.05, ls:0.03, ws:0.2, measure:52, theme:'cream', bold:0.45, gradient:true, focus:true, skim:true, hideEq:true},
};
