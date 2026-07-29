import { access, copyFile, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const files = ['index.html', 'styles.css', 'script.js', 'robots.txt', 'sitemap.xml'];
const assetDirectory = 'assets';

for (const file of files) {
  await access(resolve(root, file), constants.R_OK);
}
await access(resolve(root, assetDirectory), constants.R_OK);

const html = await readFile(resolve(root, 'index.html'), 'utf8');
const requiredText = [
  'THE PAN',
  'LATEST',
  'TRANSMISSION',
  'THREE',
  'DOORS',
  'prefers-reduced-motion'
];

const combined = `${html}\n${await readFile(resolve(root, 'styles.css'), 'utf8')}`;
for (const text of requiredText) {
  if (!combined.includes(text)) throw new Error(`Missing required content: ${text}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  await copyFile(resolve(root, file), resolve(output, file));
}
await cp(resolve(root, assetDirectory), resolve(output, assetDirectory), { recursive: true });

console.log(`Built THE PAN mock: ${files.length} files + ${assetDirectory}/ → dist/`);
