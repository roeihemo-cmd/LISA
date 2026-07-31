import { openModal } from './modal';
import { L, isRTL, type LS } from './lang';

interface Eq {
  title: LS;
  short: string;
  full: string;
  sub: LS;
  terms: [LS, LS][]; // [symbol+name, explanation]
  derivOf: LS;
  deriv: [string, LS][]; // [formula, note]
  note: LS;
}

/** Wrap non-Hebrew runs in <bdi> so mixed RTL text lays out correctly. */
export function bidi(s: string): string {
  return s.replace(/([^֐-׿\s]+)/g, '<bdi>$1</bdi>');
}

/** Typeset a plain formula: e^(...) → superscript, X_word → subscript. */
export function pretty(s: string): string {
  return s
    .replace(/\^\(([^)]*)\)/g, '<sup>$1</sup>')
    .replace(/([A-Za-z0-9)])_([A-Za-z]+)/g, '$1<sub>$2</sub>');
}

export const EQ: Record<string, Eq> = {
  braking: {
    title: { en: 'Total Braking Distance', he: 'מרחק הבלימה הכולל' },
    short: 'D_req = V·T + V²/(2μg) + D_buf',
    full: 'D_required = V·(T_dsp + T_flt + T_act) + V²/(2·μ·g) + D_buffer',
    sub: {
      en: 'Total distance to stop safely = blind (reaction) distance + mechanical braking + safety buffer.',
      he: 'מרחק העצירה הכולל = מרחק תגובה (עיוור) ועוד מרחק בלימה מכני ועוד מרווח ביטחון.',
    },
    terms: [
      [{ en: 'V — Speed', he: 'V — מהירות' }, { en: 'The vehicle current speed, in metres per second.', he: 'מהירות הרכב הנוכחית, במטר לשנייה.' }],
      [{ en: 'T — Total latency', he: 'T — השהיה כוללת' }, { en: 'The sum of three delays — signal processing, the matched filter, and the brake actuator. During this time the car still travels at full speed; this is the blind distance.', he: 'סכום שלוש ההשהיות — עיבוד האות, המסנן המותאם, ומפעיל הבלם. בזמן הזה הרכב עדיין נוסע במלוא המהירות, וזהו המרחק העיוור.' }],
      [{ en: 'μ·g — Deceleration', he: 'μ·g — האטה' }, { en: 'Friction coefficient times gravity — the maximum deceleration.', he: 'מקדם החיכוך כפול תאוצת הכובד — זו ההאטה המרבית של הרכב.' }],
      [{ en: 'V²/(2μg) — Mechanical', he: 'V²/(2μg) — מרחק מכני' }, { en: 'The net braking distance once the brakes bite.', he: 'מרחק הבלימה נטו מרגע שהבלמים תופסים את הכביש.' }],
      [{ en: 'D_buffer — Safety gap', he: 'D_buffer — מרווח ביטחון' }, { en: 'A fixed gap kept behind the target.', he: 'מרווח קבוע שנשמר מאחורי המטרה.' }],
    ],
    derivOf: { en: 'We derive the mechanical braking distance V²/(2μg) from constant-acceleration kinematics.', he: 'מפתחים את מרחק הבלימה המכני V²/(2μg) ממשוואות התנועה בתאוצה קבועה.' },
    deriv: [
      ['F = μ·m·g', { en: 'Maximum tyre–road friction force.', he: 'כוח החיכוך המרבי בין הצמיג לכביש.' }],
      ['a = F/m = μ·g', { en: 'Deceleration by Newton second law.', he: 'ההאטה לפי החוק השני של ניוטון.' }],
      ['v² = V² − 2·a·s', { en: 'Constant-acceleration kinematics.', he: 'משוואת תנועה בתאוצה קבועה.' }],
      ['0 = V² − 2·a·s', { en: 'At a full stop the final speed is zero.', he: 'בעצירה מלאה המהירות הסופית היא אפס.' }],
      ['s = V²/(2a) = V²/(2μg)', { en: 'Isolate the braking distance s.', he: 'מבודדים את מרחק הבלימה s.' }],
    ],
    note: { en: 'Higher grip (larger μ) ⇒ shorter stop. Double the speed ⇒ four times the braking distance.', he: 'אחיזה גבוהה (μ גדול) ⇒ עצירה קצרה יותר. מהירות כפולה ⇒ מרחק בלימה פי ארבעה.' },
  },
  ttc: {
    title: { en: 'Time To Collision', he: 'זמן להתנגשות' },
    short: 'TTC = R / (V_ego − V_target)',
    full: 'TTC = R / (V_ego − V_target)',
    sub: { en: 'Time to impact at the current closing rate.', he: 'הזמן עד להתנגשות בקצב ההתקרבות הנוכחי.' },
    terms: [
      [{ en: 'R — Range', he: 'R — טווח' }, { en: 'Distance to the target (as the LiDAR estimates it).', he: 'המרחק אל המטרה (כפי שהלייזר מעריך אותו).' }],
      [{ en: 'V_ego − V_target — Closing', he: 'V_ego − V_target — התקרבות' }, { en: 'Closing speed — the difference of the speeds.', he: 'מהירות ההתקרבות — הפרש המהירויות.' }],
      [{ en: 'TTC', he: 'TTC' }, { en: 'Time left before the gap closes.', he: 'הזמן שנותר עד סגירת הפער.' }],
    ],
    derivOf: { en: 'How long to close the gap if the relative speed stays constant.', he: 'כמה זמן ייקח לסגור את הפער אם המהירות היחסית נשארת קבועה.' },
    deriv: [
      ['closing = V_ego − V_target', { en: 'The relative closing speed.', he: 'המהירות היחסית של ההתקרבות.' }],
      ['TTC = R / closing', { en: 'Time = distance / speed.', he: 'זמן = מרחק חלקי מהירות.' }],
    ],
    note: { en: 'TTC below one second — usually too late to stop.', he: 'TTC מתחת לשנייה — לרוב כבר אי אפשר לעצור בזמן.' },
  },
  lidar: {
    title: { en: 'Optical Radar Equation', he: 'משוואת הראדאר האופטית' },
    short: 'P_rec = P_tx·ρ·(D²/4R²)·e^(−2αR)',
    full: 'P_rec = P_tx · ρ · (D² / 4R²) · e^(−2αR)',
    sub: { en: 'The optical echo power returning from the target.', he: 'עוצמת ההד האופטי שחוזר מהמטרה אל הגלאי.' },
    terms: [
      [{ en: 'P_tx — Transmit power', he: 'P_tx — הספק שידור' }, { en: 'Power of the transmitted pulse.', he: 'הספק הפולס הנשלח.' }],
      [{ en: 'ρ — Reflectivity', he: 'ρ — החזריות' }, { en: 'Target reflectivity — a dark pedestrian reflects little (low ρ).', he: 'החזריות המטרה — הולך רגל כהה מחזיר מעט (ρ נמוך).' }],
      [{ en: 'D²/4R² — Collection', he: 'D²/4R² — איסוף' }, { en: 'Fraction of light the lens collects, falling as 1/R².', he: 'שבר האור שהעדשה קולטת, דועך כ-1/R².' }],
      [{ en: 'e^(−2αR) — Attenuation', he: 'e^(−2αR) — ניחות' }, { en: 'Round-trip atmospheric attenuation (Beer–Lambert).', he: 'ניחות אטמוספרי הלוך-חזור (Beer-Lambert).' }],
      [{ en: 'P_rec — Received', he: 'P_rec — התקבל' }, { en: 'The received echo, which sets the SNR.', he: 'ההד המתקבל, שממנו נגזר ה-SNR.' }],
    ],
    derivOf: { en: 'Two loss sources: spherical spreading of the echo and medium attenuation.', he: 'שני מקורות דעיכה: פיזור כדורי של ההד וניחות התווך.' },
    deriv: [
      ['spread ∝ 1/R²', { en: 'The echo spreads over a sphere of area ∝ R².', he: 'ההד החוזר פרוש על שטח כדורי ∝ R².' }],
      ['lens D²/4R²', { en: 'The lens collects a small fraction of the wavefront.', he: 'העדשה קולטת חלק קטן מהחזית.' }],
      ['atten. e^(−2αR)', { en: 'Attenuation along the path, twice (round trip).', he: 'ניחות לאורך המסלול, פעמיים (הלוך-חזור).' }],
      ['P_rec = P_tx·ρ·(D²/4R²)·e^(−2αR)', { en: 'The product of all factors.', he: 'מכפלת כל הגורמים.' }],
    ],
    note: { en: 'The echo fades fast with range — long-range detection needs high sensitivity.', he: 'ההד דועך מהר מאוד עם המרחק — זיהוי למרחקים גדולים דורש רגישות גבוהה.' },
  },
  beer: {
    title: { en: 'Beer–Lambert Attenuation', he: 'ניחות Beer-Lambert' },
    short: 'η(R) = e^(−2αR)',
    full: 'η(R) = e^(−2·α·R)',
    sub: { en: 'What fraction of light survives fog/dust.', he: 'איזה חלק מהאור שורד בערפל/אבק.' },
    terms: [
      [{ en: 'α — Extinction', he: 'α — ניחות' }, { en: 'Extinction coefficient of the medium; heavy fog = large α.', he: 'מקדם הניחות של התווך; ערפל כבד = α גדול.' }],
      [{ en: 'R — Range', he: 'R — טווח' }, { en: 'Distance to the target.', he: 'המרחק אל המטרה.' }],
      [{ en: '2R — Round trip', he: '2R — הלוך-חזור' }, { en: 'The light travels the distance twice.', he: 'האור עובר את המרחק פעמיים.' }],
      [{ en: 'η — Transmission', he: 'η — הולכה' }, { en: 'Fraction of light that survived.', he: 'שבר האור ששרד.' }],
    ],
    derivOf: { en: 'How much light survives crossing a uniformly absorbing medium.', he: 'כמה אור שורד לאחר מעבר בתווך שסופג באופן אחיד.' },
    deriv: [
      ['dI = −α·I·dx', { en: 'Loss proportional to intensity and path.', he: 'האובדן פרופורציוני לעוצמה ולמרחק.' }],
      ['I(x) = I₀·e^(−αx)', { en: 'Solution of the differential equation.', he: 'פתרון המשוואה הדיפרנציאלית.' }],
      ['round trip: x = 2R', { en: 'Round trip to the target.', he: 'הלוך-חזור אל המטרה.' }],
      ['η = e^(−2αR)', { en: 'Total transmission fraction.', he: 'שבר ההולכה הכולל.' }],
    ],
    note: { en: 'In heavy fog the detection range collapses — LiDAR alone is not enough.', he: 'בערפל כבד טווח הגילוי מתמוטט — לייזר לבדו אינו מספיק.' },
  },
  matched: {
    title: { en: 'Matched Filter', he: 'מסנן מותאם' },
    short: 'y(t) = r(t) ⋆ s(t)',
    full: 'y(t) = r(t) ⋆ s(t),   R̂ = c·τ̂/2',
    sub: { en: 'Correlation with the pulse template — maximises SNR.', he: 'קורלציה עם תבנית הפולס — ממקסמת את יחס האות-לרעש.' },
    terms: [
      [{ en: 'r(t) — Received', he: 'r(t) — אות מתקבל' }, { en: 'The received signal: echo + noise.', he: 'האות המתקבל: הד + רעש.' }],
      [{ en: 's(t) — Template', he: 's(t) — תבנית' }, { en: 'The known transmitted pulse shape.', he: 'צורת הפולס הידועה ששודר.' }],
      [{ en: '⋆ — Correlation', he: '⋆ — קורלציה' }, { en: 'Sliding the template along the signal.', he: 'החלקת התבנית לאורך האות.' }],
      [{ en: 'τ̂ — Peak delay', he: 'τ̂ — זמן פיק' }, { en: 'The delay where the correlation peaks.', he: 'זמן ההשהיה שבו הקורלציה מקסימלית.' }],
    ],
    derivOf: { en: 'The SNR-maximising filter in white noise is the time-reversed pulse.', he: 'המסנן שממקסם SNR ברעש לבן הוא העתק מהופך-בזמן של הפולס.' },
    deriv: [
      ['y(t) = ∫ r(τ)·s(τ−t) dτ', { en: 'Cross-correlation of signal with template.', he: 'קורלציה צולבת של האות עם התבנית.' }],
      ['peak at t = τ̂', { en: 'The maximum is where the template aligns with the echo.', he: 'המקסימום מתקבל כשהתבנית מיושרת בדיוק להד.' }],
      ['R̂ = c·τ̂ / 2', { en: 'Range from time of flight (÷2 for round trip).', he: 'המרחק מזמן הטיסה (÷2 בגלל הלוך-חזור).' }],
    ],
    note: { en: 'The filter "compresses" the noise and produces a sharp peak at the arrival time.', he: 'המסנן "דוחס" את הרעש ומקפיץ פיק חד בזמן ההגעה של ההד.' },
  },
  curve: {
    title: { en: 'Safe Cornering Speed', he: 'מהירות פנייה בטוחה' },
    short: 'V_max = √(μ·g·r)',
    full: 'V_max = √(μ · g · r)',
    sub: { en: 'The maximum speed to corner at radius r without skidding.', he: 'המהירות המרבית לפנייה ברדיוס r בלי להחליק.' },
    terms: [
      [{ en: 'μ — Friction', he: 'μ — חיכוך' }, { en: 'Tyre–road grip.', he: 'אחיזת הצמיג בכביש.' }],
      [{ en: 'g — Gravity', he: 'g — כובד' }, { en: 'Gravity, 9.81 m/s².', he: 'תאוצת הכובד, 9.81 מ׳/ש².' }],
      [{ en: 'r — Radius', he: 'r — רדיוס' }, { en: 'Turn / roundabout radius.', he: 'רדיוס הפנייה/הכיכר.' }],
      [{ en: 'V_max', he: 'V_max' }, { en: 'Speed where centripetal force equals maximum friction.', he: 'המהירות שבה כוח הצנטריפטה שווה לחיכוך המרבי.' }],
    ],
    derivOf: { en: 'Find the speed where the required centripetal force equals the available friction.', he: 'מוצאים את המהירות שבה הכוח הצנטריפטלי הדרוש שווה לחיכוך המרבי הזמין.' },
    deriv: [
      ['F_c = m·v²/r', { en: 'Centripetal force needed to turn.', he: 'הכוח הצנטריפטלי הדרוש לפנייה.' }],
      ['F_fric = μ·m·g', { en: 'Maximum friction force.', he: 'כוח החיכוך המרבי.' }],
      ['m·v²/r = μ·m·g', { en: 'At the skid limit set them equal.', he: 'בגבול ההחלקה מַשווים.' }],
      ['v² = μ·g·r', { en: 'Cancel the mass and multiply by r.', he: 'צמצום המסה והכפלה ב-r.' }],
      ['V_max = √(μ·g·r)', { en: 'Take the square root.', he: 'הוצאת שורש.' }],
    ],
    note: { en: 'Higher grip or larger radius ⇒ you can corner faster.', he: 'אחיזה גבוהה או רדיוס גדול ⇒ אפשר להיכנס לפנייה מהר יותר.' },
  },
};

