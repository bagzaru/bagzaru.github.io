import '@fontsource-variable/noto-sans-kr';
import './style.css';
import pages from '../content/pages.json';
import { renderMarkdown } from './markdown.js';
import { arrangeJourney } from './journey.js';
import { arrangeLinkCards } from './link-cards.js';
import { PageNavigation, TRANSITION_DURATION } from './navigation.js';

const documents = import.meta.glob('../content/*.md', { query: '?raw', import: 'default', eager: true });
const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const indexFromHash = () => Math.max(0, pages.findIndex(page => `#${page.id}` === location.hash));
const navigation = new PageNavigation(pages.length, indexFromHash());
const wideScreen = window.matchMedia('(min-width: 1200px)');
const tocLink = (page, index) => `<a href="#${page.id}" data-page="${index}" class="toc-item ${page.level === 0 ? 'toc-major' : 'nested'} ${page.level >= 2 ? 'toc-detail' : ''} ${page.level >= 3 ? 'toc-subdetail' : ''}"><span class="toc-number">${page.number}</span><span>${page.title}</span><span class="active-dot" aria-hidden="true"></span></a>`;
const toc = pages.filter(page => page.level === 0).map(major => {
  const children = pages.filter(page => page.level > 0 && page.category === major.id);
  return `<li class="toc-section">${tocLink(major, pages.indexOf(major))}${children.length ? `<ul class="toc-children" aria-label="${major.title} 소분류">${children.map(page => `<li>${tocLink(page, pages.indexOf(page))}</li>`).join('')}</ul>` : ''}</li>`;
}).join('');

document.querySelector('#app').innerHTML = `
  <a class="skip-link" href="#reader">본문으로 건너뛰기</a>
  <header class="topbar">
    <button class="icon-button menu-toggle" aria-label="목차 열기" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <a class="wordmark" href="#cover"><strong>백승훈</strong><span class="wordmark-separator">|</span><span>포트폴리오</span></a>
    <span class="topbar-note">GAME DEVELOPER</span>
  </header>
  <div class="drawer-overlay" hidden></div>
  <aside id="sidebar" class="sidebar" aria-label="포트폴리오 목차">
    <div class="sidebar-heading"><span>목차</span><button class="icon-button drawer-close" aria-label="목차 닫기">${icon('close')}</button></div>
    <nav aria-label="페이지"><ul class="toc-sections">${toc}</ul></nav>
    <div class="sidebar-footer"><span>백승훈</span><span>게임 개발 포트폴리오</span></div>
  </aside>
  <main class="reader" id="reader" tabindex="-1" aria-label="포트폴리오 본문"><article class="document"></article></main>
  <footer class="page-footer">
    <span class="reading-hint">스크롤하여 페이지를 넘길 수 있습니다.</span>
    <div class="pagination" aria-label="페이지 이동">
      <button class="icon-button previous" aria-label="이전 페이지">${icon('left')}</button>
      <div class="page-status"><span class="page-count" aria-live="polite" aria-atomic="true"></span><div class="progress-track" role="progressbar" aria-label="전체 페이지 진행률" aria-valuemin="1" aria-valuemax="${pages.length}"><span class="progress-fill"></span></div></div>
      <button class="icon-button next" aria-label="다음 페이지">${icon('right')}</button>
    </div>
    <span class="footer-title"></span>
  </footer>`;

const reader = document.querySelector('.reader');
reader.style.setProperty('--page-fade-duration', `${TRANSITION_DURATION / 2}ms`);
const article = document.querySelector('.document');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.drawer-overlay');
const menuToggle = document.querySelector('.menu-toggle');
const previous = document.querySelector('.previous');
const next = document.querySelector('.next');
let transitioning = false;
let drawerOpen = false;
let touch = null;
const maxScroll = () => Math.max(0, reader.scrollHeight - reader.clientHeight);

