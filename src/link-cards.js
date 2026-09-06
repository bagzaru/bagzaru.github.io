import previews from '../content/link-previews.json';
import pages from '../content/pages.json';
import mediaAssets from '../content/media.json';
const documents = import.meta.glob('../content/*.md', { query: '?raw', import: 'default', eager: true });

export function arrangeLinkCards(article) {
  for (const link of article.querySelectorAll('a[href]')) {
    if (link.closest('.document-media, .section-cover') || link.querySelector('img') || !link.textContent.trim()) continue;
    const href = link.getAttribute('href');
    const internalPage = pages.find(page => href === `#${page.id}`);
    if (!/^(https?:|mailto:)/.test(href) && !internalPage) continue;
    const firstMedia = internalPage && documents[`../content/${internalPage.id}.md`]?.match(/!\[\[([^\]|]+)/)?.[1];
    const asset = mediaAssets[firstMedia];
    const preview = internalPage ? { title: internalPage.title, image: asset?.url, type: asset?.type } : previews[href] || {};
    const original = link.textContent.trim().replace(/^🔗\s*/, '');
    const [mainText, ...rest] = original.split(' - ');
    const descriptionNode = link.parentElement.querySelector(':scope > .journey-project-description');
    const period = link.parentElement.querySelector(':scope > .journey-period');
    const host = internalPage ? `${internalPage.number} ${internalPage.title}` : href.startsWith('mailto:') ? '이메일' : new URL(href).hostname.replace(/^www\./, '');
    const contextLabel = link.parentElement.querySelector(':scope > strong')?.textContent;
    const title = /^https?:\/\//.test(original) ? contextLabel || preview.title || host : mainText;
    const description = descriptionNode?.textContent || rest.join(' - ').replace(/,\s*$/, '') || host;

    link.classList.add('link-card');
    link.replaceChildren();
    const thumbnail = document.createElement('span');
    thumbnail.className = `link-card-preview ${preview.icon || !preview.image ? 'is-icon' : ''}`;
    thumbnail.setAttribute('aria-hidden', 'true');
    const fallback = () => { thumbnail.textContent = href.startsWith('mailto:') ? '@' : host.charAt(0).toUpperCase(); thumbnail.classList.add('is-icon'); };
    if (preview.image) {
      const media = document.createElement(preview.type === 'video' ? 'video' : 'img');
      media.src = `${import.meta.env.BASE_URL}${preview.image}`;
      if (preview.type === 'video') {
        media.autoplay = true;
        media.loop = true;
        media.muted = true;
        media.playsInline = true;
        media.preload = 'metadata';
      } else {
        media.alt = '';
        media.loading = 'lazy';
        media.decoding = 'async';
      }
      media.addEventListener('error', fallback, { once: true });
      thumbnail.append(media);
    } else fallback();
    const copy = document.createElement('span');
    copy.className = 'link-card-copy';
    const heading = document.createElement('span');
    heading.className = 'link-card-title';
    const strong = document.createElement('strong');
    strong.textContent = title;
    heading.append(strong);
    if (period) heading.append(period);
    const detail = document.createElement('span');
    detail.className = 'link-card-description';
    detail.textContent = description;
    if (link.closest('.journey-timeline')) {
      let summary = description;
      let role = '';
      const sentence = description.match(/^(.*?[.!?])\s+([^.!?]*(?:담당|구현)[^.!?]*[.!?]?)$/);
      const game = description.match(/^(.*?(?:게임|액션|소울라이크)),\s*(.+담당.*)$/);
      const assignment = description.match(/^(.*?과제),\s*(.+담당.*)$/);
      if (sentence) [, summary, role] = sentence;
      else if (game) { summary = `${game[1]}.`; role = game[2]; }
      else if (assignment) { summary = `${assignment[1]}.`; role = assignment[2]; }
      else if (description.includes('담당')) { summary = ''; role = description; }
      if (role) {
        detail.textContent = summary;
        const responsibilities = document.createElement('span');
        responsibilities.className = 'link-card-role';
        responsibilities.textContent = `- ${role}`;
        detail.append(responsibilities);
        link.classList.add('has-role');
      }
    }
    copy.append(heading, detail);
    link.append(thumbnail, copy);
    descriptionNode?.remove();
  }
}
