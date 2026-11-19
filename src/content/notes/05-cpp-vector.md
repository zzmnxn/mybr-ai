---
uid: know-cpp-vector
permalink: cpp-vector
title: "[C++] vector 정리"
summary: "vector의 연속 메모리 구조와 재할당, size와 capacity의 차이, 코딩 테스트에서 사용하는 함수와 삭제 패턴을 정리한다."
section: knowledge
kind: concept
domains: ["algorithm"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-06T17:03:26+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/4
tags: ["C++", "STL", "vector"]
---

`vector`는 연속된 메모리를 사용하는 동적 배열이다. 원소에 빠르게 접근할 수 있지만, 중간 삽입·삭제와 메모리 재할당에는 비용이 든다. 이 구조를 기준으로 크기 관리와 자주 사용하는 함수를 정리한다.

## 연속 메모리의 장단점

모든 원소가 메모리상에 나란히 붙어 있다.

| 특성 | 의미 |
|---|---|
| 인덱스 접근 | `v[i]`에 O(1)로 접근한다. |
| 캐시 효율 | 데이터가 인접해 있어 CPU 캐시 효율이 높고 순회 속도가 빠르다. |
| 중간 삽입·삭제 | 뒤쪽 원소를 전부 이동시켜야 한다. |

## size와 capacity

| 항목 | 의미 |
|---|---|
| `size` | 실제로 들어 있는 원소 개수 |
| `capacity` | 재할당 없이 담을 수 있는 최대 개수 |

> 📌 capacity ≥ size는 항상 참이다.

`push_back`을 할 때마다 메모리를 새로 할당하면 기존 원소를 복사하는 비용이 반복된다. 이를 줄이기 위해 `vector`는 미리 여유 공간을 확보한다.

`capacity`가 가득 찬 상태에서 `push_back`을 호출하면 다음 순서로 재할당한다.

1. 더 큰 메모리 공간을 할당한다. 보통 기존의 2배다.
2. 기존 원소를 전부 복사한다.
3. 기존 메모리를 해제하고 새 원소를 추가한다.

따라서 `push_back()`은 평균적으로 O(1)이지만, 최악의 경우 O(N)이 될 수 있다.

### reserve와 resize

두 함수는 목적이 다르다.

| 함수 | size 변화 | 값 생성 | 목적 |
|---|---|---|---|
| `reserve` | 없음 | 없음 | 메모리만 예약해 재할당 방지 |
| `resize` | 있음 | 있음 | 실제 값을 생성하며 원소 개수 변경 |

## 접근과 삭제 시 주의점

| 접근 방식 | 범위 검사 | 주의점 |
|---|---|---|
| `operator[]` | 하지 않음 | 빠르지만 잘못된 인덱스에 접근하면 UB(Undefined Behavior)가 발생한다. |
| `at()` | 수행 | 범위를 벗어나면 예외가 발생하므로 디버깅에 유용하다. |

`v.erase(v.begin() + i)`는 해당 위치 뒤의 모든 원소를 한 칸씩 앞으로 당긴다. 특정 위치 삭제는 O(n)이며, 반복문에서 `erase`를 반복하면 O(n²)이 되어 시간 초과로 이어질 수 있다.

## 코딩 테스트에서 사용하는 함수와 패턴

### 생성·크기 확인·성능

| 용도 | 함수·패턴 | 확인할 점 |
|---|---|---|
| 생성 | `vector<int> v(n, x);` | 초기화에 사용한다. |
| 비어 있는지 확인 | `v.empty()` | `size_t`의 unsigned 타입 관련 실수를 줄이고 가독성을 높인다. |
| 첫·마지막 원소 접근 | `front()`, `back()` | 먼저 `!v.empty()`를 확인한다. |
| 대량 삽입 준비 | `reserve(N)` | `push_back` 전에 호출해 재할당 비용을 줄인다. |
| 특정 위치 삭제 | `erase` | O(n) 비용을 고려한다. |

### Remove-Erase Idiom

특정 값을 전부 제거할 때 사용하는 패턴이다.

```cpp
v.erase(remove(v.begin(), v.end(), x), v.end());
```

전체 삭제를 O(n)에 처리한다. `remove`는 `size`를 바꾸지 않고 남길 값을 앞으로 당기며, 뒤쪽에 남은 구간은 `erase`가 제거해 실제 `size`를 줄인다.

반복해서 한 원소씩 지우는 다음 방식은 피해야 한다.

```cpp
for (...) {
if (v[i] == x)
        v.erase(v.begin() + i);
}
```

### assign과 swap

`assign`은 초기화를 대체하는 방법으로, `clear + resize + fill`의 역할을 한다.

```cpp
v.assign(n, x);
```

`swap`은 원소를 복사하지 않고 내부 포인터만 교환하므로 O(1)에 두 벡터를 바꿀 수 있다. 빈 벡터와 교환하면 메모리와 `capacity`까지 해제할 수 있다. 반면 `clear()`는 `size`만 0으로 만들고 `capacity`는 유지한다.

## 언제 vector를 사용할까?

| 적합한 경우 | 부적합한 경우 |
|---|---|
| 순차 접근이 많을 때 | 중간 삽입·삭제가 빈번할 때 |
| 끝에서 삽입·삭제할 때 | 큐 구조가 필요할 때 |
| 랜덤 액세스가 필요할 때 | 앞쪽 삭제를 반복해야 할 때 |