function setDrawer(open, restoreFocus = true) {
  drawerOpen = open && !wideScreen.matches;
  sidebar.classList.toggle('open', drawerOpen);
  sidebar.inert = !wideScreen.matches && !drawerOpen;
  overlay.hidden = !drawerOpen;
  menuToggle.setAttribute('aria-expanded', String(drawerOpen));
  reader.inert = drawerOpen;
  document.querySelector('.page-footer').inert = drawerOpen;
  if (drawerOpen) sidebar.querySelector('[aria-current="page"]').focus();
  else if (restoreFocus && !wideScreen.matches) menuToggle.focus();
}

function arrangeIntroduction() {
  article.querySelectorAll('a[href^="mailto:"]').forEach(link => link.replaceWith(document.createTextNode(link.textContent)));
  const headings = [...article.querySelectorAll(':scope > h2, :scope > h3')];
  for (const titles of [['Contacts', 'Links'], ['학력', '병역']]) {
    const pair = titles.map(title => headings.find(heading => heading.textContent.trim() === title));
    if (pair.some(heading => !heading)) continue;

    const columns = document.createElement('div');
    columns.className = 'introduction-columns';
    pair[0].before(columns);
    for (const heading of pair) {
      const section = document.createElement('section');
      section.setAttribute('aria-label', heading.textContent.trim());
      const level = Number(heading.tagName.slice(1));
      let node = heading;
      do {
        const next = node.nextElementSibling;
        section.append(node);
        node = next;
      } while (node && !(/^H[1-6]$/.test(node.tagName) && Number(node.tagName.slice(1)) <= level));
      columns.append(section);
    }
  }
}

function arrangeProjectDetails() {
  const headings = [...article.querySelectorAll(':scope > h2, :scope > h3, :scope > h4')];
  const pair = ['언어 및 도구', '개발 기간'].map(title => headings.find(heading => heading.textContent.trim() === title));
  if (pair.some(heading => !heading)) return;
  const columns = document.createElement('div');
  columns.className = 'project-detail-columns';
  pair[0].before(columns);
  for (const heading of pair) {
    const section = document.createElement('section');
    section.setAttribute('aria-label', heading.textContent.trim());
    const level = Number(heading.tagName.slice(1));
    let node = heading;
    do {
      const next = node.nextElementSibling;
      section.append(node);
      node = next;
    } while (node && !(/^H[1-6]$/.test(node.tagName) && Number(node.tagName.slice(1)) <= level));
    columns.append(section);
  }
}

