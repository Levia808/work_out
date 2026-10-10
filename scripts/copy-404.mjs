import { copyFile, readFile, writeFile } from 'node:fs/promises';

const basePath = process.env.VITE_BASE_PATH || '/work_out/';
const indexPath = new URL('../dist/index.html', import.meta.url);
const notFoundPath = new URL('../dist/404.html', import.meta.url);
const html = await readFile(indexPath, 'utf8');
const redirectScript = `<script>(function(){const l=window.location;const basePath=${JSON.stringify(basePath)};const path=l.pathname.startsWith(basePath)?l.pathname.slice(basePath.length):l.pathname;sessionStorage.setItem('fittrack-path',path+l.search+l.hash);l.replace(basePath);})();</script>`;
await writeFile(notFoundPath, html.replace('</head>', `${redirectScript}</head>`));
await copyFile(indexPath, new URL('../dist/200.html', import.meta.url));
