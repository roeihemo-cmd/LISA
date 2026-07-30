import type { SimConfig } from '../config/schema';
import { G, msToKmh } from '../core/units';
import { openModal } from './modal';
import { bidi } from './equations';

const ROUND_R = 25; // reference cornering radius [m]

function row(label: string, value: string, ex: string): string {
  return `<tr><td>${label}<div class="ex rtl">${bidi(ex)}</div></td><td>${value}</td></tr>`;
}

/** Live physics spec sheet for the current vehicle at the current speed. */
export function openSpecSheet(cfg: SimConfig, egoSpeedMs: number): void {
  const V = cfg.vehicle;
  const ve = egoSpeedMs;
  const vKmh = msToKmh(ve);
  const decel = V.mu * G;
  const lat = cfg.decision.tDsp + cfg.decision.tFilter + V.actuatorLatency;
  const dReact = ve * lat;
  const dMech = (ve * ve) / (2 * decel);
  const dReq = dReact + dMech + cfg.decision.safetyBuffer;
  const vCorner = Math.sqrt(V.mu * G * ROUND_R);

  openModal(
    `<h3>${V.name} — Spec Sheet</h3>` +
      `<div class="sub rtl">${bidi(`ערכים חיים לפי המהירות הנוכחית ${vKmh.toFixed(0)} km/h. הם מתעדכנים כשהרכב מאיץ או בולם.`)}</div>` +
      `<div class="spec"><table>` +
      row('Current speed', `${vKmh.toFixed(0)} km/h`, 'מהירות הנסיעה הנוכחית.') +
      row('Friction μ', `${V.mu}`, 'אחיזת צמיג-כביש — ערך גבוה = בלימה ופנייה טובות יותר.') +
      row('Max acceleration', `${V.aMax.toFixed(1)} m/s²`, 'התאוצה המרבית של הרכב.') +
      row('Deceleration μ·g', `${decel.toFixed(2)} m/s²`, 'תאוצת הבלימה המרבית, שווה למכפלה μ·g.') +
      row('Actuator delay', `${V.actuatorLatency.toFixed(2)} s`, 'השהיית הבלמים — מהפקודה ועד לתפיסה.') +
      row('Total latency', `${lat.toFixed(2)} s`, 'חיישן + מסנן + מפעיל.') +
      row('Blind distance', `${dReact.toFixed(1)} m`, 'המרחק שנגמע במהירות מלאה בזמן ההשהיה.') +
      row('Mechanical braking', `${dMech.toFixed(1)} m`, 'מרחק הבלימה נטו = V²/(2μg).') +
      row('Safety buffer', `${cfg.decision.safetyBuffer} m`, 'מרווח ביטחון קבוע מאחורי המטרה.') +
      row('<b>D_required</b>', `<b>${dReq.toFixed(1)} m</b>`, 'מרחק עצירה בטוח כולל.') +
      row('Cornering speed', `${msToKmh(vCorner).toFixed(0)} km/h`, `מהירות פנייה בטוחה לרדיוס ${ROUND_R} מ׳ = √(μ·g·r).`) +
      `</table></div>`,
  );
}
