export function arrangeJourney(article) {
  const headings = [...article.querySelectorAll(':scope > h3, :scope > h4')]
    .filter(heading => /^20\d{2}/.test(heading.textContent.trim()));
  if (!headings.length) return;

  const timeline = document.createElement('div');
  timeline.className = 'journey-timeline';
  timeline.setAttribute('aria-label', '연도별 프로젝트와 활동');
  headings[0].before(timeline);
  const years = new Map();
  function yearContent(year) {
    if (!years.has(year)) {
      const row = document.createElement('section');
      row.className = 'journey-year';
      row.setAttribute('aria-label', `${year}년`);
      const marker = document.createElement('span');
      marker.className = 'journey-year-marker';
      marker.textContent = year;
      marker.setAttribute('aria-hidden', 'true');
      const content = document.createElement('div');
      content.className = 'journey-year-content';
      row.append(marker, content);
      years.set(year, { row, content });
    }
    return years.get(year).content;
  }

  for (const heading of headings) {
    const match = heading.textContent.trim().match(/^(20\d{2})(?:~(20\d{2}))?\s*(?:-\s*)?(.*)$/);
    if (!match) continue;
    const [, year, endYear, title] = match;
    const content = yearContent(year);
    const nodes = [];
    let node = heading.nextElementSibling;
    while (node && !/^H[1-6]$/.test(node.tagName)) {
      const next = node.nextElementSibling;
      nodes.push(node);
      node = next;
    }
    if (title) {
      const titleNode = document.createElement(year === '2019' && title.includes('협력강사') ? 'h3' : 'h2');
      titleNode.textContent = title + (endYear && year !== '2019' ? ` (${year}~${endYear})` : '');
      content.append(titleNode);
    }
    content.append(...nodes);
    heading.remove();
  }

  // The source places this 2020 project under the 2019 enrollment heading.
  const colorful = [...yearContent('2019').querySelectorAll('li')]
    .find(item => item.querySelector('a')?.textContent.startsWith('Colorful Bullet Hell'));
  if (colorful) {
    const list = document.createElement('ul');
    list.append(colorful);
    yearContent('2020').append(list);
  }

  const teaching = [...yearContent('2019').querySelectorAll(':scope > h3')]
    .find(heading => heading.textContent.includes('협력강사'));
  if (teaching) {
    const teachingProjects = teaching.nextElementSibling;
    yearContent('2020').append(teaching);
    if (teachingProjects?.tagName === 'UL') yearContent('2020').append(teachingProjects);
  }

  const first = Math.min(...[...years.keys()].map(Number));
  const last = Math.max(...[...years.keys()].map(Number));
  for (let year = first; year <= last; year += 1) {
    if (year === 2018 || year === 2022) continue;
    yearContent(String(year));
    const { row, content } = years.get(String(year));
    content.querySelectorAll('li').forEach(item => {
      if (!item.textContent.trim()) item.remove();
    });
    content.querySelectorAll('ul').forEach(list => {
      if (!list.children.length) list.remove();
    });
    content.querySelectorAll('li > a').forEach(link => {
      const [name, ...description] = link.textContent.split(' - ');
      if (!description.length) return;
      link.textContent = name;
      if (name === '선린 게임프레임워크') {
        const period = document.createElement('span');
        period.className = 'journey-period';
        period.textContent = ' (2019~2020)';
        link.after(period);
      }
      const detail = document.createElement('span');
      detail.className = 'journey-project-description';
      detail.textContent = description.join(' - ').replace(/,\s*$/, '');
      link.parentElement.append(detail);
    });
    if (!content.textContent.trim()) row.classList.add('journey-year-empty');
    timeline.append(row);
  }
}
