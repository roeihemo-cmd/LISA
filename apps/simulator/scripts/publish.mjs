// Copies the Vite build output into the repo-root `next/` folder, which
// GitHub Pages (branch-root) serves at https://roeihemo-cmd.github.io/LISA/next/.
// The legacy app at the repo root is never touched.
import { rm, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');
const target = resolve(here, '..', '..', '..', 'next');

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });
console.log(`Published build → ${target}`);
