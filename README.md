# mybr.ai

> my digital brain, powered by ai.

배우고, 만들고, 실패하고, 해결한 개발 지식을 서로 연결된 기록으로 쌓는 한국어 개인 기술 블로그입니다. 읽기 좋은 개발 블로그이면서, AI 도구·플러그인·스킬·워크플로를 **직접 써 보고 검증한 결과**만 남기는 곳을 목표로 합니다.

**상태:** 개발 중입니다. 사이트 시스템을 구현했고 첫 글을 준비하고 있습니다. 배포 전입니다.

주소(배포 후): https://zzmnxn.github.io/mybr-ai/

## 콘텐츠

| 영역 | 내용 |
|---|---|
| Knowledge | 개념, 비교, 가이드 |
| Experience | 트러블슈팅, 프로젝트, 문제 풀이, 회고 |
| AI Hub | 제작 기록, 플러그인/스킬 후기, 워크플로, 실험 |

글은 `src/content/notes/`의 Markdown 파일 하나씩이며, 메타데이터(section, kind, domains, growth 등)로 분류됩니다.

`growth`는 글이 얼마나 다듬어졌는지를 나타냅니다.

| growth | 뜻 |
|---|---|
| Impulse | 처음 기록한 글 |
| Synapse | 다른 글과 연결하고 보완한 글 |
| Engram | 충분히 검토한 글 |

## 글 올리기

1. `src/content/notes/<permalink>.md`를 만듭니다.
2. frontmatter를 채웁니다. 필드 규칙은 `src/content.config.ts`가 기준입니다.

   ```yaml
   ---
   uid: know-binary-search        # know- | exp- | hub- 로 시작, 바꾸지 않음
   permalink: binary-search       # 주소: /notes/binary-search
   title: "이진 탐색"
   summary: "한두 문장 요약"
   section: knowledge             # knowledge | experience | ai-hub
   kind: concept                  # section에 맞는 kind
   domains: [algorithm]
   growth: impulse
   publication: published         # 이 저장소에는 published | archived만
   createdAt: 2026-11-08
   publishedAt: 2026-11-08
   tags: [Binary Search]
   related:                       # 선택. 연결할 글과 관계
     - { uid: know-two-pointers, relation: related }
   ---
   ```

3. `npm run build`로 확인합니다. 규칙에 어긋나면 빌드가 이유와 함께 멈춥니다.
4. `main`에 push하면 자동으로 배포됩니다.

공개 전 원고는 이 저장소에 두지 않습니다.

## 첫 출시 범위

Home, Knowledge, Experience, AI Hub, About, 개별 글 페이지, 주제별 목록, 메타데이터로 그린 뇌 그래프. 목록 필터는 주소에 남아 공유할 수 있습니다. Wikilink, 백링크, 검색은 이후 단계입니다.

## 기술 스택

- [Astro](https://astro.build), TypeScript, Content Collections
- 그래프: D3 모듈(force, zoom, drag)
- 정적 빌드, GitHub Actions → GitHub Pages
- 서버·DB 없음

## 개발

Node.js 22.23.4 이상이 필요합니다.

```sh
npm install
npm run dev      # 개발 서버
npm run verify   # 글 사이 규칙 검사 (build 전에 자동 실행)
npm run check    # 타입 검사
npm run build    # 정적 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 공식 Astro 액션으로 빌드해 GitHub Pages에 올립니다. 처음 한 번은 저장소 Settings → Pages → Source를 **GitHub Actions**로 바꿔야 합니다.

주소는 `astro.config.mjs`의 `site`, `base`가 정합니다. 저장소 이름이나 도메인이 바뀌면 둘을 함께 고칩니다.

## 구조

```text
src/
├── content/notes/   공개 글 (Markdown)
├── content.config.ts  글 스키마
├── data/planned.yaml  앞으로 쓸 글
├── components/
├── layouts/
├── lib/             그래프 빌더, 사이트 상수
├── pages/
├── scripts/         그래프와 화면 동작
└── styles/
scripts/             빌드 전 콘텐츠 검사
public/
.github/workflows/   GitHub Pages 배포
DESIGN.md            디자인 시스템
AGENTS.md            AI 에이전트 작업 규칙
```

## 원칙

- 하지 않은 일을 했다고 쓰지 않습니다. 설계·구현·검증·공개를 구분합니다.
- 비공개 원고, 회사·고객 정보, 키는 저장소에 올리지 않습니다.
