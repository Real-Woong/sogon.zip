# 장소 분류 백필 — 두 소스를 한 어휘로

- 작업일: 2026-08-11
- 브랜치: `main` (커밋 전)
- 기준 문서: `docs/direction/03-decisions.md` #28, `02-roadmap.md` 7번

## 1. 문제가 로드맵에 적힌 것과 달랐다

로드맵 7번은 이렇게 적혀 있었다 — "TourAPI가 3단계 분류를 주는데 지금 버리고
있다. 961건의 `tags_json`이 `kind`와 완전히 중복이다."

맞는 말인데 그건 증상이었다. 실제 태그 분포를 뽑아보니:

```
 565  ["음식점"]          ← TourAPI. kind=restaurant/cafe와 중복
 181  ["관광지"]          ← TourAPI
 124  ["문화시설"]        ← TourAPI
  79  ["전시/미술","무료"]  ← 서울 문화행사. 이미 충실하다
  75  ["쇼핑"]            ← TourAPI
  70  ["교육/체험","무료"] ← 서울 문화행사
```

서울 문화행사 403건은 **이미 태그가 좋았다.** 무료 여부까지 들어 있었다.
그런데도 반쪽이었던 이유는 TourAPI와 **말이 달라서**다. TourAPI는
"미술관/화랑", 서울은 "전시/미술"이라고 부르는데 둘은 같은 걸 가리킨다.
원문 그대로 두면 슬롯을 채울 때 둘이 영영 만나지 않는다.

