import type { SimConfig } from './schema';
import { DEFAULT_CONFIG } from './presets';

type Listener = (cfg: SimConfig) => void;

/** Minimal reactive config store: get / set (deep-merge) / subscribe. */
export class ConfigStore {
  private cfg: SimConfig;
  private listeners = new Set<Listener>();

  constructor(initial: SimConfig = DEFAULT_CONFIG) {
    this.cfg = structuredClone(initial);
  }

  get(): SimConfig {
    return this.cfg;
  }

  /** Replace a top-level group (e.g. patch('lidar', { fogAlpha: 0.2 })). */
  patch<K extends keyof SimConfig>(group: K, value: Partial<SimConfig[K]>): void {
    const cur = this.cfg[group];
    this.cfg = {
      ...this.cfg,
      [group]: typeof cur === 'object' && cur !== null ? { ...cur, ...value } : value,
    };
    this.emit();
  }

  set(next: SimConfig): void {
    this.cfg = structuredClone(next);
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.cfg);
  }
}
