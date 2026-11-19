---
uid: know-cpp-set-vector-unique
permalink: cpp-set-vector-unique
title: "[C++] set과 vector + unique를 선택하는 기준"
summary: "정렬과 중복 제거에 set과 vector를 선택하는 기준, 비교 함수와 lower_bound·upper_bound 사용 시 주의점을 정리한다."
section: knowledge
kind: comparison
domains: ["algorithm"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-11T15:46:25+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/7
tags: ["C++", "STL", "set", "vector", "이진 탐색"]
---

코딩 테스트에서는 `set`, `unique`, `lower_bound` 같은 STL을 자주 사용한다. 문법을 알아도 선택 기준과 주의점을 놓치면 시간 초과나 논리 버그로 이어질 수 있다.

이 글은 정렬 알고리즘 자체인 `sort`, `stable_sort`의 설명은 제외하고, **set과 vector + sort + unique를 어떻게 선택하고 사용하는지**에 집중한다.

## set과 vector의 선택 기준

`std::set`은 내부적으로 Red-Black Tree인 균형 이진 탐색 트리를 사용한다. 중복을 허용하지 않고 항상 정렬된 상태를 유지하며, 삽입·삭제·탐색은 O(log N)이다.

```cpp
set<int> s;
s.insert(3);
s.insert(1);
s.insert(2);
s.insert(2);
// 결과: {1, 2, 3}
```

> “중복 없는 값들을, 항상 정렬된 상태로 관리해야 한다”

이 조건이라면 `set`이 후보가 된다.

| 자료구조 | 중복 처리 | 사용 예 |
|---|---|---|
| `set` | 같은 값은 하나만 유지 | 서로 다른 좌표 개수 |
| `multiset` | 같은 값을 여러 개 허용 | 같은 숫자가 여러 번 등장하는 것이 의미 있을 때 |

입력을 모두 받은 뒤 한 번에 중복을 제거한다면 다음 패턴도 사용할 수 있다.

```cpp
vector<int> v = {3,1,2,2,1,3};
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());
// {1,2,3}
```

`vector`는 연속 메모리라 캐시 효율이 좋고, `set`은 트리라 포인터 이동이 많다. 중간 삽입·삭제가 거의 없고 입력을 모아 처리하는 문제에서는 이 패턴이 실제로 더 빠르다.

## sort → unique → erase 순서

`unique`는 모든 중복이 아니라 **인접한 중복만** 처리한다.

```cpp
vector<int> v = {1, 2, 1, 2, 1};
auto it = unique(v.begin(), v.end());
```

같은 값이 떨어져 있으므로 결과는 그대로다.

```text
1, 2, 1, 2, 1   // 아무것도 안 사라짐
```

먼저 정렬하면 같은 값이 모여 중복을 처리할 수 있다.

```cpp
sort(v.begin(), v.end());   // 1 1 1 2 2
unique(v.begin(), v.end());
```

> sort는 중복을 모으는 역할,
>
> unique는 모여 있는 중복을 하나로 만드는 역할

따라서 다음 순서를 사용한다.

```text
sort → unique → erase
```

## k번째 원소 접근

`set`은 트리이므로 랜덤 접근이 불가능하다.

```text
s.begin() + 5   // ❌ 컴파일 에러
```

반복자를 이동시킬 수는 있지만 O(N) 비용이 든다.

```cpp
auto it = s.begin();
advance(it, 5);   // O(N)
```

k번째 원소를 자주 사용하는 문제라면 정렬된 `vector`를 선택하는 것이 맞다.

## 비교 함수와 구조체 정렬

### set에서 같은 원소를 판단하는 기준

`set`은 두 원소 A와 B가 다음을 만족하면 같은 원소로 간주한다.

```cpp
!comp(A,B) && !comp(B,A)
```

따라서 다음 비교는 사용하면 안 된다.

```text
return a <= b;   // ❌
```

`a <= a`가 참이 되면 비교 규칙이 무너져 내부 트리가 깨지고, 원소가 사라지거나 런타임 에러가 발생할 수 있다.

다음은 안전한 비교 함수의 예시다.

```cpp
if(a.x != b.x) return a.x < b.x;
return a.id < b.id;   // 반드시 고유값으로 tie-break
```

> 비교 기준이 여러 개면
>
> **마지막에 항상 고유한 값(ID, index)을 넣어야 한다**

### 구조체의 operator<

```cpp
struct Node {
    int x, y;
    bool operator<(const Node& o) const {
        if(x != o.x) return x < o.x;
        return y < o.y;
    }
};
```

같은 방식으로 비교를 정의하면 `set<Student>`, `sort(vector<Student>)`, `priority_queue<Student>`에서 동일한 기준을 사용할 수 있다. 코딩 테스트에서 비교 기준을 유지·관리하기 편한 방식이다.

| const 위치 | 의미 |
|---|---|
| `const Node& o` | 비교 중 상대 객체를 바꾸지 않겠다는 약속. STL 컨테이너가 요구한다. |
| 함수 뒤의 `const` | `this` 객체도 바꾸지 않겠다는 의미. `set`과 `sort`는 내부적으로 const 객체를 비교한다. |

이 조건이 없으면 다음과 같은 컴파일 에러가 발생한다.

```text
error: no viable overloaded '<'
```

## lower_bound와 upper_bound

두 함수는 정렬된 컨테이너에서 의미가 있으며 `vector`, `set`, `multiset`에서 사용할 수 있다.

```text
lower_bound(x)  →  x 이상(>= x)인 첫 위치
upper_bound(x)  →  x 초과(> x)인 첫 위치
```

다음 값을 기준으로 비교하면 차이가 명확하다.

```cpp
v = {1, 2, 2, 2, 4, 5}
```

| x | lower_bound(x) | upper_bound(x) |
|---|---|---|
| 2 | 첫 번째 2 | 4 |
| 3 | 4 | 4 |
| 0 | 1 | 1 |
| 6 | `end()` | `end()` |

### 정렬된 vector에서의 질의

다음 질의를 O(log N)에 처리할 수 있다.

**x의 존재 여부**

```cpp
auto it = lower_bound(v.begin(), v.end(), x);
if(it != v.end() && *it == x)  // 존재
```

**x의 개수**

```cpp
cnt = upper_bound(v.begin(), v.end(), x)
    - lower_bound(v.begin(), v.end(), x);
```

**[l, r] 구간의 원소 개수**

```cpp
cnt = upper_bound(v.begin(), v.end(), r)
    - lower_bound(v.begin(), v.end(), l);
```

정렬된 `vector`는 k번째 원소에 접근할 수 있고, 반복자 차이로 개수도 바로 구할 수 있다는 장점이 있다.

### set에서는 멤버 함수 사용

| 사용 방식 | 비용·특징 |
|---|---|
| `lower_bound(s.begin(), s.end(), x)` | O(N). 일반 반복자용 함수를 사용해 트리 구조를 활용하지 못하고 원소를 확인한다. |
| `s.lower_bound(x)` | O(log N). 트리 특성을 이용하는 멤버 함수다. |

```cpp
set<int> s = {1,3,5,7};

auto it = s.lower_bound(4);  // 5
auto it2 = s.upper_bound(5); // 7
```

`set`의 반복자는 뺄 수 없으므로 다음 표현은 사용할 수 없다.

```cpp
s.upper_bound(r) - s.lower_bound(l)   // ❌ 불가능
```

`distance`로 개수를 구하면 O(N)이다.

```cpp
int cnt = distance(s.lower_bound(l), s.upper_bound(r));  // O(N)
```

따라서 범위 안의 원소 개수를 자주 묻는 문제에서는 `set`이 느려질 수 있다.

## 자주 사용하는 STL 함수

```cpp
// ===== vector =====
sort(v.begin(), v.end());
// 정렬 (중복 모으기 + 이진탐색 가능하게 만들기)

unique(v.begin(), v.end());
// 인접한 중복을 뒤로 밀고, 새 끝 iterator 반환

v.erase(it, v.end());
// unique로 밀려난 쓰레기 영역 제거

lower_bound(v.begin(), v.end(), x);
// x 이상 첫 위치 (이진 탐색)

upper_bound(v.begin(), v.end(), x);
// x 초과 첫 위치

binary_search(v.begin(), v.end(), x);
// x가 존재하는지만 O(logN)으로 확인

// ===== set / multiset =====
s.insert(x);
// x 삽입 (자동 정렬 + 중복 처리)

s.erase(x);
// 값 x 삭제 (set: 1개, multiset: 전부)

s.find(x);
// x의 iterator 반환 or s.end()

s.lower_bound(x);
// x 이상 첫 원소

s.upper_bound(x);
// x 초과 첫 원소

s.begin();
// 최소값

s.rbegin();
// 최대값
```

## 문제에 따른 선택

| 상황 | 선택·확인 사항 |
|---|---|
| 중복 제거와 정렬을 유지하며 동적 삽입 | `set` |
| 입력을 모두 받은 뒤 중복 제거 | `vector + sort + unique` |
| k번째 원소 접근 | `vector` |
| 범위 개수 질의가 많음 | `vector + lower_bound / upper_bound` |
| set에서 원소가 사라짐 | 비교 함수 오류 확인 |
