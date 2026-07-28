// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Faithful port of the original simulator's math/physics into a clean, modular
// TypeScript architecture. No import-boundary "wall" — the decision layer may use
// the same inputs the original did (this is a faithful reproduction, not a redesign).
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/**', 'node_modules/**'] },
);
