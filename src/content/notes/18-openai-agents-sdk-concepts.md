---
uid: know-openai-agents-sdk-concepts
permalink: openai-agents-sdk-concepts
title: "OpenAI Agents SDK는 에이전트를 어떻게 실행할까?"
summary: "OpenAI Agents SDK의 Agent, Runner, Tool, Handoff, Guardrail, Tracing, MCP를 공식 문서 기준으로 정리하고, LangGraph·Pydantic AI와 어떤 기준으로 갈리는지 비교한다."
section: knowledge
kind: concept
domains: [ai-llm]
growth: impulse
publication: published
createdAt: 2026-11-18
publishedAt: 2026-11-18
tags: [OpenAI Agents SDK, AI Agent, Tool Calling, Handoff, Guardrail, Tracing, MCP, LangGraph, Pydantic AI]
related:
  - uid: hub-ai-radar-why
    relation: explains
references:
  - title: "OpenAI Agents SDK (Python) 문서"
    url: https://openai.github.io/openai-agents-python/
  - title: "OpenAI Agents SDK — Running agents"
    url: https://openai.github.io/openai-agents-python/running_agents/
  - title: "OpenAI Agents SDK — Tracing"
    url: https://openai.github.io/openai-agents-python/tracing/
  - title: "OpenAI Agents SDK — Model Context Protocol (MCP)"
    url: https://openai.github.io/openai-agents-python/mcp/
  - title: "LangGraph overview"
    url: https://docs.langchain.com/oss/python/langgraph/overview
  - title: "Pydantic AI overview"
    url: https://pydantic.dev/docs/ai/overview/
---

AI Radar의 Discovery Agent를 설계하면서 OpenAI Agents SDK를 처음 알게 됐다. [AI Radar 설계기 1편](../ai-radar-why)에서는 이 SDK로 단일 Discovery Agent를 구현하기로 했지만, 실제로 어떻게 동작하는 도구인지는 정리하지 못했다. 이 글은 구현 전에 공식 문서를 읽고 정리한 학습 기록이다.

이 글의 모든 내용은 공식 문서를 읽고 정리한 것이다. 이 SDK로 직접 구현하거나 실행해 본 결과는 담지 않았다.

## Agents SDK는 무엇인가

공식 문서는 Agents SDK를 “very few abstractions”로 에이전트 앱을 만들 수 있는 가벼운 패키지라고 소개한다. 이전 실험용 프로젝트인 Swarm의 production-ready 버전이라는 설명도 있다. 문서가 꼽는 핵심 요소는 세 가지다.

| 요소 | 문서의 설명 |
|---|---|
| Agent | instructions와 tools를 가진 LLM |
| Agents as tools / Handoffs | 다른 에이전트를 도구로 쓰거나 작업을 넘기는 방식 |
| Guardrails | 입력과 출력을 검증하는 장치 |

여기에 실행 과정을 기록하는 Tracing이 기본으로 포함된다. OpenAI 모델을 쓸 때는 기본적으로 Responses API를 사용한다.

설치 패키지는 `openai-agents`이고, 사용하려면 `OPENAI_API_KEY`가 필요하다. 가장 작은 실행 예시는 다음과 같다.

```python
from agents import Agent, Runner

agent = Agent(name="Assistant", instructions="You are a helpful assistant")
result = Runner.run_sync(agent, "Write a haiku about recursion.")
print(result.final_output)
```

## 에이전트 루프: Runner가 하는 일

에이전트를 정의하는 것은 `Agent`이고, 실제로 돌리는 것은 `Runner`다. Runner는 `run()`(비동기), `run_sync()`, `run_streamed()` 세 가지 방식으로 실행할 수 있다.

Runner는 다음 루프를 반복한다.

1. 현재 에이전트와 입력으로 LLM을 호출한다.
2. 출력을 분류한다.
   - 최종 출력이면 루프를 끝내고 결과를 반환한다.
   - 핸드오프를 요청하면 현재 에이전트와 입력을 바꾸고 루프를 다시 돈다.
   - 도구 호출이 있으면 도구를 실행하고 결과를 붙여 루프를 다시 돈다.