function renderPage({ backwards = false, focus = false } = {}) {
  const page = pages[navigation.index];
  const markup = renderMarkdown(documents[`../content/${page.id}.md`] || '');
  article.className = `document ${page.id === 'introduction' ? 'introduction' : ''} ${page.layout || ''}`;
  const context = page.level > 0 ? `프로젝트 경험${page.parent ? ` / ${page.parent}` : ''}` : page.title;
  article.innerHTML = `${page.layout === 'section-cover' ? '' : `<div class="document-eyebrow"><span>${page.number}</span><span>${context}</span></div>`}${markup}`;
  if (page.id === 'cover') {
    const hint = document.createElement('p');
    hint.className = 'web-only';
    hint.textContent = '스크롤이나 방향키로 페이지를 넘길 수 있습니다';
    article.querySelector('h1').after(hint);
  }
  if (page.id === 'introduction') arrangeIntroduction();
  if (page.id === 'journey') arrangeJourney(article);
  arrangeProjectDetails();
  if (page.id === 'maneuver') {
    const scenes = [...article.querySelectorAll(':scope > .document-media')].slice(0, 3);
    if (scenes.length === 3) {
      const gallery = document.createElement('div');
      gallery.className = 'maneuver-gallery';
      scenes[0].before(gallery);
      gallery.append(...scenes);
    }
  }
  if (page.id === 'maneuver-more') {
    const mediaForHeading = title => {
      const heading = [...article.querySelectorAll(':scope > h3')].find(node => node.textContent.trim() === title);
      const media = [];
      let node = heading?.nextElementSibling;
      while (node && !/^H[1-6]$/.test(node.tagName)) {
        if (node.matches('.document-media')) media.push(node);
        node = node.nextElementSibling;
      }
      return media;
    };
    mediaForHeading('대쉬 기능 구현').forEach(media => media.classList.add('dash-media'));
    const effects = mediaForHeading('무기, 총알 VFX 구현');
    if (effects.length) {
      const gallery = document.createElement('div');
      gallery.className = 'vfx-gallery';
      effects[0].before(gallery);
      gallery.append(...effects);
    }
  }
  if (page.id === 'camping-alone-vr') {
    const photos = [...article.querySelectorAll(':scope > .document-media')].slice(0, 4);
    if (photos.length === 4) {
      const gallery = document.createElement('div');
      gallery.className = 'camping-gallery';
      photos[0].before(gallery);
      gallery.append(...photos);
    }
  }
  if (page.id === 'simple-git-gui') {
    const photos = [...article.querySelectorAll(':scope > .document-media')].slice(0, 2);
    if (photos.length === 2) {
      const gallery = document.createElement('div');
      gallery.className = 'git-gui-gallery';
      photos[0].before(gallery);
      gallery.append(...photos);
    }
  }
  if (page.id === 'sunrin-framework') {
    const photos = [...article.querySelectorAll(':scope > .document-media')].slice(0, 4);
    if (photos.length === 4) {
      const gallery = document.createElement('div');
      gallery.className = 'sunrin-gallery';
      const stack = document.createElement('div');
      stack.className = 'sunrin-gallery-stack';
      photos[0].before(gallery);
      stack.append(...photos.slice(0, 3));
      gallery.append(photos[3], stack);
    }
  }
  if (page.id === 'be-the-player-ai') {
    const photo = article.querySelector(':scope > .document-media');
    const introduction = [...article.querySelectorAll(':scope > p')].find(paragraph => paragraph.textContent.trim().startsWith('현재는 다음과 같은 방식으로'));
    const steps = article.querySelector(':scope > ol');
    if (photo && introduction && steps) {
      const layout = document.createElement('div');
      layout.className = 'ai-loop-layout';
      photo.before(introduction);
      introduction.after(layout);
      layout.append(photo, steps);
    }
  }
  arrangeLinkCards(article);
  article.querySelectorAll('video').forEach(video => {
    video.muted = true;
    // A blocked or interrupted autoplay request must not break navigation.
    video.play().catch(() => {});
  });
  let heading = article.querySelector('h1');
  if (!heading) {
    const firstHeading = article.querySelector('h2');
    if (firstHeading?.textContent.trim() === page.title) firstHeading.remove();
    heading = document.createElement('h1');
    heading.textContent = page.title;
    article.querySelector('.document-eyebrow').after(heading);
  }
  heading.id = 'page-heading';
  heading.tabIndex = -1;
  reader.setAttribute('aria-labelledby', 'page-heading');
  article.querySelectorAll('a[href^="http"]').forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
  document.querySelectorAll('.toc-item').forEach((link, index) => {
    if (index === navigation.index) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.toc-section').forEach(section => {
    section.classList.toggle('contains-current', Boolean(section.querySelector('[aria-current="page"]')));
  });
  document.querySelector('.page-count').innerHTML = `<strong>${navigation.index + 1}</strong><span>/</span><span>${pages.length}</span>`;
  document.querySelector('.progress-fill').style.width = `${(navigation.index + 1) / pages.length * 100}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', navigation.index + 1);
  document.querySelector('.footer-title').textContent = page.title;
  previous.disabled = navigation.index === 0;
  next.disabled = navigation.index === pages.length - 1;
  document.title = `${page.title} · 백승훈 포트폴리오`;
  if (focus) heading.focus({ preventScroll: true });
  reader.scrollTop = backwards ? maxScroll() : 0;
  navigation.observe(reader.scrollTop, maxScroll(), performance.now());
}

function animatePage(backwards, historyMode = 'push', focus = false) {
  transitioning = true;
  reader.querySelectorAll('video').forEach(video => video.pause());
  const hash = `#${pages[navigation.index].id}`;
  if (location.hash !== hash) history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', hash);
  setDrawer(false, false);
  reader.classList.add('fading-out');
  const halfDuration = TRANSITION_DURATION / 2;
  setTimeout(() => {
    renderPage({ backwards, focus });
    reader.classList.remove('fading-out');
    setTimeout(() => { transitioning = false; }, halfDuration);
  }, halfDuration);
}

