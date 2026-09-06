# 백승훈 포트폴리오

Notion 스타일의 문서를 슬라이드처럼 읽는 GitHub Pages용 정적 웹입니다. Noto Sans KR 폰트와 첨부 자료를 사이트에 포함해 외부 CDN 없이 표시합니다.

`Inbox/넥슨 포트폴리오 초안.md` 상단의 15개 문서에 첫 표지·게임 프로젝트 표지·마무리 페이지를 추가해 총 18페이지로 표시합니다. 자기소개 → 프로젝트 경험 → 2.1 게임 프로젝트와 하위 문서 → 2.2 버전 관리 도구와 하위 문서 → 걸어온 길 순서입니다. 각 표지는 가운데 정렬한 목차를 표시하며, 번호는 2.1.1 Maneuver → 2.1.1.1 타격 판정 통과 버그처럼 계층별로 붙입니다.

## 실행

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다. Node.js 20.16 이상을 사용하며 GitHub Actions에서는 Node.js 22로 빌드합니다.

## 문서 수정

- 본문: `content/*.md`
- 순서·제목·목차 번호: `content/pages.json`
- 원문 가져오기 시 순서는 초안 2~16줄에서 읽고, 제목·분류·주소 매핑은 `scripts/import-content.mjs`의 `definitions`를 사용합니다.
- 이미지·영상 매핑: `content/media.json`
- 링크 카드 미리보기: `content/link-previews.json`, `public/link-previews/`. `npm run import:previews`로 새 링크를 가져오고, 기존 미리보기까지 갱신하려면 `npm run import:previews -- --refresh`를 실행합니다. 공개 페이지 또는 notion-id가 일치하는 로컬 Notion 사본의 첫 미디어를 사용하며 결과물에는 로컬 미리보기 파일만 포함됩니다.
- 스타일: `src/style.css`
- 페이지 전환 규칙: `src/navigation.js`

Obsidian 원문을 다시 가져오려면 다음 명령을 실행합니다. 프로젝트의 기존 본문 파일을 원문으로 덮어씁니다. Obsidian 원본은 수정하지 않습니다.

```sh
npm run import:content -- "E:/Obsidian/bagzaru"
```

GIF/MOV 및 영상은 H.264 MP4로 변환합니다. 기존 변환 파일은 재사용하므로 같은 이름의 원본 영상이 변경되었다면 해당 `public/media/` 변환 파일을 삭제한 뒤 다시 가져옵니다. 빌드와 배포에는 Obsidian 폴더가 필요하지 않습니다.

## 조작

- 휠·위아래 방향키: 본문을 스크롤하고 문서 끝에서 페이지 전환.
- 긴 문서: 끝에서 200ms 대기하고 새로 스크롤하거나 방향키를 다시 누르면 전환. 트랙패드 관성과 키 반복에 의한 연속 전환을 방지합니다.
- 좌우 방향키·하단 버튼·목차: 스크롤 위치와 무관하게 페이지 전환.
- 터치: 본문 스크롤 후 끝에서 새로 스와이프하면 전환.
- 화면 너비 1200px 미만: 햄버거 버튼으로 목차 표시. 배경 클릭·Escape로 닫기.
- 전환: 페이드아웃 500ms + 페이드인 500ms, 총 1초. 페이지 페이드는 동작 줄이기 설정에서도 유지하며, 목차와 진행률 애니메이션은 해당 설정을 따릅니다.

## GitHub Pages

GitHub 저장소를 연결한 뒤 Settings → Pages → Source를 **GitHub Actions**로 설정합니다. `main` 또는 `master`에 푸시하면 `.github/workflows/pages.yml`에서 검사·빌드·배포합니다. 수동 실행도 지원합니다.

`base: './'`과 해시 페이지 주소를 사용하여 사용자 사이트와 `/저장소이름/` 하위 사이트 모두에서 동작합니다. 현재 프로젝트에는 원격 저장소가 연결되어 있지 않아 실제 게시를 수행하지 않았습니다.

참고: [GitHub Pages 사용자 정의 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite 정적 배포](https://vite.dev/guide/static-deploy.html).

원문에서 확인한 미완성 내용은 `Docs/ContentNotes.md`를 참고하세요.