3. `max_turns`를 넘으면 `MaxTurnsExceeded`를 낸다.

문서는 최종 출력을 “원하는 타입의 텍스트 출력이고 도구 호출이 없는 상태”로 정의한다. 즉 모델이 도구를 더 부르지 않고 답을 내놓는 순간 루프가 끝난다. “도구를 부를지, 어떤 도구를 부를지”를 모델이 매 턴 결정한다는 점이 고정된 파이프라인과 다르다.

## 도구: 함수, 호스팅 도구, 다른 에이전트

도구 문서는 Python 함수를 도구로 감싸는 방식을 기본으로 설명한다. 함수 이름이 도구 이름이 되고, docstring이 설명이 되며, 인자 타입에서 입력 스키마가 만들어진다. 동기·비동기 함수를 모두 쓸 수 있고, 인자 검증에 실패하면 `ModelBehaviorError`가 발생한다.

도구는 크게 네 종류로 나뉜다.

| 종류 | 예 |
|---|---|
| 호스팅 도구 | `WebSearchTool`, `FileSearchTool`, `CodeInterpreterTool`, `HostedMCPTool` |
| 로컬 실행 도구 | `ComputerTool`, `ShellTool`, `ApplyPatchTool` |
| 함수 도구 | Python 함수를 감싼 `FunctionTool` |
| 에이전트 도구 | `Agent.as_tool()`로 다른 에이전트를 도구처럼 호출 |

Discovery Agent 설계에서 “필요하면 웹과 GitHub를 추가 검색한다”는 요구는 호스팅 웹 검색 도구와 직접 만든 함수 도구로 나눌 수 있을 것 같다. 다만 어느 쪽이 맞는지는 구현해 보고 판단할 부분이다.

## 핸드오프와 가드레일

**핸드오프**는 에이전트가 대화를 다른 에이전트에게 넘기는 방식이다. 모델에게는 `transfer_to_<에이전트 이름>` 같은 이름의 도구로 보인다. `handoff()`로 넘길 때 `input_filter`, `on_handoff` 같은 옵션을 줄 수 있다.

**가드레일**은 입력과 출력을 검증한다. 문서에서 확인한 동작은 다음과 같다.

- 검증 결과로 `tripwire_triggered`가 켜지면 `InputGuardrailTripwireTriggered` 같은 예외가 난다.
- 입력 가드레일은 기본적으로 에이전트와 병렬로 실행된다. 병렬을 끄면 검사가 끝날 때까지 에이전트가 기다린다.
- 입력 가드레일은 첫 번째 에이전트에만, 출력 가드레일은 마지막 에이전트에만 적용된다.

단일 에이전트로 시작한다면 핸드오프는 당장 필요하지 않다. 가드레일은 에이전트가 잘못된 형식의 결과를 내지 않게 하는 용도로 검토할 만하다.

## 구조화된 출력

`Agent`에 `output_type`을 지정하면 모델이 일반 텍스트 대신 구조화된 출력을 내도록 한다. 문서는 Pydantic 객체가 흔한 선택이라고 설명하며, dataclass나 TypedDict처럼 Pydantic의 `TypeAdapter`로 감쌀 수 있는 타입도 쓸 수 있다.

```python
agent = Agent(
    name="Calendar extractor",
    instructions="Extract calendar events from text",
    output_type=CalendarEvent,  # CalendarEvent는 Pydantic BaseModel
)
```

최종 메시지가 `output_type` 검증에 실패하면 기본적으로 `ModelBehaviorError`가 발생한다. Discovery Agent가 “새로운 흐름인지 판단하고 근거를 반환”해야 한다면, 이 방식으로 판단 결과와 근거를 정해진 필드로 받는 설계를 생각해 볼 수 있다.

## Tracing: 어떤 근거로 판단했는지 보기

Tracing은 LLM 호출, 도구 호출, 핸드오프, 가드레일, 사용자 정의 이벤트를 기록한다. 기록은 trace 하나 아래에 여러 span이 달리는 구조이고, 기본 span으로 `agent_span`, `generation_span`, `function_span`, `guardrail_span`, `handoff_span` 등이 있다.

