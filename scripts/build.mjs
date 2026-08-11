import { cp, mkdir } from 'node:fs/promises';

const src = 'src';
const publicDir = 'public';
const dist = 'dist';

await mkdir(dist, {
  recursive: true,
});

await cp(`${src}/index.html`, `${dist}/index.html`);

await cp(`${src}/styles`, `${dist}/styles`, {
  recursive: true,
});

await cp(publicDir, dist, {
  recursive: true,
});

console.log('Copied static files.');
