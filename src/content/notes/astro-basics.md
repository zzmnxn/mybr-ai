---
uid: know-astro-basics
permalink: astro-basics
title: "Astro는 어떻게 JavaScript 없이 페이지를 보여줄까?"
summary: "Astro의 SSG 렌더링 방식과 Islands Architecture, Hydration, Content Collections의 동작 원리를 살펴본다."
section: knowledge
kind: concept
domains: [frontend]
growth: synapse
publication: published
createdAt: 2026-11-10
publishedAt: 2026-11-10
tags: [Astro, SSG, CSR, SSR, Islands Architecture, Hydration, Content Collections]
---

[mybr.ai를 구축](../why-my-digital-brain)하면서 처음 사용해 본 프레임워크가 Astro다.

처음에는 Markdown 기반 블로그를 만들기 편한 프레임워크 정도로 생각했다. 그런데 공식 문서를 살펴보다 흥미로운 설명을 발견했다.

> Zero JavaScript by default.

JavaScript 기반 프레임워크인데 브라우저에 JavaScript를 기본적으로 보내지 않는다니? React도 결국 HTML을 만들어 화면에 보여주는데, 어떤 차이가 있는지 궁금했다.

## 1. 핵심은 HTML을 언제 만드는가

Astro의 기본 렌더링 방식을 이해하려면 **CSR(Client-Side Rendering)** 과 **SSG(Static Site Generation)**를 비교해 보면 된다.

### CSR vs SSG

일반적인 React SPA와 Astro 정적 사이트를 기준으로 비교했다.

| React SPA — CSR | Astro — SSG |
|---|---|
| 사용자 접속 | 개발자가 빌드 실행 |
| ↓ | ↓ |
| 기본 HTML + JS 전달 | 페이지별 HTML 생성 |
| ↓ | ↓ |
| 브라우저에서 JS 실행 | 정적 호스팅에 저장 |
| ↓ | ↓ |
| 컴포넌트 렌더링 | 사용자 접속 |
| ↓ | ↓ |
| DOM 구성 후 표시 | 완성된 HTML 전달 |

CSR에서는 최초 HTML이 다음과 같이 비어 있을 수 있다.

```html
<div id="root"></div>
<script src="/assets/main.js"></script>
```

브라우저에서 React 코드를 실행해야 실제 글 내용이 화면에 나타난다.

반면 Astro에서는 다음 컴포넌트를 작성하면,

```astro
---
const title = "Astro의 렌더링 구조";
---

<article>
  <h1>{title}</h1>
  <p>SSG와 Islands Architecture</p>
</article>
```

빌드 과정에서 다음과 같은 HTML이 생성된다.

```html
<article>
  <h1>Astro의 렌더링 구조</h1>
  <p>SSG와 Islands Architecture</p>
</article>
```

즉, JavaScript를 사용하지 않는다는 건 **개발할 때 JavaScript를 쓰지 않는다는 뜻이 아니다.**

페이지를 구성하는 JavaScript를 빌드 환경에서 실행하고, 그 결과인 HTML을 브라우저에 전달한다는 의미다.

이렇게 하면 브라우저는 해당 콘텐츠를 구성하기 위한 JavaScript를 다시 실행할 필요가 없다.

물론 React도 Next.js 등의 프레임워크를 활용하면 SSG와 SSR을 지원한다. React 자체의 한계가 아니라 기본적인 렌더링 구성의 차이다.

### SSG와 SSR은 또 무엇이 다를까?

| | CSR | SSG | SSR |
|---|---|---|---|
| HTML 생성 | 브라우저에서 | 빌드 시점에 | 요청 시점에 |
| 실행 위치 | Client | Build Environment | Server |
| 사용자별 동적 HTML | JS로 구성 가능 | 빌드 결과는 동일 | 요청별 생성 가능 |
| 적합한 사례 | SPA, 대시보드 | 블로그, 기술 문서 | 개인화 페이지 |

Astro는 기본적으로 정적 사이트 생성에 적합하지만, SSR도 지원한다.

mybr.ai의 공개 문서는 방문자마다 내용이 달라질 필요가 없으므로 SSG가 적합했다.

## 2. `.astro` 컴포넌트의 실행 구조

Astro 컴포넌트는 크게 두 영역으로 나뉜다.

```astro
---
// Component Script
const posts = ["React", "Astro", "Spring Boot"];
---

<!-- Component Template -->
<ul>
  {posts.map((post) => (
    <li>{post}</li>
  ))}
</ul>
```

