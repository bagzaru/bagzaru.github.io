import { marked } from 'marked';
import DOMPurify from 'dompurify';
import media from '../content/media.json';
import pages from '../content/pages.json';

const escape = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function renderMarkdown(markdown) {
  if (!markdown.trim()) return '<p class="empty-document">아직 내용이 작성되지 않은 문서입니다.</p>';
  let source = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, filename, width) => {
    const asset = media[filename];
    if (!asset) return '';
    const url = `${import.meta.env.BASE_URL}${asset.url}`;
    const dimensions = `width="${asset.width}" height="${asset.height}"`;
    const size = /^\d+$/.test(width || '') ? ` style="width: ${Number(width)}px; max-width: 100%"` : '';
    if (asset.type === 'video') return `\n\n<figure class="document-media"><video ${dimensions} autoplay loop muted playsinline preload="metadata" aria-label="${escape(filename)}"><source src="${url}" type="video/mp4" /><a href="${url}">영상 열기</a></video></figure>\n\n`;
    return `\n\n<figure class="document-media"${size}><a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${escape(filename)} 원본 보기"><img ${dimensions} src="${url}" alt="${escape(filename.replace(/\.[^.]+$/, ''))}" loading="lazy" decoding="async" /></a></figure>\n\n`;
  });
  source = source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const page = pages.find(page => page.source === target);
    const label = escape(alias || target.split('/').pop());
    return page ? `<a href="#${page.id}">${label}</a>` : `<span class="source-reference" title="원문에서 참조하는 별도 문서">${label}</span>`;
  });
  return DOMPurify.sanitize(marked.parse(source, { breaks: true }), { ADD_TAGS: ['video', 'source'], ADD_ATTR: ['playsinline', 'preload', 'autoplay', 'loop', 'muted'] });
}