/** Open the equation popup in the current language. `extra` appends a live step. */
export function openEquation(id: string, extra?: [string, LS]): void {
  const e = EQ[id];
  if (!e) return;
  const rtl = isRTL();
  const cls = rtl ? ' rtl' : '';
  const txt = (s: LS): string => (rtl ? bidi(L(s)) : L(s));
  const terms = e.terms
    .map(([sym, d]) => `<div class="termrow"><div class="sym">${L(sym)}</div><div class="exp${cls}">${txt(d)}</div></div>`)
    .join('');
  const steps = [...e.deriv, ...(extra ? [extra] : [])]
    .map(([f, n]) => `<div class="dstep"><span class="f">${pretty(f)}</span><span class="n${cls}">${txt(n)}</span></div>`)
    .join('');
  openModal(
    `<h3>${L(e.title)}</h3><div class="sub${cls}">${txt(e.sub)}</div>` +
      `<div class="eqf">${pretty(e.full)}</div>` +
      `<div class="derivbox"><div class="dt">${rtl ? 'פיתוח מתמטי' : 'Derivation'}</div>` +
      `<div class="dof${cls}">${txt(e.derivOf)}</div>${steps}</div>` +
      `<div style="margin-top:16px">${terms}</div>` +
      `<div class="note${cls}">${txt(e.note)}</div>`,
  );
}
