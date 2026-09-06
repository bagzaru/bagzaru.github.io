import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const vault = process.argv[2] || 'E:/Obsidian/bagzaru';
const root = process.cwd();
const indexMarkdown = await readFile(path.join(vault, 'Inbox', '넥슨 포트폴리오 초안.md'), 'utf8');
const indexList = indexMarkdown.trimStart().split(/\r?\n\s*\r?\n/, 1)[0];
const names = [...indexList.matchAll(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*$/gm)].map(match => match[1]);
const definitions = {
  '자기소개': { id: 'introduction', title: '자기소개', number: '01', level: 0 },
  '프로젝트 경험': { id: 'projects', title: '프로젝트 경험', number: '02', level: 0, layout: 'section-cover' },
  '1.Maneuver': { id: 'maneuver', title: 'Maneuver', number: '1', level: 1 },
  '1.1.Maneuver_타격 판정 통과 버그': { id: 'maneuver-hit', title: '타격 판정 통과 버그', number: '1.1', level: 2, parent: 'Maneuver' },
  '1.2.Maneuver_AI': { id: 'maneuver-ai', title: 'AI 움직임 개선', number: '1.2', level: 2, parent: 'Maneuver' },
  '1.3.Maneuver_그 외 맡은 역할들': { id: 'maneuver-more', title: '그 외 맡은 역할들', number: '1.3', level: 2, parent: 'Maneuver' },
  '2.CampingAloneVR': { id: 'camping-alone-vr', title: 'Camping Alone VR', number: '2', level: 1 },
  '3.BeThePlayer': { id: 'be-the-player', title: 'BeThePlayer', number: '3', level: 1 },
  '3.1.BeThePlayer_AI 개발 루프': { id: 'be-the-player-ai', title: 'AI 개발 루프', number: '3.1', level: 2, parent: 'BeThePlayer' },
  '3.2.BeThePlayer_DiffToolBuild': { id: 'be-the-player-diff', title: 'Diff Tool Build', number: '3.2', level: 2, parent: 'BeThePlayer' },
  '4.선린 게임프레임워크': { id: 'sunrin-framework', title: '선린 게임프레임워크', number: '4', level: 1 },
  '5.버전 관리 도구': { id: 'version-control', title: '버전 관리 도구 프로젝트', number: '5', level: 1, layout: 'section-cover' },
  '5.1.Simple_Git_GUI': { id: 'simple-git-gui', title: 'Simple-Git-GUI', number: '5.1', level: 2, parent: '버전 관리 도구 프로젝트' },
  '5.2.Perforce 가이드 문서': { id: 'perforce-guide', title: 'Perforce 가이드 문서', number: '5.2', level: 2, parent: '버전 관리 도구 프로젝트' },
  '걸어온 길': { id: 'journey', title: '걸어온 길', number: '03', level: 0 },
};
if (!names.length || names.some(name => !definitions[name])) throw new Error('초안 상단의 문서 목록에 맞춰 definitions를 갱신해주세요.');
const pages = names.map(source => ({ ...definitions[source], source, category: definitions[source].level > 0 ? 'projects' : definitions[source].id }));
for (const page of pages) {
  if (page.level === 0) continue;
  if (page.id === 'version-control') {
    page.number = '2.2';
  } else if (page.number.startsWith('5.')) {
    page.number = `2.2.${page.number.slice(2)}`;
    page.section = 'version-control';
  } else {
    page.number = `2.1.${page.number}`;
    page.level += 1;
    page.section = 'game-projects';
  }
}
pages.splice(pages.findIndex(page => page.id === 'projects') + 1, 0, {
  id: 'game-projects', title: '게임 프로젝트', number: '2.1', level: 1,
  category: 'projects', layout: 'section-cover',
});
pages.unshift({ id: 'cover', title: '포트폴리오', number: '', level: 0, category: 'cover', layout: 'section-cover' });
pages.push({ id: 'closing', title: '감사합니다', number: '', level: 0, category: 'closing', layout: 'section-cover' });
const coverLinks = items => items.map(item => `[${item.number}. ${item.title}](#${item.id})`).join('\n\n');
await mkdir(path.join(root, 'content'), { recursive: true });
await mkdir(path.join(root, 'public/media'), { recursive: true });
const attachments = await readdir(path.join(vault, 'attachments'));
const media = {};
function dimensions(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-i', input], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let metadata = '';
    child.stderr.on('data', data => { metadata += data; });
    child.on('error', reject);
    child.on('close', () => {
      const match = metadata.match(/Video:.*?\b(\d{2,5})x(\d{2,5})\b/);
      if (!match) return reject(new Error(`Cannot read media dimensions: ${input}`));
      resolve({ width: Number(match[1]), height: Number(match[2]) });
    });
  });
}
function convert(input, output, gif) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', input, '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    if (gif) args.push('-an');
    else args.push('-c:a', 'aac', '-b:a', '128k');
    args.push(output);
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let error = '';
    child.stderr.on('data', data => { error = (error + data).slice(-3000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
  });
}
for (const page of pages) {
  let markdown = page.source ? await readFile(path.join(vault, 'Inbox', `${page.source}.md`), 'utf8') : '';
  if (page.id === 'cover') markdown = '# 백승훈: 포트폴리오\n';
  if (page.id === 'closing') markdown = '# 읽어주셔서 감사합니다.\n\n어떤 일이든 최선을 다하겠습니다.\n';
  if (page.id === 'introduction') {
    markdown = markdown.replace(/\[bagzaru3690@gmail\.com\]\(mailto:bagzaru3690@gmail\.com\)/g, 'bagzaru3690@gmail.com')
      .replace(/\+82 10 7674 3738/g, '010-7674-3738');
    // Preserve the requested paragraph split when refreshing the source note.
    markdown = markdown.replace(/(^> \*\*안녕하세요[^\n]*\r?\n)(?=> \*\*많은 사람들이)/m, '$1>\n');
  }
  if (page.id === 'sunrin-framework') {
    // Preserve the selected replacement image when refreshing the source note.
    markdown = markdown.replace(/!\[\[Pasted image 20260905221413\.png(?:\|[^\]]+)?\]\]/g, '![[Pasted image 20260905223445 - 복사본.png]]');
  }
  // The source cover contains layout directions, not publication copy.
  // Its visible list follows the authoritative index, including new detail pages.
  if (page.id === 'projects') {
    markdown = '# 2. 프로젝트 경험\n\n' + coverLinks(pages.filter(item => item.level === 1)) + '\n';
  }
  if (page.id === 'game-projects') {
    markdown = `# ${page.number}. ${page.title}\n\n${coverLinks(pages.filter(item => item.section === page.id && item.level === 2))}\n`;
  }
  if (page.id === 'version-control') {
    const introduction = markdown.match(/^>\s*(.+)$/m)?.[1]?.trim();
    if (!introduction) throw new Error('버전 관리 도구 표지의 소개 문장을 확인해주세요.');
    markdown = `# ${page.number}. ${page.title}\n\n${introduction}\n\n${coverLinks(pages.filter(item => item.section === page.id))}\n`;
  }
  if (page.level > 0 && page.layout !== 'section-cover') {
    // Keep source filenames stable while updating visible numbered headings.
    markdown = markdown.replace(/^(#{1,6})\s+\d+(?:\.\d+)*\.?\s+/m, `$1 ${page.number}. `);
  }
  await writeFile(path.join(root, 'content', `${page.id}.md`), markdown);
  for (const match of markdown.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const name = match[1];
    if (media[name]) continue;
    if (!attachments.includes(name)) throw new Error(`Missing attachment: ${name}`);
    const input = path.join(vault, 'attachments', name);
    const ext = path.extname(name).toLowerCase();
    const video = ['.gif', '.mp4', '.mov'].includes(ext);
    const filename = createHash('sha256').update(name).digest('hex').slice(0, 12) + (video ? '.mp4' : ext);
    const output = path.join(root, 'public/media', filename);
    if (!await stat(output).catch(() => null)) {
      if (video) await convert(input, output, ext === '.gif');
      else await copyFile(input, output);
    }
    media[name] = { url: `media/${filename}`, type: video ? 'video' : 'image', loop: ext === '.gif', ...await dimensions(output) };
    console.log(`Imported: ${name} (${Math.round((await stat(output)).size / 1024)} KB)`);
  }
}
await writeFile(path.join(root, 'content/pages.json'), JSON.stringify(pages, null, 2) + '\n');
await writeFile(path.join(root, 'content/media.json'), JSON.stringify(media, null, 2) + '\n');
console.log(`Imported ${pages.length} pages and ${Object.keys(media).length} media assets.`);
