import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const pages = JSON.parse(await readFile(new URL('../content/pages.json', import.meta.url)));
const media = JSON.parse(await readFile(new URL('../content/media.json', import.meta.url)));

test('all 18 pages and every referenced attachment are available locally', async () => {
  assert.equal(pages.length, 18);
  assert.equal(new Set(pages.map(page => page.id)).size, 18);
  assert.deepEqual(pages.map(page => page.id), ['cover', 'introduction', 'projects', 'game-projects', 'maneuver', 'maneuver-hit', 'maneuver-ai', 'maneuver-more', 'camping-alone-vr', 'be-the-player', 'be-the-player-ai', 'be-the-player-diff', 'sunrin-framework', 'version-control', 'simple-git-gui', 'perforce-guide', 'journey', 'closing']);
  assert.deepEqual(pages.filter(page => page.level === 0).map(page => page.id), ['cover', 'introduction', 'projects', 'journey', 'closing']);
  assert.ok(pages.filter(page => page.level > 0).every(page => page.category === 'projects'));
  assert.equal(pages.at(-1).id, 'closing');
  assert.equal(pages.find(page => page.id === 'version-control').layout, 'section-cover');
  for (const id of ['simple-git-gui', 'perforce-guide']) {
    assert.equal(pages.find(page => page.id === id).level, 2);
    assert.equal(pages.find(page => page.id === id).parent, '버전 관리 도구 프로젝트');
  }
  for (const page of pages) {
    const content = await readFile(new URL(`../content/${page.id}.md`, import.meta.url), 'utf8');
    for (const match of content.matchAll(/!\[\[([^\]|]+)/g)) {
      const asset = media[match[1]];
      assert.ok(asset, match[1]);
      assert.ok(asset.width > 0 && asset.height > 0, 'media reserves its layout before loading');
      const file = await stat(new URL(`../public/${asset.url}`, import.meta.url));
      assert.ok(file.size > 0 && file.size < 100 * 1024 * 1024, 'media fits GitHub file limit');
      assert.ok(!asset.url.startsWith('/') && !asset.url.includes('..'), 'repository-relative asset path');
    }
  }
});

test('project covers link to their children with hierarchical numbering', async () => {
  const closing = await readFile(new URL('../content/closing.md', import.meta.url), 'utf8');
  assert.equal(closing.trim(), '# 읽어주셔서 감사합니다.\n\n어떤 일이든 최선을 다하겠습니다.');
  assert.equal(pages.at(-1).layout, 'section-cover');
  for (const [id, heading] of Object.entries({ cover: '백승훈: 포트폴리오', projects: '2. 프로젝트 경험', 'game-projects': '2.1. 게임 프로젝트', 'version-control': '2.2. 버전 관리 도구 프로젝트' })) {
    const content = await readFile(new URL(`../content/${id}.md`, import.meta.url), 'utf8');
    assert.equal(content.split('\n')[0], `# ${heading}`);
    assert.equal(pages.find(page => page.id === id).layout, 'section-cover');
    if (id === 'cover') assert.equal(content.trim(), `# ${heading}`);
  }
  const numberedPages = pages.filter(page => page.number);
  assert.equal(new Set(numberedPages.map(page => page.number)).size, numberedPages.length);
  for (const [id, number] of Object.entries({ 'game-projects': '2.1', maneuver: '2.1.1', 'maneuver-hit': '2.1.1.1', 'version-control': '2.2', 'simple-git-gui': '2.2.1', 'perforce-guide': '2.2.2' })) {
    assert.equal(pages.find(page => page.id === id).number, number);
  }
  for (const [id, children] of Object.entries({ projects: ['game-projects', 'version-control'], 'game-projects': ['maneuver', 'camping-alone-vr', 'be-the-player', 'sunrin-framework'], 'version-control': ['simple-git-gui', 'perforce-guide'] })) {
    const content = await readFile(new URL(`../content/${id}.md`, import.meta.url), 'utf8');
    assert.deepEqual([...content.matchAll(/\]\(#([^)]+)\)/g)].map(match => match[1]), children);
    assert.match(content, /^# /);
  }
});
