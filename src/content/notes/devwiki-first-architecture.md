---
uid: hub-devwiki-first-architecture
permalink: devwiki-first-architecture
title: "DevWiki 구축기 2편 — v1: 규칙 문서로 만든 지식창고와, 구현되지 못한 에이전트 메모리"
summary: "번호 폴더와 운영 규칙으로 만든 첫 Obsidian 지식창고, 구현되지 못한 Project·Task·Session 메모리 설계, GitHub Actions와 OpenAI API로 시작한 자동화를 돌아본다."
section: ai-hub
kind: build-log
domains: [ai-llm, devtools]
growth: synapse
publication: published
publishedAt: 2026-11-16
tags: [DevWiki, Agent Memory, Obsidian, GitHub Actions, OpenAI API]
related:
  - uid: hub-devwiki-why
    relation: references
  - uid: hub-devwiki-v2-v3
    relation: related
---

[DevWiki 구축기](../../paths/path-devwiki-build/) 2편 — v1의 두 가지 설계

[1편](../devwiki-why)에서는 DevWiki를 왜 만들었는지 이야기했다. 이번 편은 가장 처음 만든 구조인 v1을 구체적으로 정리한다. v1에는 두 가지 설계가 있었다.

- **문서 쪽 v1:** 번호 폴더로 만든 Obsidian 지식창고와 운영 규칙
- **에이전트 메모리 쪽 v1:** Project → Task → Session으로 기억을 쌓는 설계. 명령은 구현하지 못했다.

이 시기에 처음 시도한 GitHub Actions와 OpenAI API 자동화도 함께 다룬다. 구조를 개편한 v2·v3는 [3편](../devwiki-v2-v3), 로컬 LLM으로 정리를 자동화한 과정은 [5편](../../topics/plan-devwiki-curation-evolution)에서 이어갈 예정이다.

## 출발점은 규칙 문서였다

DevWiki는 처음부터 에이전트 메모리 시스템은 아니었다. 가장 오래된 규칙 문서들의 작성일은 2026년 9월 2일이다. 그때 쓴 최상위 규칙 문서는 다음 문장으로 시작했다.

> 이 문서는 AI 에이전트가 이 Vault(개인 Knowledge OS)에서 작업할 때 따르는 최상위 규칙이다.

개발하면서 알게 된 것과 프로젝트 문서, 경험, 공부 기록을 Obsidian 한 곳에 모으고 AI가 읽고 정리하게 하자는 것이 출발이었다. 에이전트 사이의 메모리 공유는 이 구조가 쌓이는 과정에서 뒤따라온 요구였다.

이 시기에는 코드를 작성하기 전에 `00-System/` 아래에 규칙 문서 열 개 안팎을 썼다. 그 요약은 에이전트가 자동으로 읽는 최상위 파일에 연결했다.

### Vault의 폴더와 운영 문서

```text
Vault/
├── CLAUDE.md          ← Claude Code가 자동으로 읽는 최상위 규칙
├── AGENTS.md          ← Codex 등이 읽는 같은 내용의 규칙
├── 00-System/         운영 규칙 · 템플릿 · AI 정책
├── 01-Inbox/          미분류 메모. 정리 대기
├── 10-Projects/       프로젝트 문서
├── 20-Knowledge/      재사용 가능한 개념·원리 ("왜/무엇")
├── 30-HowTo/          재사용 가능한 절차 ("어떻게")
├── 40-Experiences/    1인칭, 특정 시점의 경험
├── 50-Resources/      계정·인프라 자산·참고 링크
├── 60-Blog/           Drafts/ · Published/
├── 70-Journal/        Daily · Weekly · Monthly. 시점 종속 개인 기록
└── 90-Archive/        비활성 보존
```

폴더 번호에도 의미를 뒀다. `00`~`10`은 운영과 입력, `20`~`50`은 지식의 종류, `70`은 원시 기록, `90`은 보관을 나타냈다.