| 영역 | 역할 | 정적 빌드에서 실행되는 곳 |
|---|---|---|
| Component Script | 데이터 조회, 변수 정의, 로직 처리 | 빌드 환경 |
| Component Template | HTML 구조 정의 | 빌드 과정에서 HTML로 변환 |

위 코드의 `map()`은 브라우저가 아니라 빌드 과정에서 실행된다.

최종 HTML은 다음과 같다.

```html
<ul>
  <li>React</li>
  <li>Astro</li>
  <li>Spring Boot</li>
</ul>
```

따라서 정적인 목록을 보여주기 위해 브라우저가 `map()`을 다시 실행할 필요는 없다.

다만 `<script>` 태그로 작성한 클라이언트 코드나 인터랙티브 컴포넌트는 별도로 브라우저에서 실행할 수 있다.

## 3. Islands Architecture — 필요한 곳에만 JavaScript

그렇다면 클릭이나 확대·축소처럼 동적인 기능은 어떻게 구현할까?

Astro는 **Islands Architecture**라는 접근 방식을 사용한다.

페이지 대부분은 정적 HTML로 유지하고, 상호작용이 필요한 컴포넌트만 JavaScript로 활성화하는 구조다.

### mybr.ai에 대입하면

```text
┌──────────────────────────────────────┐
│ Header                    Static HTML│
├──────────────────────────────────────┤
│                                      │
│ 기술 문서 제목                        │
│ Markdown 본문                        │
│ 관련 문서 목록             Static HTML│
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Neural Map                       │ │
│ │                                  │ │
│ │   ● ─── ●                        │ │
│ │    ╲   ╱                         │ │
│ │      ● ─── ●                     │ │
│ │                                  │ │
│ │ 클릭 / 확대 / 축소                │ │
│ │ Interactive Island               │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Footer                    Static HTML│
└──────────────────────────────────────┘
```

Neural Map처럼 동적인 UI에는 JavaScript가 필요하지만, 글 본문까지 JavaScript로 다시 구성할 이유는 없다.

Astro에서는 React나 Vue 컴포넌트를 가져와 필요한 부분에만 사용할 수 있다.

```astro
---
import NeuralMap from "../components/NeuralMap.jsx";
---

<h1>My Digital Brain</h1>

<NeuralMap client:load />
```

위 코드는 React 통합이 설정되어 있다는 전제의 예시다. 실제 Neural Map 구현과는 무관하다.

`client:load`가 붙은 컴포넌트는 브라우저에서 JavaScript를 불러와 상호작용 기능을 활성화한다.

### Hydration이란?

서버나 빌드 시점에 만들어진 HTML에 JavaScript를 연결해 **이벤트 처리와 상태 관리를 활성화하는 과정**이다.

```text
HTML 생성 → 브라우저에 표시 → JS 로드 → Hydration → 상호작용
```

예를 들어 버튼이 HTML로 표시되어 있어도 React의 `onClick` 이벤트가 동작하려면 Hydration이 필요하다.

Astro에서는 컴포넌트마다 활성화 시점을 지정할 수 있다.

| 지시어 | 동작 |
|---|---|
| `client:load` | 페이지 로드 시 활성화 |
| `client:idle` | 브라우저가 유휴 상태일 때 활성화 |
| `client:visible` | 화면에 보일 때 활성화 |
| `client:media` | 미디어 쿼리 조건을 충족할 때 활성화 |
| `client:only` | 서버 렌더링 없이 브라우저에서 렌더링 |

예를 들어 페이지 아래에 있는 그래프는 `client:visible`을 고려할 수 있다.

단, **Islands Architecture가 반드시 React를 필요로 하는 것은 아니다.** 일반 JavaScript나 Astro의 클라이언트 스크립트로도 동적인 기능을 만들 수 있다.

## 4. Content Collections — Markdown을 데이터처럼 관리하기

mybr.ai에서는 하나의 글에 제목과 본문 외에도 여러 메타데이터가 존재한다.

```yaml
---
uid: know-astro-basics
title: "Astro의 렌더링 구조"
section: knowledge
kind: concept
growth: synapse
tags: [Astro, SSG, Hydration]
---
```

여기서 중요한 건 Markdown을 단순한 텍스트 파일이 아니라 **일정한 구조를 가진 콘텐츠 데이터**로 관리한다는 점이다.

