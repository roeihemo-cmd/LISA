// Design system: color tokens + the global stylesheet for the engineering bench.

export const COLORS = {
  bg: '#080b11',
  panel: '#0d121b',
  panel2: '#111826',
  edge: '#1c2635',
  ink: '#e7edf5',
  dim: '#8a97a8',
  faint: '#586675',
  cyan: '#00e0ff',
  green: '#39d98a',
  amber: '#ffb020',
  red: '#ff4d6d',
  truth: '#00e0ff', // TRUE range
  est: '#39d98a', // ESTIMATED range
};

export function injectStyles(): void {
  const css = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${COLORS.bg}; color: ${COLORS.ink};
    font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .mono { font-family: "SF Mono", "JetBrains Mono", Consolas, monospace; font-variant-numeric: tabular-nums; }

  #app { display: grid; grid-template-columns: 300px 1fr 340px; height: 100vh; }
  .rail { background: ${COLORS.panel}; border-right: 1px solid ${COLORS.edge}; overflow-y: auto; padding: 16px; }
  .rail.right { border-right: none; border-left: 1px solid ${COLORS.edge}; }
  .stage { position: relative; display: flex; flex-direction: column; min-width: 0; }

  .brand { font-weight: 700; letter-spacing: .04em; font-size: 1.05rem; }
  .brand small { display:block; color: ${COLORS.dim}; font-weight: 400; font-size: .68rem; letter-spacing:.14em; text-transform:uppercase; margin-top:2px; }
  .sec { color: ${COLORS.faint}; font-size: .66rem; letter-spacing: .16em; text-transform: uppercase; margin: 20px 0 8px; }

  .ctl { margin-bottom: 12px; }
  .ctl label { display: flex; justify-content: space-between; font-size: .8rem; color: ${COLORS.dim}; margin-bottom: 5px; }
  .ctl label b { color: ${COLORS.cyan}; font-weight: 600; }
  .ctl input[type=range] { width: 100%; accent-color: ${COLORS.cyan}; }
  .ctl select { width: 100%; background: ${COLORS.panel2}; color: ${COLORS.ink}; border: 1px solid ${COLORS.edge}; border-radius: 8px; padding: 8px 10px; font-size: .85rem; }

  canvas { display: block; }
  .worldwrap { flex: 1; position: relative; min-height: 0; }
  #world { width: 100%; height: 100%; }

  .hud { position: absolute; top: 14px; left: 16px; pointer-events: none; }
  .hud .row { font-size: 1.05rem; font-weight: 700; letter-spacing: .02em; }
  .hud .k { color: ${COLORS.dim}; font-weight: 500; font-size: .8rem; }

  .banner { position:absolute; top:50%; left:0; right:0; transform:translateY(-50%); text-align:center;
    font-weight:800; letter-spacing:.06em; font-size:1.5rem; text-shadow:0 0 20px currentColor; pointer-events:none; }

  .transport { position: absolute; top: 14px; right: 16px; display: flex; gap: 8px; }
  .transport button { background: ${COLORS.panel2}; color: ${COLORS.ink}; border: 1px solid ${COLORS.edge};
    border-radius: 8px; padding: 8px 14px; font-size: .82rem; cursor: pointer; }
  .transport button:hover { border-color: ${COLORS.cyan}; }

  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tile { background: ${COLORS.panel2}; border: 1px solid ${COLORS.edge}; border-radius: 10px; padding: 9px 11px; }
  .tile .k { color: ${COLORS.faint}; font-size: .6rem; letter-spacing: .1em; text-transform: uppercase; }
  .tile .v { font-size: 1.15rem; font-weight: 700; margin-top: 2px; }

  .plot { background: ${COLORS.panel2}; border: 1px solid ${COLORS.edge}; border-radius: 10px; padding: 8px; margin-top: 10px; }
  .plot .cap { font-size: .62rem; color: ${COLORS.faint}; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between; }
  .legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:3px; vertical-align:middle; }

  .eqcard { background: ${COLORS.panel2}; border: 1px solid ${COLORS.edge}; border-left: 3px solid ${COLORS.cyan};
    border-radius: 10px; padding: 11px 12px; margin-top: 10px; }
  .eqcard .t { font-size: .78rem; font-weight: 700; color: ${COLORS.cyan}; margin-bottom: 6px; }
  .eqcard .f { font-size: .84rem; }
  .eqcard .sub { color: ${COLORS.dim}; font-size: .74rem; margin-top: 6px; }
  .reasons { margin-top:8px; font-size:.72rem; color:${COLORS.amber}; }

  .eqcard .hd { display:flex; justify-content:space-between; align-items:center; }
  .infobtn { width:20px; height:20px; border-radius:50%; border:1px solid ${COLORS.edge};
    background:${COLORS.panel}; color:${COLORS.cyan}; font:600 11px/1 monospace; cursor:pointer; flex:0 0 auto; }
  .infobtn:hover { border-color:${COLORS.cyan}; background:rgba(0,224,255,.1); }

  .scenbtn { width:100%; text-align:left; background:${COLORS.panel2}; color:${COLORS.ink};
    border:1px solid ${COLORS.edge}; border-radius:10px; padding:11px 12px; cursor:pointer; display:flex;
    justify-content:space-between; align-items:center; }
  .scenbtn:hover { border-color:${COLORS.cyan}; }
  .scenbtn .nm { font-weight:700; font-size:.9rem; }
  .scenbtn .go { color:${COLORS.cyan}; font-size:.72rem; }

  .overlay { position:fixed; inset:0; background:rgba(4,7,12,.72); backdrop-filter:blur(3px);
    display:none; align-items:center; justify-content:center; z-index:50; }
  .overlay.show { display:flex; }
  .modal { background:${COLORS.panel}; border:1px solid ${COLORS.edge}; border-radius:14px; width:min(560px,92vw);
    max-height:86vh; overflow-y:auto; padding:22px 24px; box-shadow:0 20px 60px rgba(0,0,0,.6); }
  .modal h3 { color:${COLORS.cyan}; font-size:1.1rem; margin-bottom:4px; }
  .modal .close { float:right; background:${COLORS.panel2}; color:${COLORS.ink}; border:1px solid ${COLORS.edge};
    border-radius:8px; padding:5px 10px; font-size:.76rem; cursor:pointer; }
  .modal .sub { color:${COLORS.dim}; font-size:.82rem; margin:6px 0 14px; }
  .modal .eqf { font-family:'Cambria Math','Georgia',serif; background:linear-gradient(180deg,#0c141d,#0a1119);
    border:1px solid ${COLORS.edge}; border-left:3px solid ${COLORS.cyan}; border-radius:8px;
    padding:16px 14px; margin:10px 0; font-size:1.25rem; text-align:center; letter-spacing:.01em; color:#eaf2fb; overflow-x:auto; }
  .modal .eqf sub, .dstep .f sub { font-size:.62em; }
  .modal .eqf sup, .dstep .f sup { font-size:.7em; }
  .rtl { direction:rtl; text-align:right; }
  .rtl bdi { color:${COLORS.cyan}; margin:0 .12em; }
  .termrow { padding:9px 2px; border-bottom:1px solid ${COLORS.edge}; }
  .termrow:last-child { border-bottom:none; }
  .termrow .sym { font-family:monospace; color:${COLORS.amber}; font-weight:700; font-size:.9rem; margin-bottom:3px; }
  .termrow .exp { color:${COLORS.ink}; font-size:.86rem; line-height:1.6; }
  .derivbox { margin-top:14px; background:#0a1119; border:1px solid ${COLORS.edge}; border-radius:10px; padding:12px 14px; }
  .derivbox .dt { font-family:monospace; font-size:.68rem; color:${COLORS.cyan}; letter-spacing:.14em; text-transform:uppercase; margin-bottom:8px; }
  .derivbox .dof { color:${COLORS.amber}; font-size:.82rem; margin-bottom:10px; }
  .dstep { display:flex; gap:12px; align-items:baseline; padding:6px 0; border-bottom:1px solid ${COLORS.edge}; }
  .dstep:last-child { border-bottom:none; }
  .dstep .f { font-family:monospace; color:${COLORS.green}; font-size:.9rem; direction:ltr; flex:0 0 auto; }
  .dstep .n { font-size:.8rem; color:${COLORS.dim}; flex:1; }
  .modal .note { margin-top:12px; font-size:.8rem; color:${COLORS.dim}; }

  .spec table { width:100%; border-collapse:collapse; }
  .spec td { padding:8px 6px; border-bottom:1px solid ${COLORS.edge}; font-size:.84rem; vertical-align:top; }
  .spec td:last-child { text-align:right; font-family:monospace; color:${COLORS.cyan}; white-space:nowrap; }
  .spec .ex { color:${COLORS.faint}; font-size:.72rem; margin-top:2px; }

  .pickgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .pcard { background:${COLORS.panel2}; border:1px solid ${COLORS.edge}; border-radius:12px; overflow:hidden; cursor:pointer; transition:.12s; }
  .pcard:hover { transform:translateY(-2px); border-color:${COLORS.cyan}; }
  .pcard.on { border-color:${COLORS.cyan}; box-shadow:0 0 0 1px ${COLORS.cyan}; }
  .pcard svg { display:block; width:100%; height:auto; background:#0a0f16; }
  .pcard .body { padding:9px 11px; }
  .pcard .nm { font-weight:700; font-size:.86rem; }
  .pcard .ch { font-size:.72rem; color:${COLORS.dim}; line-height:1.4; margin-top:3px; }
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}
