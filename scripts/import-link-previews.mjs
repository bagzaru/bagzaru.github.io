import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { marked } from 'marked';

const vault = 'E:/Obsidian/bagzaru';
await mkdir('public/link-previews', { recursive: true });
await mkdir('.cache/link-previews', { recursive: true });
const previous = JSON.parse(await readFile('content/link-previews.json', 'utf8').catch(() => '{}'));
const urls = new Set();
for (const file of await readdir('content')) {
  if (!file.endsWith('.md')) continue;
  marked.walkTokens(marked.lexer(await readFile(path.join('content', file), 'utf8')), token => {
    if (token.type === 'link' && /^https?:\/\//.test(token.href)) urls.add(token.href);
  });
}
const output = {};
const exists = filename => stat(filename).then(() => true).catch(() => false);
let localNotes;
let localNotesReady;
async function localNotionMedia(id) {
  if (!localNotesReady) {
    localNotes = new Map();
    async function scan(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) await scan(filename);
        else if (entry.name.endsWith('.md')) {
          const text = await readFile(filename, 'utf8');
          const noteId = text.match(/^notion-id:\s*([a-f\d-]+)/m)?.[1];
          const mediaName = [...text.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => match[1]).find(name => /\.(png|jpe?g|gif|webp|mp4|mov|webm)$/i.test(name));
          if (noteId && mediaName) localNotes.set(noteId, mediaName);
        }
      }
    }
    localNotesReady = scan(path.join(vault, 'Legacy/Notion'));
  }
  await localNotesReady;
  return localNotes.get(id);
}
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
}
async function convert(input, outputFile, animated) {
  const args = ['-y', '-i', input];
  if (animated) args.push('-t', '18', '-vf', "scale='min(480,iw)':-2,fps=15", '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart');
  else args.push('-frames:v', '1', '-vf', "scale='min(480,iw)':-1");
  args.push(outputFile);
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.resume();
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error('preview conversion failed')));
  });
}
async function asset(source, key, { blockId, origin, icon = false } = {}) {
  let input;
  let extension = path.extname(source.split('?')[0]).toLowerCase();
  if (source.startsWith('attachment:')) {
    const filename = source.split(':').slice(2).join(':');
    const local = path.join(vault, 'attachments', filename);
    if (source.startsWith('attachment:local:') && await exists(local)) input = local;
    else {
      const response = await request(`${origin}/api/v3/getSignedFileUrls`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [{ url: source, permissionRecord: { table: 'block', id: blockId } }] }),
      });
      source = (await response.json()).signedUrls?.[0];
      if (!source) throw new Error('No public media URL');
    }
  }
  if (!input) {
    if (!/^https?:\/\//.test(source)) throw new Error('Unsupported media URL');
    const response = await request(source);
    const type = response.headers.get('content-type') || '';
    if (!/image|video|octet-stream/.test(type)) throw new Error('Not media');
    if (Number(response.headers.get('content-length')) > 50 * 1024 * 1024) throw new Error('Remote preview exceeds 50 MB');
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 50 * 1024 * 1024) throw new Error('Remote preview exceeds 50 MB');
    if (type.includes('gif')) extension = '.gif';
    if (type.includes('video')) extension = '.mp4';
    if (type.includes('svg')) extension = '.svg';
    input = `.cache/link-previews/${key}${extension || '.image'}`;
    await writeFile(input, data);
  }
  const animated = ['.gif', '.mp4', '.mov', '.webm'].includes(extension);
  const relative = `link-previews/${key}${extension === '.svg' ? '.svg' : animated ? '.mp4' : '.webp'}`;
  if (extension === '.svg') await writeFile(`public/${relative}`, await readFile(input));
  else await convert(input, `public/${relative}`, animated);
  return { image: relative, type: animated ? 'video' : 'image', icon };
}
async function notion(url, key) {
  const origin = new URL(url).origin;
  const rawId = new URL(url).pathname.match(/([a-f\d]{32})\/?$/i)?.[1];
  if (!rawId) throw new Error('Notion alias page');
  const id = rawId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  const response = await request(`${origin}/api/v3/loadPageChunk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId: id, limit: 100, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false }),
  });
  const data = await response.json();
  const blocks = Object.fromEntries(Object.entries(data.recordMap?.block || {}).map(([key, entry]) => [key, entry.value?.value || entry.value]));
  const page = blocks[id];
  if (!page) throw new Error('Public page unavailable');
  const title = page.properties?.title?.map(part => part[0]).join('') || '';
  const visited = new Set();
  function firstMedia(block) {
    if (!block || visited.has(block.id)) return;
    visited.add(block.id);
    if (['image', 'video'].includes(block.type) && block.properties?.source?.[0]?.[0]) return block;
    for (const child of block.content || []) {
      if (blocks[child]?.type === 'page') continue;
      const media = firstMedia(blocks[child]);
      if (media) return media;
    }
  }
  const first = firstMedia(page);
  // Exported notes preserve renamed attachment references (image 123.png, etc.).
  // A remote image.png must never be matched to an unrelated local image.png.
  const local = await localNotionMedia(id);
  if (local) {
    try { return { title, ...await asset(`attachment:local:${local}`, key, { origin }), source: 'local-notion-export' }; } catch {}
  }
  if (first) {
    try { return { title, ...await asset(first.properties.source[0][0], key, { blockId: first.id, origin }) }; }
    catch (error) { console.log(`Media fallback: ${title} (${error.message})`); }
  }
  const cover = page.format?.page_cover;
  if (cover) {
    try { return { title, ...await asset(new URL(cover, origin).href, key) }; } catch {}
  }
  return { title, ...await asset(`${origin}/images/favicon.ico`, key, { icon: true }) };
}
async function website(url, key) {
  const response = await request(url);
  const html = await response.text();
  const metadata = Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).map(attr => [attr.property || attr.name, attr.content]));
  const title = metadata['og:title'] || decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '');
  const image = metadata['og:image'] || metadata['twitter:image'];
  if (image && !image.includes('/meta/default.png')) {
    try { return { title, ...await asset(new URL(image, response.url).href, key) }; } catch {}
  }
  const icons = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0])).filter(attr => /(?:^|\s)(?:shortcut )?icon(?:\s|$)/.test(attr.rel || ''));
  const icon = icons.find(attr => attr.href)?.href || '/favicon.ico';
  return { title, ...await asset(new URL(icon, response.url).href, key, { icon: true }) };
}
const pending = [...urls];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (pending.length) {
    const url = pending.shift();
    if (!process.argv.includes('--refresh') && previous[url]?.image && await exists(`public/${previous[url].image}`)) { output[url] = previous[url]; continue; }
    const key = createHash('sha256').update(url).digest('hex').slice(0, 12);
    try {
      output[url] = await (/\.notion\.site$/.test(new URL(url).hostname) ? notion(url, key).catch(() => website(url, key)) : website(url, key));
      console.log(`${output[url].icon ? 'Icon' : output[url].type}: ${new URL(url).pathname}`);
    } catch (error) {
      output[url] = { title: '', type: 'fallback', icon: true };
      console.log(`Fallback: ${new URL(url).hostname} (${error.message})`);
    }
  }
}));
await writeFile('content/link-previews.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Saved ${Object.keys(output).length} link previews.`);
