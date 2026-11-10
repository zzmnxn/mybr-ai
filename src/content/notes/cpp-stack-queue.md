---
uid: know-cpp-stack-queue
permalink: cpp-stack-queue
title: "[C++] Stack과 Queue의 이해"
summary: "Stack·Queue·Deque의 처리 순서와 활용, 빈 컨테이너 접근, 모노톤 스택과 BFS, 자주 사용하는 함수를 정리한다."
section: knowledge
kind: concept
domains: ["algorithm"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-11T18:01:29+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/9
tags: ["C++", "STL", "stack", "queue", "deque"]
---

Stack과 Queue를 선택할 때 중요한 것은 저장 위치보다 처리 순서다. 되돌리기가 필요한지, 먼저 들어온 작업부터 처리해야 하는지에 따라 맞는 자료구조가 달라진다.

## 컨테이너 어댑터

C++ STL의 `stack`과 `queue`는 내부적으로 다음 컨테이너를 사용한다.

```text
stack  → 내부적으로 deque 사용
queue  → 내부적으로 deque 사용
```

> Stack과 Queue는 새로운 자료구조가 아니라
>
> **기존 컨테이너(deque)를 특정 규칙으로 제한한 인터페이스**다.

이를 Container Adapter라고 한다. 허용되는 기능을 제한하면 코드가 문제의 처리 흐름을 드러내기 쉬워진다.

| 구조 | 허용되는 연산 |
|---|---|
| `stack` | `push`, `pop`, `top` |
| `queue` | `push`, `pop`, `front`, `back` |
| `deque` | 양쪽 삽입·삭제와 인덱스 접근 |

## LIFO와 FIFO의 차이

### Stack: 가장 최근의 상태부터 되돌리기

Stack은 LIFO 방식이다.

> 가장 최근의 상태를 가장 먼저 되돌린다

| 유형 | 사용하는 이유 |
|---|---|
| 괄호 검사 | 마지막에 열린 괄호부터 닫음 |
| 문자열 뒤집기 | push → pop으로 역순 처리 |
| 브라우저 뒤로가기 | 가장 최근 페이지부터 이동 |
| Ctrl+Z | 가장 최근 편집부터 취소 |

“이전으로 돌아간다”, “가장 최근의 상태”, “현재 값이 이전 값들을 무효화한다” 같은 조건에서는 Stack을 떠올릴 수 있다.

### Queue: 먼저 들어온 것부터 처리하기

Queue는 FIFO 방식이다.

> 먼저 들어온 것을 먼저 처리한다

| 상황 | 사용하는 이유 |
|---|---|
| BFS | 가까운 노드부터 탐색 |
| 최단 거리 | 먼저 도착한 경로가 더 짧음 |
| 시뮬레이션 | 먼저 요청된 작업부터 처리 |

“순서대로”, “먼저 들어온 것부터”, “가장 빠른 시간”이라는 조건에서는 Queue를 고려한다.

## 빈 컨테이너 접근

실전에서 자주 발생하는 실수는 비어 있는 컨테이너에 접근하는 것이다.

```cpp
s.top();
q.front();
```

비어 있는 상태에서 접근하면 프로그램이 즉시 종료될 수 있으므로, 먼저 비어 있는지 확인해야 한다.

```cpp
while (!s.empty() && s.top() != target) {
    s.pop();
}
```

다음처럼 원소를 제거한 뒤 바로 접근하는 것도 주의해야 한다.

```cpp
s.pop();
process(s.top());   // ❌ s가 비었을 수도 있음
```

## 모노톤 스택

Monotonic Stack은 현재 값이 이전 값을 무효화하는 성질을 이용해 최적화한다.

> “나보다 큰 값이 처음 등장하는 위치”

오큰수, 주식 가격, 히스토그램이 대표적인 활용 문제다.

```cpp
while (!st.empty() && st.top() < x)
    st.pop();
st.push(x);
```

> 현재 값이 이전 값들을 무효화 → Undo

각 원소는 한 번 push되고 한 번 pop되므로 전체가 O(N)이다. 브루트포스 O(N²)을 O(N)으로 바꾸는 데 사용하는 방식이다.

## Queue와 BFS

BFS는 Queue를 이용한다.

```text
queue.push(start);

while (!queue.empty()) {
    cur = queue.front(); queue.pop();
    for (next : neighbors)
        queue.push(next);
}
```

> 먼저 도착한 경로가 항상 더 짧기 때문

이 성질을 활용해 미로, 최단 거리, 전염·확산처럼 퍼져 나가는 탐색을 처리한다.

## Deque와 vector의 사용 기준

`deque`는 앞·뒤 삽입이 O(1)이고 인덱스 접근도 가능하다. Stack과 Queue의 역할을 함께 다룰 수 있어 슬라이딩 윈도우나 구간 최대·최소 문제에서 중요하다.

반면 `vector.erase(v.begin())`는 O(N), `queue.pop()`은 O(1)이다. 시뮬레이션이나 BFS에서 앞 원소를 반복 삭제하는 용도로 `vector`를 사용하면 시간 초과로 이어질 수 있다.

## 자주 사용하는 함수

| 용도 | Stack | Queue | Deque |
|---|---|---|---|
| 삽입 | `st.push(x)` | `q.push(x)`: 뒤 삽입 | `push_front`, `push_back`: 양쪽 삽입 |
| 제거 | `st.pop()` | `q.pop()`: 앞 제거 | `pop_front`, `pop_back`: 양쪽 제거 |
| 값 확인 | `st.top()`: 맨 위 | `q.front()`, `q.back()`: 앞·뒤 | `front()`, `back()`: 앞·뒤 |
| 비었는지 확인 | `st.empty()` | `q.empty()` | — |
| 개수 확인 | `st.size()` | `q.size()` | — |

## 문제에 따른 선택

| 조건 | 선택 |
|---|---|
| 되돌리기, 짝 맞추기, 이전 상태 | Stack |
| 순서대로 처리, 최단 거리 | Queue |
| 양쪽 처리, 구간 | Deque |
| 현재 값이 이전 값들을 무효화 | Monotonic Stack |
| 퍼져 나감, 탐색 | BFS + Queue |
