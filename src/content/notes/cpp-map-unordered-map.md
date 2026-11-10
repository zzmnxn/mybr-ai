---
uid: know-cpp-map-unordered-map
permalink: cpp-map-unordered-map
title: "[C++] map과 unordered_map의 이해"
summary: "map과 unordered_map의 구조와 선택 기준, 조회·삽입·삭제, 정렬과 메모리 사용 시 주의점을 정리한다."
section: knowledge
kind: comparison
domains: ["algorithm"]
growth: impulse
publication: published
publishedAt: 2026-11-10
originalPublishedAt: 2026-01-11T16:35:24+09:00
source:
  type: tistory
  url: https://wlals916.tistory.com/8
tags: ["C++", "STL", "map", "unordered_map"]
---

`map`과 `unordered_map`은 키로 값을 관리하지만 내부 구조와 성능 특성이 다르다. 코딩 테스트에서의 선택 기준과, 조회·순회·삭제 과정에서 자주 놓치는 부분을 정리한다.

## map과 unordered_map 비교

| 구분 | map | unordered_map |
|---|---|---|
| 내부 구조 | Red-Black Tree, 균형 이진 트리 | Hash Table |
| 탐색 | 항상 O(log N) | 평균 O(1), 최악 O(N) |
| 정렬 | 항상 키 기준 정렬 | 순서 없음 |
| 안정성 | 안정적인 성능 | 해시 충돌에 취약 |
| 코딩 테스트 사용성 | ★★★★★ | ★★★ |

`unordered_map`은 해시를 사용한다.

```text
key → hash(key) → 배열 index
```

서로 다른 키가 같은 해시 값으로 몰리면 해당 버킷에서 선형 탐색이 발생해 성능이 O(N)으로 떨어진다. 출제자가 이런 입력을 의도적으로 만들 수도 있다.

> “unordered\_map이 빠르긴 한데, map이 더 안전하다”

## 조회처럼 보이는 삽입: operator[]

```cpp
map<string, int> m;

if (m["banana"] == 0) { ... }   // ❌ 매우 위험
```

위 코드는 `banana`의 존재를 확인하는 것처럼 보이지만, 키가 없으면 다음 동작을 수행한다.

```text
"banana"가 없으면
("banana", 0)을 map에 삽입한다
```

> 조회한 것 같지만 실제로는 데이터가 추가됨

이 때문에 크기와 메모리 사용량이 늘고 로직이 깨질 수 있다. 존재 여부는 삽입을 수행하지 않는 `find`나 `count`로 확인한다.

```cpp
if (m.find("banana") != m.end()) { ... }
// 또는
if (m.count("banana")) { ... }
```

### 핵심 함수

| 함수 | 의미 |
|---|---|
| `m[k] = v` | 삽입 또는 갱신 |
| `m.insert({k,v})` | 없을 때만 삽입 |
| `m.find(k)` | 존재 확인 |
| `m.count(k)` | 0 또는 1 |
| `m.erase(k)` | 삭제 |
| `m.clear()` | 전체 삭제 |

`map`은 내부가 트리이므로 모든 연산이 항상 O(log N)이며, 해시를 겨냥한 입력으로 성능이 무너지는 상황을 피할 수 있다.

## 정렬·카운팅·그룹 관리

### 순회와 정렬 방향

`map`을 순회하면 키 순서대로 출력된다. 이진 탐색 트리의 중위 순회가 오름차순 정렬이기 때문이다.

```cpp
for (const auto& [k, v] : m) {
    cout << k << " " << v << "\\n";
}
```

> “작은 순서대로 출력하라”
>
> “사전순으로 출력하라”

이런 조건에서는 `map` 순회를 활용할 수 있다. 내림차순 정렬은 다음과 같이 지정한다.

```cpp
map<int, string, greater<int>> m;
```

키가 큰 순서대로 유지되므로 정렬된 우선순위 큐처럼 사용할 수 있다.

### 빈도수 세기

```cpp
vector<string> items = {"apple","banana","apple","cherry"};
map<string,int> counter;

for (auto& s : items)
    counter[s]++;
```

`counter[s]++`는 키가 없으면 0으로 생성한 뒤 1을 더하고, 있으면 기존 값을 증가시킨다.

```text
없으면 0 생성 → 1 증가
있으면 기존 값 증가
```

문자열, 좌표, 큰 정수도 카운팅할 수 있어 배열보다 폭넓게 사용할 수 있다.

### 키별로 자료구조 묶기

```cpp
map<string, vector<int>> genreSongs;
map<int, set<int>> graph;
```

키별 그룹 관리에 사용하는 패턴이다. 카테고리 분류, 그래프 인접 리스트, 그룹핑 문제에 활용할 수 있다.

## lower_bound와 범위 질의

```cpp
auto it = m.lower_bound(k);
```

> key ≥ k 중 가장 작은 것

`map`은 정렬된 배열과 이진 탐색의 역할을 함께 수행한다. 좌표 압축, 순위 매기기, 구간 쿼리와 범위 문제에 활용할 수 있다.

## const map에서의 접근

다음과 같이 읽기 전용 `map`을 받는 함수가 있다고 가정한다.

```cpp
void solve(const map<int,int>& m) {
    ...
}
```

이때 `operator[]`는 사용할 수 없다.

```cpp
m[key];   // ❌ 컴파일 에러
```

키가 없을 때 원소를 삽입할 수 있는 연산이므로 `const map`에서는 호출할 수 없기 때문이다. 대신 `at`이나 `find`를 사용한다.

```cpp
m.at(key);        // 값 반환, 없으면 exception
m.find(key);     // 가장 안전
```

## 순회 중 erase

반복자가 가리키는 원소를 지운 뒤 그 반복자를 증가시키면 문제가 생긴다.

```cpp
for (auto it = m.begin(); it != m.end(); it++) {
    if (조건) m.erase(it);   // ❌ iterator 깨짐
}
```

삭제 후 반환되는 다음 반복자를 받아 순회를 이어가야 한다.

```cpp
for (auto it = m.begin(); it != m.end(); ) {
    if (조건)
        it = m.erase(it);   // 다음 iterator 반환
    else
        ++it;
}
```

## reserve와 메모리 사용

### unordered_map의 rehash 비용

```cpp
unordered_map<int,int> m;
m.reserve(100000);
```

해시 테이블이 커지면 모든 원소를 다시 해싱하고 재배치하는 rehash가 발생한다. 순간적으로 O(N) 비용이 들고, 대량 입력에서는 시간 초과로 이어질 수 있다. 입력 크기가 크다면 `reserve`로 미리 공간을 확보하는 것이 중요하다.

### map 노드의 메모리

한 노드에는 키와 값 외에도 다음 정보가 들어간다.

```text
key, value,
left pointer, right pointer, parent pointer, color
```

배열보다 5~8배 많은 메모리를 사용하므로, 무조건 `map`을 선택하면 메모리 초과가 발생할 수 있다.

## 상황별 선택

| 상황 | 선택 |
|---|---|
| 키가 1~100000 범위의 정수 | 배열 |
| 키가 희소하거나 문자열·좌표 | `map` |
| 정렬된 상태가 필요함 | `map` |
| 단순한 빠른 조회 | `unordered_map` |
| 해시를 겨냥한 입력이 걱정됨 | `map` |
