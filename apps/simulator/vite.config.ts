import { defineConfig } from 'vite';

// Served as a GitHub Pages project sub-path while the legacy app keeps the root.
// See the plan: new app lives at https://roeihemo-cmd.github.io/LISA/next/
export default defineConfig({
  base: '/LISA/next/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