function goTo(index, { historyMode = 'push', focus = true } = {}) {
  if (transitioning) return;
  const backwards = index < navigation.index;
  if (navigation.move(index, performance.now())) animatePage(backwards, historyMode, focus);
  else if (index === navigation.index && drawerOpen) { setDrawer(false, false); article.querySelector('h1').focus({ preventScroll: true }); }
}

function vertical(direction, fresh, confirmShortForward = true) {
  if (transitioning || drawerOpen) {
    navigation.lastInput = performance.now();
    return 'wait';
  }
  const result = navigation.vertical(direction, { top: reader.scrollTop, max: maxScroll(), now: performance.now(), fresh, confirmShortForward });
  if (result === 'page') animatePage(direction < 0);
  return result;
}

reader.addEventListener('scroll', () => {
  if (!transitioning) navigation.observe(reader.scrollTop, maxScroll(), performance.now());
}, { passive: true });

reader.addEventListener('wheel', event => {
  if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
  // Native controls keep their own keyboard, zoom and pointer semantics.
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  const result = vertical(Math.sign(event.deltaY));
  if (result !== 'scroll') event.preventDefault();
}, { passive: false });

reader.addEventListener('touchstart', event => {
  if (event.touches.length !== 1 || event.target.closest('video, a, button')) { touch = null; return; }
  touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, atTop: reader.scrollTop <= 2, atBottom: reader.scrollTop >= maxScroll() - 2, handled: false };
}, { passive: true });
reader.addEventListener('touchmove', event => {
  if (!touch || event.touches.length !== 1) return;
  const dy = touch.y - event.touches[0].clientY;
  const dx = touch.x - event.touches[0].clientX;
  if (Math.abs(dy) < 45 || Math.abs(dx) > Math.abs(dy)) return;
  if (touch.handled || transitioning) { event.preventDefault(); return; }
  const direction = Math.sign(dy);
  if (direction > 0 ? touch.atBottom : touch.atTop) {
    touch.handled = true;
    if (vertical(direction, true) !== 'scroll') event.preventDefault();
  }
}, { passive: false });
reader.addEventListener('touchend', () => { touch = null; }, { passive: true });
reader.addEventListener('touchcancel', () => { touch = null; }, { passive: true });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && drawerOpen) { setDrawer(false); return; }
  if (drawerOpen) {
    if (event.key === 'Tab') {
      const controls = [...sidebar.querySelectorAll('a, button')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('video, input, textarea, select, [contenteditable="true"]')) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    if (!event.repeat) goTo(navigation.index + (event.key === 'ArrowRight' ? 1 : -1));
  } else {
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    if (vertical(direction, !event.repeat, false) === 'scroll') reader.scrollTop += direction * 72;
  }
});

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const index = pages.findIndex(page => `#${page.id}` === link.getAttribute('href'));
  if (index < 0) return;
  event.preventDefault();
  goTo(index);
});
previous.addEventListener('click', () => goTo(navigation.index - 1));
next.addEventListener('click', () => goTo(navigation.index + 1));
menuToggle.addEventListener('click', () => setDrawer(!drawerOpen));
document.querySelector('.drawer-close').addEventListener('click', () => setDrawer(false));
overlay.addEventListener('click', () => setDrawer(false));
wideScreen.addEventListener('change', () => setDrawer(false, false));
let hashTimer;
window.addEventListener('hashchange', () => {
  clearTimeout(hashTimer);
  const target = indexFromHash();
  hashTimer = setTimeout(() => goTo(target, { historyMode: 'replace' }), Math.max(0, navigation.lockUntil - performance.now()) + 20);
});

renderPage();
setDrawer(false, false);
history.replaceState(null, '', `#${pages[navigation.index].id}`);