- 기본 확인 위치는 OpenAI 플랫폼의 Traces 대시보드다.
- 환경변수 `OPENAI_AGENTS_DISABLE_TRACING=1`이나 `set_tracing_disabled(True)`로 끌 수 있다.
- `RunConfig.trace_include_sensitive_data`로 도구 입출력 같은 민감한 데이터를 trace에 남길지 정한다. 문서 기준 기본값은 `True`다.
- `add_trace_processor()`로 다른 곳에 trace를 보낼 수 있다.

기본값이 민감한 데이터를 포함하는 쪽이므로, 개인 정보나 키가 도구 입출력에 섞일 수 있는 서비스라면 이 설정을 먼저 확인해야 한다.

## MCP 연결

MCP 서버는 두 방식으로 연결한다.

- **로컬에서 연결:** `MCPServerStdio`, `MCPServerStreamableHttp` 같은 클래스로 서버에 붙고, `Agent(mcp_servers=[...])`로 넘긴다. 문서는 `MCPServerSse`를 deprecated로 표시한다.
- **호스팅 방식:** `HostedMCPTool`을 `tools`에 넣으면 Responses API가 서버에 연결한다.

AI Radar 설계기에서는 일반적인 API 조회까지 모두 MCP로 구현하지는 않기로 했다. 문서는 MCP 연결과 함수 도구를 모두 지원하므로, 이 구분은 설계 쪽의 선택이다.

## LangGraph, Pydantic AI와 비교

AI Radar 설계기에서 함께 고려한 두 프레임워크를 같은 기준으로 비교했다. 각 프레임워크의 문서에서 확인한 설명만 정리한 표이며, 직접 써 본 비교는 아니다.

| 기준 | OpenAI Agents SDK | LangGraph | Pydantic AI |
|---|---|---|---|
| 핵심 추상화 | Agent, Handoff, Guardrail | 공유 상태·노드·엣지로 이루어진 그래프 | 타입이 있는 Agent와 에이전트 루프 |
| 상태·장시간 작업 | Sessions로 대화 맥락을 유지 | checkpointer로 상태를 저장하고 중단 후 재개 | 지속 실행 엔진 연동(Temporal 등)과 human-in-the-loop 지원 |
| 구조화된 출력 | `output_type` | 읽은 페이지에는 설명 없음 | `output_type`, 출력 모드 세 가지 |
| 모델 선택 | OpenAI 모델이 기본, 다른 제공자도 문서에서 언급 | LangChain 없이도 쓸 수 있고 예시는 LangChain 모델 연동 중심 | 모델 불문(model-agnostic), 여러 제공자 지원 |

LangGraph 문서는 스스로를 “장시간 실행되는 상태 있는 에이전트를 위한 저수준 오케스트레이션 프레임워크”로 소개한다. 상태 관리와 중단·재개가 핵심이다. Pydantic AI는 타입 검증을 중심에 두고, Agents SDK는 문서가 “very few abstractions”를 내세우는 쪽이다.

그래서 AI Radar 설계기의 판단은 문서의 설명과 맞는다. 에이전트 하나가 도구를 호출해 판단을 내놓는 구조에서는 Agents SDK의 작은 추상화로 충분해 보이고, 상태 기반 분기나 중단·재개가 필요해지면 LangGraph를 다시 검토할 이유가 생긴다. 다만 이것은 문서를 읽고 내린 판단이며 실제 구현으로 확인한 것은 아니다.

## 확인하지 못한 것

- 필요한 최소 Python 버전은 읽은 페이지에서 찾지 못했다.
- `max_turns` 기본값은 읽은 페이지에서 찾지 못했다.
- 문서의 도구 데코레이터 표기가 페이지마다 다르게 보였다. 실제 코드를 쓸 때는 설치한 버전의 문서와 코드를 확인해야 한다.
- 비OpenAI 모델 지원 범위와 LangGraph의 구조화된 출력은 해당 페이지를 읽지 못해 정리하지 않았다.
- 예제 코드는 직접 실행하지 않았다.
