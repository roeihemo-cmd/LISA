// SI units, physical constants, and branded range types.
// Branding keeps ground-truth ranges structurally distinct from estimated ranges,
// reinforcing the Truth/Perception wall at compile time.

export const C_LIGHT = 299_792_458; // speed of light [m/s]
export const G = 9.81; // gravitational acceleration [m/s^2]

/** A distance the WORLD knows exactly. Only sensors may consume it. */
export type TrueRange = number & { readonly __brand: 'TrueRange' };
/** A distance the PERCEPTION stack has estimated from measurements. */
export type EstRange = number & { readonly __brand: 'EstRange' };

export const trueRange = (m: number): TrueRange => m as TrueRange;
export const estRange = (m: number): EstRange => m as EstRange;

/** km/h → m/s */
export const kmhToMs = (kmh: number): number => kmh / 3.6;
/** m/s → km/h */
export const msToKmh = (ms: number): number => ms * 3.6;

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;
