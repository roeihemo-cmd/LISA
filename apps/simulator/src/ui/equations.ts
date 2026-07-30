import { openModal } from './modal';

type Pair = [string, string];
interface Eq {
  title: string;
  short: string;
  full: string;
  sub: string;
  terms: Pair[];
  derivOf: string;
  deriv: Pair[];
  note: string;
}

/** Wrap non-Hebrew runs in <bdi> so mixed RTL text lays out correctly. */
export function bidi(s: string): string {
  return s.replace(/([^֐-׿\s]+)/g, '<bdi>$1</bdi>');
}

/** Typeset a plain formula string: e^(...) → superscript, X_word → subscript. */
export function pretty(s: string): string {
  return s
    .replace(/\^\(([^)]*)\)/g, '<sup>$1</sup>')
    .replace(/([A-Za-z0-9)])_([A-Za-z]+)/g, '$1<sub>$2</sub>');
}

export const EQ: Record<string, Eq> = {
  braking: {
    title: 'Total Braking Distance',
    short: 'D_req = V·T + V²/(2μg) + D_buf',
    full: 'D_required = V·(T_dsp + T_flt + T_act) + V²/(2·μ·g) + D_buffer',
    sub: 'מרחק העצירה הכולל שהמערכת זקוקה לו כדי לעצור בבטחה.',
    terms: [
      ['V — Speed', 'מהירות הרכב הנוכחית, במטר לשנייה.'],
      ['T — Total latency', 'T_dsp + T_flt + T_act: עיבוד אות, מסנן מותאם, ומפעיל הבלם. בזמן הזה הרכב עדיין נוסע במלוא המהירות (מרחק "עיוור").'],
      ['μ·g — Deceleration', 'מקדם החיכוך כפול תאוצת הכובד — ההאטה המרבית של הרכב.'],
      ['V²/(2μg) — Mechanical', 'מרחק הבלימה נטו מרגע שהבלמים תופסים.'],
      ['D_buffer — Safety gap', 'מרווח קבוע שנשמר מאחורי המטרה.'],
    ],
    derivOf: 'מפתחים את מרחק הבלימה המכני V²/(2μg) ממשוואות התנועה בתאוצה קבועה.',
    deriv: [
      ['F = μ·m·g', 'כוח החיכוך המרבי בין הצמיג לכביש.'],
      ['a = F/m = μ·g', 'ההאטה לפי החוק השני של ניוטון.'],
      ['v² = V² − 2·a·s', 'משוואת תנועה בתאוצה קבועה.'],
      ['0 = V² − 2·a·s', 'בעצירה מלאה המהירות הסופית היא אפס.'],
      ['s = V²/(2a) = V²/(2μg)', 'מבודדים את מרחק הבלימה s.'],
    ],
    note: 'אחיזה גבוהה (μ גדול) ⇒ עצירה קצרה יותר. מהירות כפולה ⇒ מרחק בלימה פי ארבעה.',
  },
  ttc: {
    title: 'Time To Collision',
    short: 'TTC = R / (V_ego − V_target)',
    full: 'TTC = R / (V_ego − V_target)',
    sub: 'הזמן עד להתנגשות בקצב ההתקרבות הנוכחי.',
    terms: [
      ['R — Range', 'המרחק אל המטרה (כפי שהלייזר מעריך אותו).'],
      ['V_ego − V_target — Closing', 'מהירות ההתקרבות — הפרש המהירויות.'],
      ['TTC', 'הזמן שנותר עד סגירת הפער.'],
    ],
    derivOf: 'כמה זמן ייקח לסגור את הפער אם המהירות היחסית נשארת קבועה.',
    deriv: [
      ['closing = V_ego − V_target', 'המהירות היחסית של ההתקרבות.'],
      ['TTC = R / closing', 'זמן = מרחק חלקי מהירות.'],
    ],
    note: 'TTC מתחת לשנייה — לרוב כבר אי אפשר לעצור בזמן.',
  },
  lidar: {
    title: 'Optical Radar Equation',
    short: 'P_rec = P_tx·ρ·(D²/4R²)·e^(−2αR)',
    full: 'P_rec = P_tx · ρ · (D² / 4R²) · e^(−2αR)',
    sub: 'עוצמת ההד האופטי שחוזר מהמטרה אל הגלאי.',
    terms: [
      ['P_tx — Transmit power', 'הספק הפולס הנשלח.'],
      ['ρ — Reflectivity', 'החזריות המטרה — הולך רגל כהה מחזיר מעט (ρ נמוך).'],
      ['D²/4R² — Collection', 'שבר האור שהעדשה קולטת, דועך כ-1/R².'],
      ['e^(−2αR) — Attenuation', 'ניחות אטמוספרי הלוך-חזור (Beer-Lambert).'],
      ['P_rec — Received', 'ההד המתקבל, שממנו נגזר ה-SNR.'],
    ],
    derivOf: 'שני מקורות דעיכה: פיזור כדורי של ההד וניחות התווך.',
    deriv: [
      ['spread ∝ 1/R²', 'ההד החוזר פרוש על שטח כדורי ∝ R².'],
      ['lens D²/4R²', 'העדשה קולטת חלק קטן מהחזית.'],
      ['atten. e^(−2αR)', 'ניחות לאורך המסלול, פעמיים (הלוך-חזור).'],
      ['P_rec = P_tx·ρ·(D²/4R²)·e^(−2αR)', 'מכפלת כל הגורמים.'],
    ],
    note: 'ההד דועך מהר מאוד עם המרחק — זיהוי למרחקים גדולים דורש רגישות גבוהה.',
  },
  beer: {
    title: 'Beer–Lambert Attenuation',
    short: 'η(R) = e^(−2αR)',
    full: 'η(R) = e^(−2·α·R)',
    sub: 'איזה חלק מהאור שורד מעבר בערפל/אבק.',
    terms: [
      ['α — Extinction', 'מקדם הניחות של התווך; ערפל כבד = α גדול.'],
      ['R — Range', 'המרחק אל המטרה.'],
      ['2R — Round trip', 'האור עובר את המרחק פעמיים.'],
      ['η — Transmission', 'שבר האור ששרד.'],
    ],
    derivOf: 'כמה אור שורד לאחר מעבר בתווך שסופג באופן אחיד.',
    deriv: [
      ['dI = −α·I·dx', 'האובדן פרופורציוני לעוצמה ולמרחק.'],
      ['I(x) = I₀·e^(−αx)', 'פתרון המשוואה הדיפרנציאלית.'],
      ['round trip: x = 2R', 'הלוך-חזור אל המטרה.'],
      ['η = e^(−2αR)', 'שבר ההולכה הכולל.'],
    ],
    note: 'בערפל כבד טווח הגילוי מתמוטט — לייזר לבדו אינו מספיק.',
  },
  matched: {
    title: 'Matched Filter',
    short: 'y(t) = r(t) ⋆ s(t)',
    full: 'y(t) = r(t) ⋆ s(t),   R̂ = c·τ̂/2',
    sub: 'קורלציה עם תבנית הפולס — ממקסמת את יחס האות-לרעש.',
    terms: [
      ['r(t) — Received', 'האות המתקבל: הד + רעש.'],
      ['s(t) — Template', 'צורת הפולס הידועה ששודר.'],
      ['⋆ — Correlation', 'החלקת התבנית לאורך האות.'],
      ['τ̂ — Peak delay', 'זמן ההשהיה שבו הקורלציה מקסימלית.'],
    ],
    derivOf: 'המסנן שממקסם SNR ברעש לבן הוא העתק מהופך-בזמן של הפולס.',
    deriv: [
      ['y(t) = ∫ r(τ)·s(τ−t) dτ', 'קורלציה צולבת של האות עם התבנית.'],
      ['peak at t = τ̂', 'המקסימום מתקבל כשהתבנית מיושרת בדיוק להד.'],
      ['R̂ = c·τ̂ / 2', 'המרחק מזמן הטיסה (÷2 בגלל הלוך-חזור).'],
    ],
    note: 'המסנן "דוחס" את הרעש ומקפיץ פיק חד בזמן ההגעה של ההד.',
  },
  curve: {
    title: 'Safe Cornering Speed',
    short: 'V_max = √(μ·g·r)',
    full: 'V_max = √(μ · g · r)',
    sub: 'המהירות המרבית לפנייה ברדיוס r בלי להחליק.',
    terms: [
      ['μ — Friction', 'אחיזת הצמיג בכביש.'],
      ['g — Gravity', 'תאוצת הכובד, 9.81 מ׳/ש².'],
      ['r — Radius', 'רדיוס הפנייה/הכיכר.'],
      ['V_max', 'המהירות שבה כוח הצנטריפטה שווה לחיכוך המרבי.'],
    ],
    derivOf: 'מוצאים את המהירות שבה הכוח הצנטריפטלי הדרוש שווה לחיכוך המרבי הזמין.',
    deriv: [
      ['F_c = m·v²/r', 'הכוח הצנטריפטלי הדרוש לפנייה.'],
      ['F_fric = μ·m·g', 'כוח החיכוך המרבי.'],
      ['m·v²/r = μ·m·g', 'בגבול ההחלקה מַשווים.'],
      ['v² = μ·g·r', 'צמצום המסה והכפלה ב-r.'],
      ['V_max = √(μ·g·r)', 'הוצאת שורש.'],
    ],
    note: 'אחיזה גבוהה או רדיוס גדול ⇒ אפשר להיכנס לפנייה מהר יותר.',
  },
};

/** Open the equation popup. `extra` optionally appends a live numeric-substitution step. */
export function openEquation(id: string, extra?: Pair): void {
  const e = EQ[id];
  if (!e) return;
  const terms = e.terms
    .map(([s, d]) => `<div class="termrow"><div class="sym">${s}</div><div class="exp rtl">${bidi(d)}</div></div>`)
    .join('');
  const steps = [...e.deriv, ...(extra ? [extra] : [])]
    .map(([f, n]) => `<div class="dstep"><span class="f">${pretty(f)}</span><span class="n rtl">${bidi(n)}</span></div>`)
    .join('');
  openModal(
    `<h3>${e.title}</h3><div class="sub rtl">${bidi(e.sub)}</div>` +
      `<div class="eqf">${pretty(e.full)}</div>` +
      `<div class="derivbox"><div class="dt">פיתוח מתמטי · Derivation</div>` +
      `<div class="dof rtl">${bidi(e.derivOf)}</div>${steps}</div>` +
      `<div style="margin-top:16px">${terms}</div>` +
      `<div class="note rtl">${bidi(e.note)}</div>`,
  );
}
