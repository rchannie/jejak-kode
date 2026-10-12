// Menyusun prototipe satu halaman dari hasil `npx vite build -c vite.artifact.config.js`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const akar = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(resolve(akar, 'frontend/dist-artifact/jejak-kode.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(resolve(akar, 'frontend/dist-artifact/style.css'), 'utf8');

const html = `<title>Jejak Kode</title>
<meta name="description" content="Prototipe game edukasi berbasis visualisasi eksekusi kode dengan model guided inquiry.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Pixelify+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
${js}
</script>
`;
mkdirSync(resolve(akar, 'artifact'), { recursive: true });
writeFileSync(resolve(akar, 'artifact/jejak-kode.html'), html);
console.log('artifact/jejak-kode.html', (html.length / 1024).toFixed(1), 'KB');