| 문서·폴더 | 역할 |
|---|---|
| `MOC.md` | 최상위 진입점(Global MOC). 영역별 MOC로 가는 길 |
| `Vault-Guide.md` | Vault 전체 사용법. 분류 원칙의 단일 출처 |
| `Frontmatter-Schema.md` | 공통 메타데이터. `type`, `title`, `created` 필수 |
| `Naming-Convention.md` | 이름 규칙 |
| `Project-Rules.md`, `Project-Creation-Workflow.md` | 프로젝트 폴더 구조와 생성 절차 |
| `Inbox-Rules.md` | Inbox 정리 절차 |
| `Knowledge-Promotion-Rules.md` | 기록을 지식으로 올리는 기준 |
| `Topic-Areas.md` | Knowledge·HowTo·Experience가 공통으로 쓰는 8개 도메인 |
| `AI/Context-Strategy.md` | 에이전트의 Vault 탐색 순서 |
| `Templates/` | 문서 유형별 템플릿 17종 |

템플릿은 ADR, Architecture, Blog, Daily, Experience, HowTo, Implementation, Knowledge, MOC, Meeting, Overview, Project-Context, Reference, Requirement, Status, Troubleshooting, Weekly였다.

### 현재 상태와 과거를 분리한다

프로젝트를 만들면 다음 구조가 기본으로 생겼다.

```text
10-Projects/<Project>/
├── 00-Project/            Project-MOC · Project-Context · Overview · Status
├── 01-Requirements/       요구사항. 바뀌면 새 파일 대신 기존 문서 수정, status로 표시
├── 02-Architecture/       현재 설계만
├── 03-ADR/                중요한 결정. 한 번 쓰면 고치지 않는다
├── 04-Implementation/     기능·모듈 단위 구현 기록
├── 05-Troubleshooting/    장애·버그와 해결 과정 (TS-NNN-제목)
├── 06-Meetings/           회의록
└── 99-History/            지나간 설계·상태. 날짜를 파일명에
```

핵심은 현재 상태(Current State)와 과거(History)를 폴더로 분리하는 것이었다. 에이전트가 오래된 문서를 현재 상태로 오인하지 않도록 각 문서의 역할을 정했다.

| 대상 | 규칙 |
|---|---|
| `Status.md` | 현재 상태만 담고 덮어쓴다. 지나간 상태는 `99-History/`로 이동 |
| ADR | 한 번 기록한 내용은 고치지 않는다. 결정이 뒤집히면 새 ADR을 만들고, 기존 ADR을 `superseded`로 바꿔 서로 연결 |
| `02-Architecture/` | 현재 설계만 둔다. 설계 이유는 본문에 반복하지 않고 ADR 링크로 연결 |

이름과 분류 규칙도 구체적으로 정했다.

- 한국어 사용자가 읽고 찾으므로 폴더 이름은 영어, 문서 제목과 파일명은 한국어를 기본으로 했다.
- 날짜는 ISO 8601의 `YYYY-MM-DD` 형식으로 통일했다.
- ADR은 `NNN-제목`, 트러블슈팅은 `TS-NNN-제목`으로 번호를 붙였다. 폐기한 번호는 재사용하지 않았다.
- Knowledge·HowTo·Experience에는 Backend, Frontend, AI, Microsoft, Job-Search, CS, Coding-Test, Infrastructure의 8개 도메인 폴더를 동일하게 뒀다. 카테고리마다 이름이 다르면 위치를 예측하기 어려웠기 때문이다.
- 여러 도메인에 걸친 문서는 물리적으로 한 곳에만 두고, 나머지는 frontmatter의 `topics`로 표현했다.
- 관계는 폴더 대신 WikiLink로, 소속은 `project`, `source` 같은 메타데이터로 표현했다.

## 에이전트는 필요한 문서만 따라 읽는다

`Context-Strategy`와 최상위 규칙 파일에는 다음 읽기 순서를 적었다.

```text
Global MOC → 영역 MOC(예: Project-MOC) → MOC가 링크한 문서 중 필요한 것만
```

Vault에는 회사 프로젝트와 공부 기록, 일기 등 성격이 다른 문서가 섞여 있었다. 전체를 읽으면 관련 없는 문서가 Context를 오염시키거나 낡은 History를 현재 상태로 오인할 수 있어, **Vault 전체를 스캔하지 않는 것**을 원칙으로 삼았다.