그래서 한 어휘로 접는 쪽으로 방향을 잡았다 (`03-decisions.md` #28).

## 2. 코드에는 이름이 없었다

`locationBasedList2`가 주는 `cat3`은 코드뿐이다. `raw_json` 어디에도
`A02060500`이 미술관이라는 정보가 없다. 매핑을 상상해서 쓰면 안 되므로
`categoryCode2`를 따로 불러 **실제로 쓰이는 59종 전부**의 이름을 받았다.

받은 표는 `scripts/ingest/tourCategories.json`에 커밋했다. 덕분에
백필 자체는 API 호출이 0회다 — 원본 응답은 이미 `place_sources.raw_json`에 있다.

회귀 테스트가 **매핑에 쓴 코드가 전부 이 표에 있는지** 검사한다.
코드를 한 글자 틀리면 아무 태그도 안 붙는데 에러도 안 난다.
조용히 비는 게 제일 위험하다.

## 3. 만든 것

### `shared/placeFacets.ts`

접두사 붙은 패싯 네 종류.

| 접두사 | 값 | 어디서 |
|---|---|---|
| `cuisine:` | korean · western · japanese · chinese · other · cafe | TourAPI `cat3` |
| `genre:` | art · history · performance · hands_on · shopping · nature · sports · landmark · festival · reading · theme_park | 양쪽 |
| `fee:` | free · paid | 서울 `IS_FREE` |
| `audience:` | kids · seniors · family · women | 서울 `THEMECODE` |

결과는 `["genre:art", "fee:free", "전시/미술", "무료"]`처럼 된다 —
기계가 매칭하는 값과 사람이 읽는 값이 한 배열에 같이 있다. 컬럼을 나누지
않았으니 마이그레이션도 없다.

`audience:kids`는 데이트 코스에서 대개 **감점 신호**다. 어린이 문화행사는
두 사람의 하루에 넣을 자리가 아니다. 붙여두면 나중에 내릴 수 있다.

### `scripts/ingest/tourCategoryCodes.mjs`

분류 코드표를 받아 저장한다. 실제 데이터에 나타난 (cat1, cat2) 쌍만 조회하므로
호출은 13쌍 × 2 + 1 = 27회다. 하루 1000건 중에서는 무시할 양이고,
영업시간 수집(로드맵 6번)에 쓸 몫을 거의 안 깎는다.

### `scripts/ingest/backfillCategories.mjs`

`--apply`로 태그를 갱신한다. `renormalize.mjs`와 같은 패턴이다 —
분석이 기본, 청크로 나눠 실행, **실행 후 다시 SELECT해서 확인**
(wrangler가 주는 변경 행 수는 믿을 수 없다).

## 4. 멱등성을 처음부터 설계에 넣었다

백필은 한 번 돌리고 끝나지 않는다. 매핑을 고치면 또 돌린다. 그래서
`mergeFacets`가 **기존 패싯을 걷어내고 다시 계산해 넣는다.**

붙이기만 하는 방식이었다면 매핑을 `korean`에서 `japanese`로 고쳤을 때
둘 다 남는다. 회귀 테스트에 넣어뒀다:

```
ok   두 번 돌려도 같다
ok   매핑을 고치면 옛 패싯은 사라진다
ok   표시용 라벨은 지우지 않는다
```

실제로 적용 후 다시 돌리니 **바뀌는 장소 0건**이었다.

## 5. 결과

1,351건 갱신. 숫자가 전부 맞아떨어졌다.

| 검산 | |
|---|---|
| `cuisine:` 565건 | `["음식점"]` 565건과 일치 |
| `fee:` 403건 | 서울 문화행사 전건 |
| `genre:` 774건 + 매핑없음 25건 | 비음식 799건과 일치 |

| kind | 패싯 있음 / 전체 |
|---|---|
| restaurant | 458 / 458 |
| cafe | 107 / 108 |
| exhibition | 218 / 223 |
| activity | 549 / 569 |
| park | 7 / 7 |

빠진 26건 중 25건은 **일부러 안 붙인 것**이다 — 원문이 이미 "기타"인 게 19건,
데이트 장소가 아닌 것(학교·외국문화원·문화전수시설·이색찜질방)이 6건.
나머지 1건은 운영자가 손댄 장소라 백필 대상에서 제외했다.

## 6. 부수적으로 찾은 것 — 공원 26곳이 산책 후보에서 빠져 있었다

`toKind()`는 `cat1='A01'`(자연)일 때만 `park`을 준다. 그런데 TourAPI의
"공원"(`A02020700`)은 **A02 인문**에 들어 있다. 그래서 26곳이 `activity`로
저장됐다.

골격의 산책 슬롯은 `placeKinds: ['park']`만 찾는다. 서울 전체에서 산책에
쓸 수 있는 장소가 **7곳**이었다.

태그와 같이 조용히 바꾸지 않고 `--fix-kind`로 분리했다 — `kind`는 파생값이
아니라 후보 조회의 1차 기준이고, 바꾸면 `is_indoor`도 따라 바뀐다.
진웅 확인 후 적용했다.

| | 전 | 후 |
|---|---|---|
| park | 7 | **33** |
| 산책 후보가 있는 상권 | 일부 | **9곳 전부** |

```
 10  종로      3  성수      2  잠실
  6  을지로    3  대학로    1  한남
  5  명동      2  연남      1  강남
```

## 7. 백필만 했으면 다음 주에 되돌아갔다

두 수집기 모두 `ON CONFLICT ... DO UPDATE SET tags_json = excluded.tags_json`을
쓴다. `kind`도 마찬가지다. 그리고 `seoulCulture.mjs`는 **주 1회 도는 정기
작업**이다 (로드맵의 정기 작업 표).

즉 수집기를 안 고쳤으면 **다음 주에 403건의 패싯이 통째로 날아갔다.**
그래서 수집기도 같이 고쳤다.

- 두 수집기가 `mergeFacets`로 태그를 만든다 — 새로 들어오는 행도 패싯을 갖는다
- `toKind` · `toIsIndoor`를 `shared/placeFacets.ts`로 옮겼다
  (`kindFromTourApi` / `isIndoorForKind`)

옮긴 이유가 중요하다. **수집기 안에 있으면 회귀 테스트가 못 잡는다.**
수집 스크립트는 네트워크와 API 키가 있어야 도는데, `shared/`의 순수 함수는
테스트가 그냥 부를 수 있다. 공원 버그가 오래 산 이유가 정확히 이거였다.

```
ok   공원(A02020700)은 park
ok   테마공원은 park이 아니다
ok   tourApi가 패싯을 만든다
ok   seoulCulture가 패싯을 만든다
```

## 8. 검증

`yarn verify` 통과 — typecheck + worker:types + **테스트 165개**(+27) + build.
