import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { marked } from 'marked';

test('every external content link has a portable preview or explicit fallback', async () => {
  const previews = JSON.parse(await readFile(new URL('../content/link-previews.json', import.meta.url), 'utf8'));
  for (const file of await readdir(new URL('../content/', import.meta.url))) {
    if (!file.endsWith('.md')) continue;
    marked.walkTokens(marked.lexer(await readFile(new URL(`../content/${file}`, import.meta.url), 'utf8')), token => {
      if (token.type === 'link' && /^https?:\/\//.test(token.href)) assert.ok(previews[token.href], token.href);
    });
  }
  for (const preview of Object.values(previews)) {
    if (!preview.image) { assert.equal(preview.type, 'fallback'); continue; }
    assert.match(preview.image, /^link-previews\/[a-f\d]+\.(webp|mp4|svg)$/);
    const file = await stat(new URL(`../public/${preview.image}`, import.meta.url));
    assert.ok(file.size > 0 && file.size < 10 * 1024 * 1024);
    if (preview.type === 'video') assert.ok(preview.image.endsWith('.mp4'));
  }
});
