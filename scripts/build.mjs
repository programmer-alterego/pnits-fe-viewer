import { cp, mkdir } from 'node:fs/promises';

const src = 'src';
const publicDir = 'public';
const dist = 'dist';

const pdfjs = 'node_modules/pdfjs-dist/build';
const pdfjsDist = `${dist}/lib/pdfjs`;

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

await mkdir(pdfjsDist, {
  recursive: true,
});

await cp(`${pdfjs}/pdf.mjs`, `${pdfjsDist}/pdf.mjs`);
await cp(`${pdfjs}/pdf.worker.mjs`, `${pdfjsDist}/pdf.worker.mjs`);

console.log('Built static resources into dist/.');