| 상황 | 탐색·판단 기준 |
|---|---|
| 프로젝트 질문 | `Status.md`부터 읽는다 |
| 개념·절차·경험 질문 | 각각 Knowledge·HowTo·Experiences로 이동한다 |
| `70-Journal`을 근거로 답변 | “일기에 따르면”처럼 출처를 밝힌다. 승격되지 않은 원시 기록을 기술적 사실로 쓰지 않는다 |
| AI가 쓴 지식 | `source_type`을 확인하고, 검증되지 않은 것을 사실로 단정하지 않는다 |
| 새 문서 작성 | 비슷한 문서를 먼저 검색해 통합하거나 링크로 연결한다 |

Claude용 `CLAUDE.md`와 Codex용 `AGENTS.md`는 따로 두되, 의미가 같아야 하므로 함께 고친다는 규칙을 적었다. 이 관리 방식은 나중에 규칙이 서로 어긋나는 drift의 원인이 됐다.

### Inbox 정리와 지식 승격

Inbox의 메모는 Project, Knowledge, HowTo, Experience, Reference, Journal, Archive의 일곱 갈래로 분류했다.

1. 비슷한 문서가 있는지 검색한다.
2. 있으면 가능한 한 기존 문서에 통합한다.
3. 새 문서가 필요하면 템플릿을 쓴다.
4. 관련 문서에 WikiLink를 건다.
5. 확실하지 않으면 삭제하지 않고 Review로 남긴다.

지식 승격의 기준은 더 엄격했다. 한 번 나온 내용은 승격하지 않고, 여러 프로젝트·여러 시점에서 반복되며 특수한 맥락을 걷어내도 성립하는 것만 올리기로 했다.

승격은 복사가 아니라 이동이었다. 일반화 가능한 설명은 Knowledge로 옮기고, 원본에는 “원리는 … 참고”라는 링크를 남겼다. Knowledge에서도 원본 사례로 연결했다. 원본에는 실제로 겪은 일과 당시의 판단, 배운 점을 남겼다.

### 폴더만으로 해결되지 않은 것

이 구조는 문서의 성격을 폴더가 결정한다고 가정했다. 문서 하나가 여러 맥락에 걸치면 위치부터 판단해야 했고, 그 판단은 작성할 때마다 달라졌다. 실제 프로젝트 하나에서는 다음과 같은 결과가 남았다.

- 같은 주제의 ADR 네 개
- 프로젝트를 소개하는 파일 네 개
- 내용이 0바이트인 요구사항 파일 하나
- 263줄에 H2가 14개인 ADR 하나

마지막 ADR에는 “위 결정 대체”라는 섹션까지 있었다. 결정을 기록하는 문서 안에서 결정이 뒤집힌 것이다. 다음 에이전트는 위쪽의 낡은 결정과 아래쪽의 새 결정을 모두 읽게 된다.

**폴더는 어디에 쓸지는 정해 주지만, 무엇을 쓸지는 정해 주지 않았다.**

## 에이전트 메모리의 중심은 Task였다

