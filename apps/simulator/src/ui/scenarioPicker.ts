import { SCENARIOS } from '../config/presets';
import { openModal, closeModal } from './modal';
import { bidi } from './equations';
import { L, isRTL, tr } from './lang';

const road = `<polygon points="74,14 146,14 206,116 14,116" fill="#141a24"/>
  <line x1="110" y1="14" x2="110" y2="116" stroke="#2a3646" stroke-width="2" stroke-dasharray="5 6"/>
  <line x1="74" y1="14" x2="14" y2="116" stroke="#00e0ff" stroke-opacity=".4" stroke-width="2"/>
  <line x1="146" y1="14" x2="206" y2="116" stroke="#00e0ff" stroke-opacity=".4" stroke-width="2"/>`;
const ego = `<rect x="96" y="94" width="28" height="22" rx="6" fill="#12212f" stroke="#00e0ff" stroke-width="1.5"/>`;

function preview(key: string): string {
  let el = '';
  if (key === 'cutin')
    el = `<rect x="150" y="50" width="22" height="16" rx="4" fill="#7a3038" stroke="#39d98a"/>
      <path d="M148 58 L120 62" stroke="#ffb020" stroke-width="2"/><path d="M126 59 L120 62 L126 65" stroke="#ffb020" stroke-width="2" fill="none"/>`;
  else if (key === 'hardBrake')
    el = `<rect x="98" y="46" width="24" height="18" rx="4" fill="#7a3038" stroke="#ff5560"/>
      <circle cx="103" cy="62" r="3" fill="#ff2d3a"/><circle cx="117" cy="62" r="3" fill="#ff2d3a"/>`;
  else if (key === 'pedestrian')
    el = `<g fill="rgba(235,238,242,.55)"><rect x="66" y="54" width="9" height="22"/><rect x="86" y="54" width="9" height="22"/><rect x="106" y="54" width="9" height="22"/><rect x="126" y="54" width="9" height="22"/></g>
      <circle cx="110" cy="42" r="6" fill="#e2cba6"/><rect x="103" y="47" width="14" height="17" rx="4" fill="#8a94a4"/>`;
  else if (key === 'child')
    el = `<circle cx="106" cy="46" r="5" fill="#f2c191"/><rect x="100" y="50" width="12" height="14" rx="3" fill="#ff7043"/>
      <circle cx="128" cy="60" r="6" fill="#ff6a2a" stroke="#7a2d10"/>`;
  else if (key === 'fog')
    el = `<rect x="99" y="50" width="22" height="16" rx="4" fill="#39414d" stroke="#8aa0b5"/>
      <rect x="14" y="14" width="192" height="102" fill="#c8ced6" opacity=".38"/>`;
  else if (key === 'roadworks')
    el = `<rect x="90" y="52" width="40" height="12" rx="2" fill="#ffb020"/>
      <polygon points="98,52 94,66 102,66" fill="#ff6a2a"/><polygon points="122,52 118,66 126,66" fill="#ff6a2a"/>`;
  else if (key === 'jam')
    el = `<rect x="99" y="48" width="22" height="15" rx="4" fill="#7a3038" stroke="#39d98a"/>
      <rect x="66" y="60" width="18" height="13" rx="3" fill="#39414d"/><rect x="136" y="60" width="18" height="13" rx="3" fill="#39414d"/>
      <rect x="150" y="26" width="9" height="22" rx="2" fill="#0a0d12"/><circle cx="154.5" cy="33" r="3.4" fill="#ff2d3a"/>`;
  if (key === 'roundabout')
    return `<svg viewBox="0 0 220 120"><rect width="220" height="120" fill="#0a1512"/>
      <circle cx="110" cy="60" r="34" fill="none" stroke="#2a3646" stroke-width="14"/>
      <circle cx="110" cy="60" r="17" fill="#1e6437"/>
      <rect x="100" y="94" width="20" height="18" rx="4" fill="#12212f" stroke="#00e0ff"/></svg>`;
  return `<svg viewBox="0 0 220 120">${road}${el}${ego}</svg>`;
}

export function openScenarioPicker(currentKey: string, onPick: (key: string) => void): void {
  const rtl = isRTL();
  const cls = rtl ? ' rtl' : '';
  const cards = Object.entries(SCENARIOS)
    .map(
      ([key, sc]) =>
        `<div class="pcard${key === currentKey ? ' on' : ''}" data-key="${key}">${preview(key)}` +
        `<div class="body"><div class="nm">${L(sc.name)}</div><div class="ch${cls}">${rtl ? bidi(L(sc.challenge)) : L(sc.challenge)}</div></div></div>`,
    )
    .join('');
  const title = rtl ? 'בחירת תרחיש' : 'Scenario Select';
  openModal(`<h3>${title}</h3><div class="sub${cls}">${tr('scenario')}</div><div class="pickgrid">${cards}</div>`);
  document.querySelectorAll<HTMLElement>('.pcard').forEach((c) =>
    c.addEventListener('click', () => {
      onPick(c.dataset.key!);
      closeModal();
    }),
  );
}
