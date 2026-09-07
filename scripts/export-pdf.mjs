// Standalone print copy: the website source and development server are untouched.
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import ffmpeg from 'ffmpeg-static';

const root = process.cwd();
const scratch = path.join(root, '.cache/pdf-export');
const output = path.join(root, 'output/pdf');
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
for (const folder of ['src', 'content', 'public']) await cp(path.join(root, folder), path.join(scratch, folder), { recursive: true });
await cp(path.join(root, 'index.html'), path.join(scratch, 'index.html'));
const media = JSON.parse(await readFile('content/media.json', 'utf8'));
const previews = JSON.parse(await readFile('content/link-previews.json', 'utf8'));
const videos = [...new Set([...Object.values(media), ...Object.values(previews)].filter(asset => asset.type === 'video').map(asset => asset.url || asset.image))];
const posters = {};
await mkdir(path.join(scratch, 'public/pdf-posters'), { recursive: true });
for (const video of videos) {
  const poster = `pdf-posters/${path.basename(video, path.extname(video))}.jpg`;
  posters[video] = poster;
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-y', '-i', path.join(root, 'public', video), '-ss', '1', '-frames:v', '1', '-q:v', '2', path.join(scratch, 'public', poster)], { windowsHide: true, stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', code => code ? reject(new Error(`Poster failed: ${video}`)) : resolve());
  });
}
const extra = `
const pdfPosters = ${JSON.stringify(posters)};
const sheets = document.createElement('div');
for (let index = 0; index < pages.length; index++) {
  navigation.index = index;
  renderPage();
  const sheet = article.cloneNode(true);
  sheet.classList.add('pdf-sheet');
  sheet.querySelectorAll('.web-only').forEach(node => node.remove());
  sheet.id = 'pdf-' + pages[index].id;
  sheet.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  sheet.querySelectorAll('video').forEach(video => {
    const source = (video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || '').replace(/^\\.\\//, '').replace(/^\\//, '');
    const image = document.createElement('img');
    image.src = '/' + pdfPosters[source];
    image.alt = video.getAttribute('aria-label') || '영상 미리보기';
    image.className = video.className;
    video.replaceWith(image);
  });
  sheet.querySelectorAll('.document-media > a').forEach(link => link.replaceWith(...link.childNodes));
  sheet.querySelectorAll('a[href^="#"]').forEach(link => link.href = 'https://bagzaru.github.io/' + link.getAttribute('href'));
  sheet.querySelectorAll('img').forEach(image => image.loading = 'eager');
  if (pages[index].id === 'cover') {
    const message = document.createElement('h3');
    message.textContent = '웹으로 보시는 것을 더 권장합니다.';
    const url = document.createElement('a');
    url.href = 'https://bagzaru.github.io/';
    url.textContent = 'bagzaru.github.io';
    sheet.append(message, url);
  }
  if (pages[index].id === 'journey') {
    const favorites = [...sheet.querySelectorAll(':scope > h2')].find(node => node.textContent === '좋아하는 게임');
    if (favorites) {
      const group = document.createElement('section');
      group.className = 'pdf-favorites';
      favorites.before(group);
      let node = favorites;
      while (node) { const next = node.nextElementSibling; group.append(node); node = next; }
    }
  }
  sheets.append(sheet);
}
document.body.replaceChildren(sheets);
document.title = '백승훈 포트폴리오';
window.pdfReady = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(image => image.decode()));
  return true;
})();
`;
await writeFile(path.join(scratch, 'src/main.js'), await readFile('src/main.js', 'utf8') + extra);
const printCSS = `
@page { size: A4; margin: 14mm 12mm 18mm; }
html, body { height: auto !important; overflow: visible !important; background: #fbfaf8; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.document.pdf-sheet { width: 100%; max-width: none; margin: 0; padding: 0; break-before: page; font-size: 15px; line-height: 1.45; }
.document.pdf-sheet:first-child { break-before: auto; }
.document.pdf-sheet.section-cover { min-height: 264mm; padding: 0; }
.document.pdf-sheet.section-cover h3 { margin: 4px 0 18px; }
.document.pdf-sheet h1 { font-size: 32px; margin-bottom: 28px; }
.document.pdf-sheet h2 { font-size: 23px; }
.document.pdf-sheet h3 { font-size: 18px; }
.document.pdf-sheet:not(.section-cover) h2 { margin-top: 24px; margin-bottom: 16px; }
.document.pdf-sheet:not(.section-cover) h3 { margin-top: 22px; margin-bottom: 10px; }
.document.pdf-sheet p { margin-top: 10px; margin-bottom: 10px; }
.document.pdf-sheet ul, .document.pdf-sheet ol { margin-top: 8px; margin-bottom: 12px; }
h1, h2, h3, h4 { break-after: avoid; }
p, li { orphans: 2; widows: 2; }
.document-media, .link-card, .journey-year, .project-detail-columns, .introduction-columns, .camping-gallery, .ai-loop-layout { break-inside: avoid; }
.document-media img { max-height: 300px; }
.document-media { margin-top: 18px; margin-bottom: 18px; }
.pdf-favorites { break-inside: avoid; }
.sunrin-gallery { max-width: 590px; margin-left: auto; margin-right: auto; }
.sunrin-gallery img { max-height: none; }
.ai-loop-layout img { max-height: none; }
.link-card-preview img { max-height: 100px; }
.journey-year { gap: 22px; padding-bottom: 25px; }
.journey-year-content > h2 { font-size: 21px; }
.link-card-copy { padding-top: 10px; padding-bottom: 10px; }
.introduction-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; }
.project-detail-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#pdf-maneuver-more { zoom: .80 !important; }
#pdf-camping-alone-vr { zoom: .78 !important; }
#pdf-be-the-player-ai { zoom: .82 !important; }
`;
await writeFile(path.join(scratch, 'src/style.css'), await readFile('src/style.css', 'utf8') + printCSS);
const bundle = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = createRequire(bundle)('playwright');
const executablePath = process.env.PDF_CHROMIUM || path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1208/chrome-win64/chrome.exe');
const server = await createServer({ configFile: false, root: scratch, server: { host: '127.0.0.1', port: 5174, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 703, height: 1000 } });
  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.pdfReady);
  await page.emulateMedia({ media: 'print' });
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.pdf-sheet')].map(sheet => {
    const height = sheet.getBoundingClientRect().height;
    // Fit short overflow onto one sheet, while keeping long documents readable.
    if (!sheet.classList.contains('section-cover') && height > 995 && height < 1240) sheet.style.zoom = String(990 / height);
    return { id: sheet.id, height, zoom: sheet.style.zoom };
  }));
  await writeFile(path.join(scratch, 'layout.json'), JSON.stringify(sizes, null, 2));
  const pdfPath = path.join(output, '백승훈_포트폴리오.pdf');
  await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-family:Arial;font-size:9px;color:#8a8276;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  console.log(JSON.stringify({ file: pdfPath, bytes: (await stat(pdfPath)).size }));
} finally {
  await browser.close();
  await server.close();
}