문서 구조와 별개로, [1편에서 다룬 세션 간 맥락 단절](../devwiki-why#세션마다-프로젝트-설명을-다시-한다)을 풀 설계도 만들었다. 이것이 에이전트 메모리의 v1이었다. 아래 구조와 명령은 당시의 설계이며, 아직 구현하지 않은 상태였다.

worktree는 지우거나 다시 만들고, 머지 후 없앨 수 있는 임시 실행 환경이었다. 기억을 거기에 붙이면 함께 사라진다. 그래서 안정적인 기억의 단위를 다음과 같이 잡았다.

```text
Project
└── Task
    ├── Worktree A
    │   ├── Claude Session
    │   └── Codex Session
    └── Worktree B
        └── Claude Session
```

branch와 worktree는 Task가 실행 중인 위치를 알려 주는 메타데이터로 취급했다. **Task ≠ branch ≠ worktree ≠ session**이라는 결정은 지금까지 유지하고 있다.

다음은 번호 폴더 구조와 별도로 마련한 에이전트 메모리의 첫 설계다.

```text
10 Projects/<Project>/
├── index.md · project-state.md      프로젝트 전체 상태 (머지된 사실만)
└── tasks/<task>/
    ├── task.md                      이 작업의 공유 상태 (목표·현재·발견·다음)
    └── sessions/
        ├── 20260911-0900-claude-a13.md
        └── 20260911-1005-codex-b21.md
20 Knowledge/        여러 프로젝트에서 재사용 가능한 지식
30 MOC/              영역별 목차
40 Wiki Queue/       사람이 읽을 글로 쓸 가치가 있는 주제 후보
90 Archive/
```

`task.md`에는 목표·현재 상태·중요한 발견·다음 할 일만 짧게 담도록 했다. 브랜치·worktree·시작 및 머지 커밋은 frontmatter에 적도록 했고, Task 상태는 `active`, `paused`, `merged`, `abandoned`로 정했다.

### 에이전트마다 자기 Session 파일만 쓴다

여러 에이전트가 동시에 작업하는 것을 전제로 충돌 규칙부터 정했다.

- 세션마다 `<시각>-<에이전트>-<id>.md` 파일 하나를 쓴다.
- 에이전트는 자기 Session 파일만 수정한다.
- 새 세션을 시작하면 같은 Task의 다른 활성 세션은 제목·목표·수정 파일·상태만 확인한다. 주제나 수정 파일이 겹칠 때만 본문을 읽는다.

Session 기록은 대화 요약이 아니었다.

```markdown
## Objective      무엇을 하려는가
## Current State  어디까지 왔는가
## Findings       무엇을 발견했는가
## Ruled Out      무엇이 아니라고 확인했는가
## Verified       무엇을 실제로 검증했는가
## Next           다음에 무엇을 하는가
```

가장 마음에 들었던 항목은 `Ruled Out`이었다. 이미 폐기한 방법을 다시 제안하는 문제를 겨냥했다.

```markdown
## Ruled Out
- 저장 실패 아님 — 네트워크에서 정상 저장 확인
- 다른 UI 컨텍스트로 이벤트 전달 — 서로 다른 루트 사이에서는 전달되지 않음
- 페이지 새로고침 — 증상은 해결하지만 근본적인 동기화 해법이 아님
```

최종 해결책만 남기면 다음 에이전트는 왜 다른 방법이 안 되는지 모른다. 폐기한 가설을 함께 남기려 한 이유다.

```text
Git       = 코드의 Source of Truth
Task      = 지금 무엇을 왜 하고 있는가
Session   = 각 에이전트의 작업 상태
Project   = 머지되어 확정된 상태
Knowledge = 여러 프로젝트에서 재사용 가능한 지식
Wiki      = 사람이 읽기 위해 다시 쓴 글
```

구현은 코드 저장소에 있으므로 기억 쪽에 길게 복사하지 않기로 했다. 대신 선택 이유, 시도한 방법, 제약을 남겼다. 복사한 코드는 실제 코드가 바뀌면 낡은 정보가 되기 때문이다.

### 읽기 순서와 지식 후보의 기준

```text
현재 Git 상태 → Task → 최근 Session 0~2개 → 명시적으로 링크된 기억
   → 관련 Knowledge 2~3개 → 오래된 Session → Archive
```

뒤로 갈수록 읽기 비용이 크므로 필요할 때만 내려가도록 했다. Vault 전체, 모든 프로젝트 문서와 Session, 오래된 Task는 기본 읽기 대상에서 제외했다.

기록은 에이전트가 알아서 남기는 대신 세 개의 명령으로 수행하도록 설계했다.

| 명령 | 시점 | 역할 |
|---|---|---|
| `memory-start` | 세션 시작 | 실제 Git 상태 → Project → Task → 관련 최근 Session 0~2개 → 필요한 Knowledge 2~3개만 읽고 시작 |
| `memory-checkpoint` | 긴 세션 중간 | 압축(compaction)이나 재시작에 대비해 현재 상태 기록 |
| `memory-wrap` | 세션 끝 | Git 상태 확인 → Session 최종 갱신 → Task 상태 갱신 → Wiki 후보 판단 |

`memory-wrap`에서 제외할 일도 정했다. 전체 대화 요약, Inbox에 세션 덤프 만들기, 바로 긴 글 쓰기, 프로젝트 상태 자동 승격, 관련 없는 지식 대량 생성은 하지 않도록 했다.

지식 후보를 고르는 질문은 하나였다. **다른 프로젝트에서도 다시 쓸 수 있는가?** 아니라면 Task와 Session에 두고, 맞다면 후보로 올렸다. 먼저 기존 문서를 검색해 `ADD`, `UPDATE`, `MERGE`, `IGNORE` 중 하나로 판단하고, 새 파일보다 기존 문서 수정을 우선했다.

사람이 읽는 Wiki 글은 세션 종료 때 간단히 만드는 대신, 좋은 주제만 Wiki Queue에 모았다가 한 번에 한 주제씩 깊게 쓰기로 했다.

구현 순서는 다음처럼 계획했다.

1. 세션 연속성과 Context 절약: `start` / `checkpoint` / `wrap`
2. Task·Session에서 Project 상태와 Knowledge로 정리: `consolidate`
3. Wiki Queue와 글쓰기

## 첫 자동화: GitHub Actions와 OpenAI API

[1편에서 다룬 정리의 번거로움](../devwiki-why#정리가-귀찮아서-결국-안-한다)에 대한 첫 대응은 GitHub Actions였다. 구조 이전 직전의 스냅샷에 이미 다음 워크플로가 들어 있었다.

```text
.github/workflows/organize-wiki.yml   매일 03:00(KST) + 수동 실행
Scripts/organize-inbox.py             Inbox 정리 스크립트
requirements.txt                      yaml, openai 두 줄
```

저장소를 체크아웃하고 Python을 설치한 뒤, 저장소 secret의 `OPENAI_API_KEY`를 읽어 스크립트를 실행했다. 변경이 있으면 봇 계정으로 커밋하고 푸시했다.

스크립트의 처리 순서는 다음과 같았다.

1. `01-Inbox/`에서 새 메모를 찾는다.
2. Vault 전체 본문 대신 문서 경로와 frontmatter의 `type`, `title`, `project`, `status`만 모아 압축 색인을 만든다.
3. 메모 하나와 색인을 API에 보내 JSON 스키마로 판단을 받는다. 선택지는 기존 문서에 병합, 새로 생성, 보관만, 검토 필요의 네 가지다.
4. 쓰기 위치를 프로젝트·Knowledge·HowTo·Experience·Resources·Journal의 허용 목록으로 제한한다.
5. 처리한 파일의 해시를 상태 파일에 기록해 재처리를 막고, 원본은 `90-Archive/Inbox/`로 옮긴다.

| 유지할 만했던 점 | 문제였던 점 |
|---|---|
| 색인에는 본문 대신 메타데이터만 사용 | 사람 승인 없이 모델 판단대로 이동·커밋·푸시 |
| JSON 스키마로 판단 형식 고정 | 회사 업무 맥락이 섞인 메모까지 Inbox 전체가 외부 API 전송 대상 |
| 파일 해시로 재처리 방지 | — |

메타데이터 색인은 1편에서 말한 작게 읽히는 원칙의 초기 형태였다. 하지만 구조를 이전하면서 대상 폴더와 스크립트가 사라진 뒤에도 워크플로는 남아 매일 실패했다. 한동안 방치하다가 10월 22일에 삭제했다. 삭제 커밋에는 다음 이유를 남겼다.

> 더 이상 존재하지 않는 스크립트를 호출해 매일 실패하고 있었고, Inbox 전체를 OpenAI에 보내 자동 커밋·푸시하는 방식은 로컬 우선·사람 승인 중심의 큐레이션 계획과 반대였다.

이 반성은 이후 정리 자동화의 방향을 로컬 우선과 사람 승인으로 바꾸는 계기가 됐다. 구체적인 과정은 [5편](../../topics/plan-devwiki-curation-evolution)에서 다룰 예정이다.

## 구현하지 못한 설계와 남은 문제

에이전트 메모리의 `memory-*` 명령은 구현하지 못했고, 규칙 문서에 따라 수동으로 운영했다. 설계 문서 첫머리에도 다음 경고를 남겼다.

> 아직 구현하지 않은 memory-start·memory-checkpoint·memory-wrap 구상을 포함한 초안

Session을 파일 단위로 만들면 기록 비용과 판단 부담이 커질 것이라는 걱정은 있었지만, 이때는 검증하지 못했다. 여러 문서에 복사한 규칙도 서로 어긋날 여지가 컸다. 구현된 Inbox 자동화에는 사람 승인 없이 모델이 파일을 이동하고 커밋하는 문제가 있었다.

이 문제들이 실제로 드러난 것은 구조를 이관하고 Task 중심으로 다시 짠 직후였다. 다음 [3편에서는 v2와 v3로 개편한 과정](../devwiki-v2-v3)을 다룬다.

이전 편: [AI 에이전트가 세션마다 맥락을 잃어서 DevWiki를 만들었다](../devwiki-why)
