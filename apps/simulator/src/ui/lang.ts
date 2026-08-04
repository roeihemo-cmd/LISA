// Language selection (English / Hebrew). The chosen language is persisted and the
// whole app is rendered in ONE language — no mixing.

export type Lang = 'en' | 'he';
export type LS = { en: string; he: string }; // a bilingual string

const KEY = 'lisa-lang';
let current: Lang = (localStorage.getItem(KEY) as Lang) || 'en';

export function getLang(): Lang {
  return current;
}
export function hasChosen(): boolean {
  return localStorage.getItem(KEY) != null;
}
export function setLang(l: Lang): void {
  current = l;
  localStorage.setItem(KEY, l);
}
export function isRTL(): boolean {
  return current === 'he';
}
/** Pick the string for the current language. */
export function L(s: LS): string {
  return s[current];
}

// UI chrome dictionary (labels, buttons, tiles, sections).
export const UI: Record<string, LS> = {
  brandSub: { en: 'LiDAR · ADAS Bench', he: 'מעבדת LiDAR · ADAS' },
  scenario: { en: 'Scenario', he: 'תרחיש' },
  change: { en: 'CHANGE ▸', he: 'החלף ▸' },
  vehicle: { en: 'Vehicle', he: 'רכב' },
  parameters: { en: 'Parameters', he: 'פרמטרים' },
  setSpeed: { en: 'Set speed', he: 'מהירות' },
  fog: { en: 'Fog / Dust α', he: 'ערפל / אבק α' },
  reflectivity: { en: 'Reflectivity ρ', he: 'החזריות ρ' },
  noise: { en: 'Noise σ', he: 'רעש σ' },
  pipeline: { en: 'Pipeline', he: 'צינור עיבוד' },
  pipelineFlow: { en: 'world → lidar → estimate<br>→ decision → vehicle', he: 'עולם → לייזר → הערכה<br>→ החלטה → רכב' },
  pipelineNote: {
    en: 'The car acts only on the LiDAR estimate.<br>Only the simulator knows the truth.',
    he: 'הרכב פועל רק לפי הערכת הלייזר.<br>רק הסימולטור יודע את האמת.',
  },
  analytics: { en: 'Analytics', he: 'ניתוח' },
  egoSpeed: { en: 'Ego Speed', he: 'מהירות הרכב' },
  targetSpeed: { en: 'Target Speed', he: 'מהירות המטרה' },
  closing: { en: 'Closing Δv', he: 'מהירות התקרבות Δv' },
  ttc: { en: 'TTC', he: 'זמן להתנגשות' },
  trueRange: { en: 'True Range', he: 'טווח אמיתי' },
  estRange: { en: 'Est Range · MA8', he: 'טווח מוערך · MA8' },
  sensorErr: { en: 'Sensor Error', he: 'שגיאת חיישן' },
  snr: { en: 'SNR', he: 'יחס אות/רעש' },
  stopReq: { en: 'Stop Req', he: 'מרחק עצירה' },
  decision: { en: 'Decision', he: 'החלטה' },
  rawSignal: { en: 'Raw Signal r(t)', he: 'אות גולמי r(t)' },
  matchedFilter: { en: 'Matched Filter y(t)', he: 'מסנן מותאם y(t)' },
  rangeVsTime: { en: 'Range vs time', he: 'טווח לאורך זמן' },
  stopTitle: { en: 'Required Stopping Distance', he: 'מרחק העצירה הנדרש' },
  stopSub: {
    en: 'Blind (reaction) distance + mechanical braking V²/(2μg) + safety buffer. The car brakes once the LiDAR-estimated gap drops below this.',
    he: 'מרחק תגובה עיוור, ועוד בלימה מכנית V²/(2μg), ועוד מרווח ביטחון. הרכב בולם כשהמרחק שהלייזר מעריך יורד מתחת לערך הזה.',
  },
  vehicles: { en: 'Ego Speed / Target Speed', he: 'מהירות הרכב / מהירות המטרה' },
  dvInfo: {
    en: 'Ego Speed is your own speed. Target Speed is the object ahead, inferred from how fast the LiDAR range changes (never from ground truth). Closing Δv = Ego − Target: how fast you are catching up. TTC = range / Δv.',
    he: 'מהירות הרכב היא המהירות שלך. מהירות המטרה היא של העצם שלפניך, ונגזרת מקצב השינוי של הטווח שהלייזר מודד (אף פעם לא מהאמת). מהירות ההתקרבות Δv = רכב פחות מטרה: כמה מהר אתה סוגר את הפער. זמן להתנגשות = טווח חלקי Δv.',
  },
  pause: { en: 'Pause', he: 'עצור' },
  play: { en: 'Play', he: 'נגן' },
  step: { en: 'Step', he: 'צעד' },
  restart: { en: 'Restart', he: 'התחל מחדש' },
  chooseLang: { en: 'Choose language', he: 'בחר שפה' },
  collision: { en: 'COLLISION', he: 'התנגשות' },
  stoppedSafely: { en: 'STOPPED SAFELY', he: 'עצירה בטוחה' },
  roundaboutClear: { en: 'ROUNDABOUT CLEARED', he: 'הכיכר נוקתה' },
  collisionImminent: { en: 'COLLISION IMMINENT', he: 'התנגשות מתקרבת' },
  crossedSafely: { en: 'PEDESTRIAN CROSSED — CLEAR', he: 'הולך הרגל חצה — הדרך פנויה' },
  langName: { en: 'English', he: 'עברית' },
  fogNoteTitle: { en: '⚠️ Sensor limit — heavy fog', he: '⚠️ מגבלת חיישן — ערפל כבד' },
  fogNote: {
    en: 'Beer–Lambert attenuation collapses the LiDAR detection range, so the target is seen too late. A laser alone cannot handle heavy fog — real autonomous cars add RADAR (which sees through fog) and sensor fusion.',
    he: 'ניחות Beer-Lambert מכווץ את טווח הגילוי של הלייזר, ולכן המטרה מזוהה מאוחר מדי. לייזר לבדו אינו מתמודד עם ערפל כבד — רכבים אוטונומיים אמיתיים מוסיפים חיישן RADAR (שרואה דרך הערפל) והיתוך חיישנים.',
  },
};

export function tr(key: keyof typeof UI): string {
  return L(UI[key]);
}
