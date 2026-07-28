export type DecisionMode = 'CRUISE' | 'FCW' | 'AEB';

export interface DecisionState {
  mode: DecisionMode;
  brake: boolean;
  targetSpeed: number; // speed to brake down to [m/s]
  inevitable: boolean; // collision unavoidable even at max braking
  ttc: number; // time-to-collision [s] (Infinity when not closing)
  dReq: number; // required stopping distance incl. buffer [m]
  dMinStop: number; // physical minimum stopping distance [m]
  reasons: string[];
}
