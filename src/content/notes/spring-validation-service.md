---
uid: exp-spring-validation-service
permalink: spring-validation-service
title: "[Spring Boot] 검증 로직의 위치: 테스트로 드러난 설계 문제"
summary: "흩어진 검증과 Mock 테스트의 한계를 코드리뷰에서 발견하고 Service 단일 검증 전략과 테스트 책임을 정리한 경험을 기록한다."
section: experience
kind: troubleshooting
domains: ["backend"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-14T23:36:16+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/10
tags: ["Spring Boot", "Validation", "테스트", "코드리뷰"]
environment: "Spring Boot, Bean Validation, Mock 기반 테스트"
outcome: resolved
---

API 기능을 구현한 뒤 테스트를 작성하면서, 이미 검증했다고 생각한 요청에서 예상하지 못한 에러를 마주했다. 검증 로직이 흩어진 문제와 Mock 기반 테스트가 주는 안정감을 돌아보고, Service 레이어로 검증을 통일한 과정을 기록한다.

무엇보다 문제가 어떻게 드러났고, 왜 혼자서는 끝까지 발견하지 못했는지를 정리하려고 한다.

## 테스트를 작성하며 드러난 문제

기능 구현을 마쳤을 때는 요구사항, 예외 처리, 공통 응답 포맷을 모두 반영했고 테스트 작성만 남았다고 생각했다. 하지만 Controller와 Service 테스트를 하나씩 작성하면서 이상한 상황이 이어졌다.

| 과정 | 했던 일·발견한 점 |
|---|---|
| 테스트 실패에 대응 | “@Valid가 있어야 하나?”, “DTO에 @NotNull을 붙이면 통과하네”라고 생각하며 결과에 맞춰 코드를 수정 |
| 검증 분산 | DTO, Controller, Service에 검증이 흩어져 왜 그 위치에 있는지 설명하기 어려워짐 |
| 리팩토링 | 공통 응답 포맷 도입, CustomException 중심의 예외 정리, Service로 검증을 모으려 함 |
| 남은 문제 | DTO의 `@NotNull`, Controller의 `@Valid`, Swagger와 실제 검증의 불일치, 테스트는 통과하지만 위험한 실제 흐름 |

리팩토링으로 검증을 모았다고 생각했지만 놓친 부분이 있었다. 코드리뷰에서 다음 질문을 받으며 기준이 없었다는 점이 드러났다.

- “이 API는 어디에서 검증하는 게 기준인가요?”
- “왜 어떤 에러는 Spring 기본 에러고, 어떤 건 CustomException인가요?”
- “이 테스트는 실제 검증을 보장하나요, 아니면 Mock이 대신 던져주나요?”

> 문제는 ‘검증 방식’이 아니라  
> 검증에 대한 ‘기준’이 없었다는 것

## 선언적 검증과 Service 검증의 혼용

| 기준 | @Valid·Bean Validation | Service 내부 명시적 검증 |
|---|---|---|
| 방식 | DTO에 `@NotNull`, `@NotBlank` 등을 선언하고 컨트롤러 진입 시 Spring이 검증 | 조건을 직접 검사하고 예외 발생 |
| 실패 처리 | `MethodArgumentNotValidException` | `CustomException`과 `ErrorCode` |
| 장점 | 코드가 간결하고 단순 필수값 검증에 적합 | 비즈니스 규칙 표현, 명확한 에러 코드, 공통 응답 포맷과의 일관성 |
| 당시 고려한 한계 | 날짜 비교·상태 조합 같은 규칙 표현과 커스텀 ErrorCode 관리가 어려움 | — |

Service 내부의 검증은 다음 형태다.

```text
if (요청값이 null이거나 조건을 위반하면) {
    throw new CustomException(ErrorCode.XXX);
}
```

당시 문제는 API별로 두 방식을 기준 없이 섞었다는 점이었다. 어떤 요청은 Spring 기본 에러, 다른 요청은 CustomException으로 처리돼 응답 형식이 달라졌고, 클라이언트가 에러를 예측하기 어려워졌다.

## Mock 테스트가 보장하지 못한 것

> “이 테스트는 실제로는 아무것도 보장하지 않는다.”

Controller 테스트에서 다음처럼 설정하면 실제 Service의 검증 유무와 관계없이 예외를 기대하는 테스트가 통과한다.

```java
given(service.method()).willThrow(CustomException);
```

Service 검증을 실수로 삭제해도 Mock이 예외를 던지기 때문에 테스트가 실패하지 않는다. 검증 로직은 Service 테스트에서 직접 확인하고, Controller 테스트와 책임을 나눌 필요가 있었다.

| 테스트 | 확인할 책임 |
|---|---|
| Controller Test | 인증 여부, URL 매핑, 응답 코드·포맷 |
| Service Test | null 처리, 날짜 비교, 경계값, 비즈니스 규칙 |

### 테스트 오염과 에러 코드

보안 정보는 ThreadLocal에 저장된다. 테스트가 끝난 뒤 SecurityContext를 정리하지 않으면 A 테스트의 로그인 정보가 B 테스트에 남아, 실패해야 할 테스트가 성공할 수 있다. 테스트 종료 시 보안 컨텍스트를 초기화해야 한다.

에러 메시지는 바뀔 수 있으므로 “존재하지 않는 리소스입니다”라는 문구보다 `ERROR_CODE.RESOURCE_NOT_FOUND` 같은 **에러 코드를 기준으로 검증**하기로 했다.

## 실제로 발생한 모순

| 사례 | 충돌한 조건 | 대응·문제점 |
|---|---|---|
| 부분 수정 API에서 필수값 강제 | DTO의 `@NotNull`과 Service의 “값이 있으면 수정” | PATCH답게 동작하지 않음. DTO에서 nullable을 허용하고 Service는 들어온 값만 검증 |
| DB는 NOT NULL인데 Service 검증 누락 | 요청은 null을 허용하지만 DB는 허용하지 않음 | DB까지 내려간 뒤 예외가 발생해 원인 추적이 어려워짐 |

## 최종 선택: Service 단일 검증 전략

이번 프로젝트에서는 모든 검증을 Service에서 수행하기로 했다. 에러를 CustomException과 ErrorCode로 일관되게 관리하고, Swagger 문서와 실제 로직을 맞추며 테스트 책임을 명확히 하기 위한 선택이었다.

각 요소의 역할은 다음과 같이 구분했다.

| 요소 | 역할 |
|---|---|
| Swagger | 문서·안내 |
| `@Valid` | 입구 검증 |
| Service 검증 | 비즈니스 판단 |
| DB 제약 | 최후의 방어선 |

수정 방향은 다음과 같다.

| 영역 | 수정 기준 |
|---|---|
| 검증 | `@Valid`, Bean Validation을 제거하고 DTO는 표현만 담당. 모든 검증은 Service에서 수행 |
| Swagger | 실제 필수값만 명시하고 문서의 required와 로직을 일치 |
| Controller Test | 응답 코드 중심 |
| Service Test | null·경계값·비즈니스 규칙 중심 |

## 문제를 놓친 이유

| 원인 | 당시 상황과 영향 |
|---|---|
| 테스트를 늦게 작성 | 기능이 거의 완성된 뒤 몰아서 작성. 실패 원인을 이해하기보다 빨리 통과시키는 방향으로 수정 |
| AI로 테스트를 빠르게 생성 | 실제 로직을 검증하는지, Mock이 만든 안정감인지 판단하지 못하면 테스트가 로직을 끌고 가게 됨 |
| 하나의 브랜치·PR을 오래 사용 | 3주 넘게 같은 브랜치에서 다른 기능까지 수정해 코드가 바뀐 이유를 추적하기 어려웠음 |
| 판단 기록 부재 | 왜 `@Valid`를 넣었는지, 왜 그 위치에서 검증하는지, 어떤 문제가 있었는지 기록하지 않음 |

AI가 생성한 테스트라도 실제 로직을 검증하는지 판단하는 것은 개발자의 몫이다. 커밋 히스토리가 있어도 의사결정의 맥락까지 남는 것은 아니었다.

이번 리팩토링으로 테스트를 대하는 태도, 코드리뷰의 의미, AI 사용 방식과 개발 기록의 중요성을 다시 생각하게 됐다. 다음에는 기능을 모두 만든 뒤 테스트하기보다, 테스트를 작성하면서 설계를 점검하는 흐름으로 개발하려고 한다.
