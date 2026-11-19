---
uid: know-cpp-stream-io
permalink: cpp-stream-io
title: "[C++] 입출력 최적화: sync_with_stdio와 tie"
summary: "C와 C++ 입출력 동기화, cin과 cout의 연결을 구분하고 입출력 최적화 설정의 효과와 사용 조건을 정리한다."
section: knowledge
kind: concept
domains: ["algorithm"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-06T17:11:44+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/5
tags: ["C++", "iostream", "입출력"]
---

코딩 테스트를 풀 때 다음 두 줄을 외워서 사용하는 경우가 많다.

```cpp
ios::sync_with_stdio(false);
cin.tie(nullptr);
```

나 역시 의미를 정확히 모르고 사용하다가 디버깅용 `printf`를 섞어 썼고, 출력이 뒤섞여 한참 헤맨 경험이 있다. 두 설정이 각각 무엇을 끊는지, 왜 빨라지는지, 언제 사용을 피해야 하는지 정리한다.

> C++의 cin / cout은 원래 C의 scanf / printf와 섞어 써도 안전하도록 일부러 느리게 설계되어 있다.
>
> 이 동기화를 끊으면 빨라지지만, **그 순간부터 C와 C++ 입출력을 절대 섞어 쓰면 안 된다.**

## C와 C++ 입출력의 차이

| 구분 | C 입출력 | C++ 입출력 |
|---|---|---|
| 라이브러리 | stdio | iostream |
| 대표 함수·객체 | `scanf`, `printf` | `cin`, `cout` |
| 구조 | C 표준 라이브러리의 단순한 버퍼 | 객체지향적인 스트림 |
| 고려할 점 | C 방식의 입출력 | 타입 안전성 등을 고려해 구조가 복잡하고 기본적으로 느림 |

C++ 입출력이 기본적으로 느린 이유 중 하나는 C 방식과의 호환성이다. 다음 코드의 출력 순서를 보장하려면 두 방식의 동기화가 필요하다.

```cpp
printf("A");
cout << "B";
// 결과: AB (항상 순서가 보장됨)
```

이를 위해 `cout`을 호출할 때 C의 `stdout` 버퍼 상태를 확인하고 동기화를 맞춘다. 반복되는 동기화 작업에는 성능 비용이 든다.

## sync_with_stdio(false): C와 C++의 동기화 해제

`ios::sync_with_stdio(false)`는 C++ iostream과 C stdio의 동기화를 끊는다. `cin`과 `cout`이 C 버퍼를 신경 쓰지 않고 자신의 내부 버퍼를 사용하므로 속도가 개선된다. 대신 **두 스트림 사이의 출력 순서 보장이 사라진다.**

```cpp
ios::sync_with_stdio(false);
printf("A");
cout << "B";
```

이때 `A`는 C 버퍼에, `B`는 C++ 버퍼에 들어간다. 어느 버퍼가 먼저 비워질지 알 수 없어 `AB`나 `BA`가 나올 수 있다. 이는 이른바 Undefined Behavior에 가까운 상황이다.

## cin.tie(nullptr): 입력 전 자동 flush 해제

`tie`는 두 스트림을 연결해 한쪽이 작업하기 전에 다른 쪽을 먼저 비우게 하는 설정이다.

| 설정 | 입력 전 동작 | 영향 |
|---|---|---|
| 기본 상태 `cin.tie(&cout)` | `cout` 버퍼를 먼저 비움 | 입력 안내가 먼저 화면에 나타남 |
| `cin.tie(nullptr)` | `cout`을 자동으로 비우지 않음 | 반복 입출력의 flush 비용을 줄이지만 안내가 입력 뒤에 보일 수 있음 |

```cpp
cout << "이름을 입력하세요: ";
cin >> name; // "이름을..." 문구가 화면에 즉시 나타나도록 보장함
```

온라인 저지에서는 출력 결과를 확인하므로 이러한 최적화를 사용할 수 있다.

## 두 설정의 역할과 사용 조건

```cpp
ios::sync_with_stdio(false); // C/C++ 동기화 제거 -> 속도 대폭 향상
cin.tie(nullptr);            // 불필요한 flush 제거 -> 입력 속도 향상
```

| 사용할 수 있는 경우 | 사용을 피해야 하는 경우 |
|---|---|
| 백준 등 온라인 저지에서 문제를 풀 때 | `printf`, `scanf`, `puts` 등을 섞어 쓸 때 |
| `cin`과 `cout`만 사용할 때 | 디버깅용 `printf`를 추가했을 때 |
| 입출력 양이 많아 시간 초과가 우려될 때 | C 기반 라이브러리와 입출력을 공유할 때 |

특히 디버깅을 위해 `printf`를 추가하면 출력 순서가 섞여 원인을 추적하기 어려워질 수 있다.

## 확인할 질문

1. 기본 `cin`과 `cout`이 `scanf`와 `printf`보다 느리게 설정된 이유는 무엇인가?
2. `sync_with_stdio(false)` 뒤에 `printf`를 사용하면 왜 위험한가?
3. `cin.tie(nullptr)`는 언제 성능 이득을 주는가?
