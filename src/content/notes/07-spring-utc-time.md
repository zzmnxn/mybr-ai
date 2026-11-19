---
uid: exp-spring-utc-time
permalink: spring-utc-time
title: "[Spring Boot] 날짜와 시간 처리를 UTC로 표준화하기"
summary: "여행 기록 서비스에서 서버 시간대에 의존하던 문제를 발견하고 DB 설정, 엔티티와 DTO의 시간 처리 책임을 UTC 기준으로 정리한 과정을 기록한다."
section: experience
kind: troubleshooting
domains: ["backend", "database"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-10T22:06:30+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/6
tags: ["Spring Boot", "UTC", "시간대"]
environment: "Java, MySQL, Spring Boot 여행 기록 서비스"
outcome: resolved
---

여행 기록 서비스의 테스트 코드를 작성하다가 시간 설정 방식의 허점을 발견했다. 주요 사용자는 한국인이지만, 서비스가 다루는 것은 해외여행 기록이다. 사용자가 다른 시간대로 이동하면 한국 시간만을 기준으로 한 코드에 문제가 생길 수 있었다.

## 기존 시간 처리의 문제

기존 코드는 `Asia/Seoul` 시간대를 기준으로 동작했다.

| 위치 | 기존 방식 | 문제 |
|---|---|---|
| `Trip` 엔티티 | `LocalDate` 사용 | 서버 날짜와 사용자 현지 날짜가 다를 수 있음 |
| `Diary` 엔티티 | `LocalDateTime` 사용 | 타임존 정보가 없어 서울의 10시인지 뉴욕의 10시인지 구분할 수 없음 |
| `@PrePersist` 기본값 | `LocalDate.now()`, `LocalDateTime.now()` | 서버의 시스템 시간을 따름 |
| DB 연결 | `serverTimezone=Asia/Seoul` | 특정 국가의 시간대에 종속됨 |
| API 요청 | `Z(UTC)` 형식을 예시로 사용 | `LocalDateTime`으로 파싱하면 시간대 정보가 유실될 위험이 있음 |

```java
// Trip.java & Diary.java의 기존 로직
this.startDate = LocalDate.now(); 
this.createdAt = LocalDateTime.now();
```

예를 들어 서버가 한국에 있고 사용자가 뉴욕에 있다면, 시차가 -14시간인 상황에서 사용자가 현지 1월 1일 밤에 여행을 생성해도 서버에는 1월 2일로 기록될 수 있었다.

## 백엔드와 프론트엔드의 책임

프론트엔드에서 위치 처리를 담당하기로 한 상태라, 자동 생성되는 시간을 어느 쪽이 담당할지 모호했다. 관련 내용을 찾아보며 다음 원칙을 기준으로 삼았다.

> 바로 **"Backend is Absolute(UTC), Frontend is Relative(Local)"**

| 담당 | 시간 처리 책임 |
|---|---|
| 백엔드 | 절대적인 기준점인 UTC로 시간을 생성하고 저장 |
| 프론트엔드 | 서버가 전달한 UTC 시간을 사용자 기기 설정에 맞는 로컬 시간으로 표시 |

백엔드가 기준을 만들고 프론트엔드가 해석해 보여주는 방식으로 책임을 나눴다.

## UTC 표준화를 선택한 이유

아직 데이터베이스 마이그레이션 적용 전이라 저장 형식을 바꾸기 어렵지 않았다. 이번 리팩토링에서는 다음 이점을 기대했다.

| 기대한 이점 | 이유 |
|---|---|
| 글로벌 정합성 | 사용자가 어디에 있든 절대적인 UTC 기준으로 기록 |
| 유지보수 용이성 | 서버를 해외 리전으로 옮겨도 시간 처리 코드를 바꿀 필요가 없도록 구성 |
| 데이터 신뢰성 | 기록 생성 시각을 백엔드로 통일해 클라이언트의 임의적인 시간 조작을 차단 |

## 설정과 코드 변경

### DB 연결 설정

`application.yml`의 시간대 설정을 한국 시간에서 UTC로 변경했다.

```yaml
# Before
url: jdbc:mysql://<db-host>/<database>?serverTimezone=Asia/Seoul

# After
url: jdbc:mysql://<db-host>/<database>?serverTimezone=UTC
```

### Diary 엔티티

`LocalDateTime`을 시차 정보를 담을 수 있는 `OffsetDateTime`으로 교체했다. 생성 시각은 서버에서 UTC로 기록했다.

```java
// Example entity logic
@PrePersist
protected void onCreate() {
    // Store server-side absolute time (UTC)
    this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
}
```

### CreateDiaryRequest DTO

프론트엔드에서 시간을 받던 `dateTime` 필드를 삭제했다. 시간을 생성하는 책임을 서버로 옮겨 혼선을 줄였다.

```java
// [Before]
// private String dateTime; // 프론트에서 보내주던 필드

// [After]
// 해당 필드 삭제! 
// "시간은 서버가 알아서 할 테니, 프론트는 데이터에만 집중하세요."
```

## 작업을 통해 정리한 기준

처음에는 프론트엔드와 백엔드 중 누가 시간을 담당할지 헷갈렸다. 백엔드는 UTC라는 절대적 기준을 만들고, 프론트엔드는 사용자에게 맞는 로컬 시간으로 보여준다는 원칙을 세우며 역할을 정리할 수 있었다.

이번 작업은 단순히 `now()`를 호출하는 습관에서 벗어나 데이터 생성 시점과 타임존의 의미를 다시 생각하는 계기가 됐다. 테스트 코드를 작성한 덕분에 운영 환경에서 문제가 될 수 있었던 부분을 미리 발견한 것 같았다.
