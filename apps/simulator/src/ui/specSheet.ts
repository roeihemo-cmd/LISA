import type { SimConfig } from '../config/schema';
import { G, msToKmh } from '../core/units';
import { openModal } from './modal';
import { bidi } from './equations';
import { L, isRTL, type LS } from './lang';

const ROUND_R = 25; // reference cornering radius [m]

export function openSpecSheet(cfg: SimConfig, egoSpeedMs: number): void {
  const rtl = isRTL();
  const cls = rtl ? ' rtl' : '';
  const ex = (s: LS): string => (rtl ? bidi(L(s)) : L(s));
  const row = (label: string, value: string, e: LS): string =>
    `<tr><td>${label}<div class="ex${cls}">${ex(e)}</div></td><td>${value}</td></tr>`;

  const V = cfg.vehicle;
  const ve = egoSpeedMs;
  const vKmh = msToKmh(ve);
  const decel = V.mu * G;
  const lat = cfg.decision.tDsp + cfg.decision.tFilter + V.actuatorLatency;
  const dReact = ve * lat;
  const dMech = (ve * ve) / (2 * decel);
  const dReq = dReact + dMech + cfg.decision.safetyBuffer;
  const vCorner = Math.sqrt(V.mu * G * ROUND_R);

  const title = rtl ? `${V.name} — מפרט` : `${V.name} — Spec Sheet`;
  const sub: LS = {
    en: `Live values at the current speed ${vKmh.toFixed(0)} km/h. They update as the car accelerates or brakes.`,
    he: `ערכים חיים לפי המהירות הנוכחית ${vKmh.toFixed(0)} km/h. הם מתעדכנים כשהרכב מאיץ או בולם.`,
  };

  openModal(
    `<h3>${title}</h3><div class="sub${cls}">${ex(sub)}</div><div class="spec"><table>` +
      row('Current speed', `${vKmh.toFixed(0)} km/h`, { en: 'Current driving speed.', he: 'מהירות הנסיעה הנוכחית.' }) +
      row('Friction μ', `${V.mu}`, { en: 'Tyre–road grip — higher = better braking and cornering.', he: 'אחיזת צמיג-כביש — ערך גבוה = בלימה ופנייה טובות יותר.' }) +
      row('Max acceleration', `${V.aMax.toFixed(1)} m/s²`, { en: 'The vehicle maximum acceleration.', he: 'התאוצה המרבית של הרכב.' }) +
      row('Deceleration μ·g', `${decel.toFixed(2)} m/s²`, { en: 'Maximum braking deceleration, equal to μ·g.', he: 'תאוצת הבלימה המרבית, שווה למכפלה μ·g.' }) +
      row('Actuator delay', `${V.actuatorLatency.toFixed(2)} s`, { en: 'Brake delay — from command to bite.', he: 'השהיית הבלמים — מהפקודה ועד לתפיסה.' }) +
      row('Total latency', `${lat.toFixed(2)} s`, { en: 'Sensor + filter + actuator.', he: 'חיישן + מסנן + מפעיל.' }) +
      row('Blind distance', `${dReact.toFixed(1)} m`, { en: 'Distance covered at full speed during the latency.', he: 'המרחק שנגמע במהירות מלאה בזמן ההשהיה.' }) +
      row('Mechanical braking', `${dMech.toFixed(1)} m`, { en: 'Net braking distance = V²/(2μg).', he: 'מרחק הבלימה נטו = V²/(2μg).' }) +
      row('Safety buffer', `${cfg.decision.safetyBuffer} m`, { en: 'Fixed safety gap behind the target.', he: 'מרווח ביטחון קבוע מאחורי המטרה.' }) +
      row('<b>D_required</b>', `<b>${dReq.toFixed(1)} m</b>`, { en: 'Total safe stopping distance.', he: 'מרחק עצירה בטוח כולל.' }) +
      row('Cornering speed', `${msToKmh(vCorner).toFixed(0)} km/h`, { en: `Safe cornering speed for radius ${ROUND_R} m = √(μ·g·r).`, he: `מהירות פנייה בטוחה לרדיוס ${ROUND_R} מ׳ = √(μ·g·r).` }) +
      `</table></div>`,
  );
}