Astro의 Content Collections는 크게 세 부분으로 구성된다.

```text
Markdown 파일
      │
      ▼
┌───────────────────────────────┐
│ Content Collections           │
│                               │
│ Loader   → 콘텐츠 읽기        │
│ Schema   → 메타데이터 검증     │
│ API      → 콘텐츠 조회        │
└───────────────────────────────┘
      │
      ▼
글 목록 / 상세 페이지 / 분류별 페이지
```

### Zod로 메타데이터 검증하기

Astro의 Content Collections에서는 Zod로 스키마를 정의할 수 있다.

```typescript
// src/content.config.ts

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({
    base: "./src/content/posts",
    pattern: "**/*.md",
  }),

  schema: z.object({
    title: z.string(),
    section: z.enum([
      "knowledge",
      "experience",
      "ai-hub",
    ]),
    tags: z.array(z.string()),
  }),
});

export const collections = { posts };
```

예를 들어 `section: random`이라는 값이 들어오면 스키마 검증에서 오류를 발견할 수 있다.

문서가 많아지고 AI로 콘텐츠를 생성하거나 이관하게 되면, 이런 검증이 특히 중요해진다.

### 데이터 조회와 페이지 생성은 별개

등록된 문서는 다음과 같이 조회할 수 있다.

```typescript
import { getCollection } from "astro:content";

const posts = await getCollection("posts");

const knowledge = posts.filter(
  (post) => post.data.section === "knowledge"
);
```

다만 Collection에 Markdown 파일을 등록했다고 자동으로 모든 문서에 URL이 생기는 것은 아니다.

Astro의 파일 기반 라우팅과 `getStaticPaths()` 등을 이용해 문서별 경로를 생성해야 한다.

| 기능 | 역할 |
|---|---|
| Content Collections | 콘텐츠 로딩, 검증, 조회 |
| File-based Routing | URL과 페이지 연결 |
| `getStaticPaths()` | 동적 경로를 정적으로 생성 |
| `render()` | Markdown 본문 렌더링 |

이 기능을 조합하면 Markdown 문서로부터 글 목록과 상세 페이지를 생성할 수 있다.

## 5. 실제 사이트에서는 무엇을 주의해야 할까?

Astro를 사용한다고 모든 문제가 해결되지는 않는다.

| 고려사항 | 이유 |
|---|---|
| 정적 페이지 수정 | 변경 사항을 반영하려면 재빌드·재배포 필요 |
| `window`, `localStorage` | 브라우저 API이므로 실행 환경 구분 필요 |
| 큰 JS 라이브러리 | Island로 분리해도 다운로드 및 실행 비용 발생 |
| 문서 간 관계 | Content Collections가 그래프를 자동 생성하지는 않음 |
| 클라이언트 상태 | 새로고침 이후 상태 유지에는 별도 저장 방식 필요 |

특히 mybr.ai의 Neural Map처럼 문서 관계를 시각화하는 기능은 Astro만으로 완성되는 것이 아니다.

문서의 ID와 링크를 분석해 노드와 엣지를 만들고, 그 데이터를 시각화하는 과정은 별도로 설계해야 한다.

Astro는 이러한 데이터를 바탕으로 웹페이지를 생성하고 필요한 인터랙션을 구성하는 기반 역할을 한다.

## 정리

Astro를 처음 접하면서 가장 흥미로웠던 건 **JavaScript를 사용하는 것과 브라우저에서 JavaScript를 실행하는 것이 다르다**는 점이었다.

Astro에서는 빌드 시점에 JavaScript를 이용해 HTML을 생성할 수 있고, 브라우저에서는 필요한 부분에만 JavaScript를 실행하도록 구성할 수 있다.

Content Collections로 Markdown 문서를 구조화하고, Islands Architecture로 인터랙티브 기능을 분리하는 방식도 mybr.ai의 구조와 잘 맞았다.

앞으로는 실제 빌드 결과에서 JavaScript가 얼마나 생성되는지, Neural Map의 로딩 방식이 성능에 어떤 영향을 주는지 직접 확인해 보고 싶다.

## References

- [Astro — Why Astro?](https://docs.astro.build/en/concepts/why-astro/)
- [Astro — Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro — Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro — Template Directives](https://docs.astro.build/en/reference/directives-reference/)
- [Astro — Routing](https://docs.astro.build/en/guides/routing/)

## Related

- [블로그를 하나의 뇌처럼 만들기로 했다](../why-my-digital-brain)
