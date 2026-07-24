# Sogon.zip / 소곤.zip App Development Archive

## 0. 앱 이름

### 공식 앱명

**Sogon.zip**

### 한글명

**소곤.zip**

### 읽는 법

**소곤집**

---

## 1. 이름의 의미

**Sogon.zip / 소곤.zip**은 두 가지 의미를 가진다.

### 1. 소곤소곤 나눈 이야기들을 압축한 파일

연인이나 친구와 나누고 싶은 취향, 비밀, 마음, 선호를 조용히 저장해두는 공간이다.

`.zip`은 다음 의미를 가진다.

```txt
취향을 압축한다
마음을 저장한다
아직 열리지 않은 이야기를 보관한다
필요한 순간에 압축을 푼다
```

### 2. 우리만의 소곤거리는 집

`zip`은 “집”처럼 읽힐 수도 있다.

즉, **소곤.zip = 소곤집**이다.

이 앱은 가까운 사람과의 취향과 마음을 담아두는 작은 디지털 집이다.

---

## 2. 핵심 컨셉

**Sogon.zip은 가까운 사람과 나누고 싶은 취향과 마음을 파일처럼 저장하고, 그 정보는 약속/데이트 추천에 반영되며, 정해진 날 작성자 확인 후 상대에게 열리는 관계 기반 취향 아카이브 앱이다.**

핵심은 다음 3가지다.

```txt
1. 취향을 조용히 저장한다.
2. 저장된 취향을 바탕으로 데이트/약속을 추천한다.
3. 특정 시점에 파일을 열어 상대에게 보여준다.
```

---

## 3. 서비스 한 줄 정의

```txt
조용히 저장한 취향이, 함께할 시간을 추천해주는 곳.
```

또는:

```txt
우리만의 취향과 마음을 압축해두고, 필요한 순간에 열어보는 앱.
```

---

## 4. 메인 카피 후보

### 감성형

```txt
소곤.zip
조용히 저장한 취향이,
우리의 시간이 되는 곳.
```

### 기능형

```txt
소곤.zip
취향은 추천으로 풀리고,
마음은 정해둔 날에 열려요.
```

### 브랜드형

```txt
소곤.zip
우리만 아는 취향과 마음을 담아두는 집.
```

### 1020 감성형

```txt
소곤.zip
우리 취향 모음.zip
```

### 추천 최종 조합

```txt
소곤.zip

조용히 저장한 취향이,
우리의 시간이 되는 곳.

취향은 추천으로 풀리고,
마음은 정해둔 날에 열려요.
```

---

## 5. 핵심 타겟

### 1차 타겟

```txt
20대 여성 유저
연인과 데이트 코스를 자주 고민하는 사용자
친구와 맛집/카페/여행 취향을 공유하는 사용자
감성 기록, 취향 아카이브, 기념일 기록을 좋아하는 사용자
```

### 확장 타겟

```txt
연인
절친
친구 1:1
소규모 친구 그룹
여행 메이트
룸메이트
```

---

## 6. 주요 사용 시나리오

### 6.1 연인 모드

사용자는 연인과 연결한다.

사용자는 자신의 취향을 파일처럼 저장한다.

예시:

```txt
파일명: 매운음식_싫어함.zip
태그: 음식
내용: 사실 나는 매운 음식을 잘 못 먹어.
민감도: 2
공개 시점: 100일
추천 반영: ON
```

앱은 이 정보를 상대에게 직접 보여주지 않지만, 데이트 추천에는 반영한다.

D+100이 되면 작성자에게 먼저 알림이 간다.

```txt
오늘 열릴 소곤파일이 있어요.
상대에게 보여주기 전에 확인해주세요.
```

작성자가 확인하면 상대에게 열린다.

```txt
새로운 소곤파일이 열렸어요.

“사실 나는 매운 음식을 잘 못 먹어.”
```

이 순간은 캘린더에 기록된다.

```txt
D+100
우리가 하나 더 가까워진 날
```

---

### 6.2 친구 모드

사용자는 친구와 연결한다.

친구끼리 취향을 저장한다.

예시:

```txt
파일명: 카페취향.zip
태그: 카페
내용: 나는 사람 많은 핫플보다 조용한 디저트 카페가 좋아.
민감도: 2
공개 시점: 다음 약속 전
추천 반영: ON
```

앱은 다음 약속 추천에 이 정보를 반영한다.

```txt
오늘의 약속 추천.zip

1. 조용한 디저트 카페
2. 소품샵
3. 포토부스

서로의 취향을 조심스럽게 풀어봤어요.
```

---

## 7. UI 메타포

Sogon.zip의 UI는 **컴퓨터 폴더 / zip 파일 / 압축 해제 / 파일 탐색기 / 집** 메타포를 기반으로 한다.

### 핵심 시각 언어

```txt
폴더
파일
.zip
압축
압축 해제
잠긴 파일
파일 미리보기
기록 스탬프
우리만의 디지털 집
```

---

## 8. 핵심 UI 오브젝트

### 8.1 소곤파일

기존의 Open Card를 대체하는 핵심 단위.

사용자가 저장하는 모든 취향/비밀/마음은 **소곤파일**이다.

예시:

```txt
소곤파일
- 음식.zip
- 카페취향.zip
- 생일선물취향.zip
- 말하기어려운마음.zip
```

### 8.2 소곤폴더

파일들이 모여 있는 공간.

예시:

```txt
내 소곤폴더
우리 소곤폴더
친구와의 소곤폴더
연인과의 소곤폴더
```

### 8.3 압축 풀기

카드가 상대에게 공개되는 행위.

기존의 “Open”을 앱 세계관에서는 **압축 풀기** 또는 **열기**로 표현한다.

예시:

```txt
오늘 이 파일을 열까요?
압축을 풀면 상대가 내용을 볼 수 있어요.
```

### 8.4 추천.zip

데이트/약속 추천 결과.

예시:

```txt
오늘의 추천.zip
두 사람의 취향을 조심스럽게 풀어봤어요.
```

### 8.5 기록.zip

열린 파일과 반응, 기념일이 저장되는 공간.

예시:

```txt
우리기록.zip
D+100에 열린 음식취향.zip
```

---

## 9. 주요 기능명

기존 기능명을 Sogon.zip 세계관에 맞게 바꾼다.

```txt
Open Card → 소곤파일
Card List → 내 소곤폴더
Create Card → 새 소곤파일 만들기
Open Confirmation → 압축 풀기 확인
Partner Received → 새 소곤파일 도착
Date Recommendation → 오늘의 추천.zip
Calendar → 기록.zip / 소곤 캘린더
Reaction → 답장 / 반응 남기기
```

---

## 10. 앱 구조

### 10.1 온보딩

```txt
Sogon.zip에 오신 걸 환영해요.

조용히 저장한 취향이,
우리의 시간이 되는 곳.
```

사용자 선택:

```txt
누구와 소곤.zip을 시작할까요?

[연인과 시작하기]
데이트와 기념일을 더 편하게 기록해요.

[친구와 시작하기]
약속, 여행, 취향을 더 쉽게 맞춰요.
```

---

### 10.2 관계방 생성

기존 커플방 개념을 확장해 **소곤방**으로 부른다.

```txt
새 소곤방 만들기
초대코드로 들어가기
```

데이터 모델상으로는 `SogonRoom`.

방 타입:

```txt
couple
friend
group_friend
```

MVP에서는 다음 두 개만 지원한다.

```txt
couple
friend
```

그리고 friend도 처음에는 1:1로 제한한다.

---

## 11. 핵심 UX 원칙

### 11.1 공개와 추천 반영은 분리한다

```txt
파일 공개 여부 = 상대가 파일 내용을 볼 수 있는가?
추천 반영 여부 = 앱이 추천 알고리즘에 사용할 수 있는가?
```

예시:

```txt
isOpened: false
recommendationEnabled: true
```

뜻:

```txt
상대에게 아직 파일은 열리지 않았지만, 추천에는 사용된다.
```

---

### 11.2 추천에는 반영하되, 이유는 숨긴다

나쁜 예시:

```txt
상대가 매운 음식을 싫어해서 마라탕은 제외했어요.
```

좋은 예시:

```txt
두 분이 부담 없이 즐길 수 있는 코스를 골라봤어요.
```

또는:

```txt
서로의 취향을 조심스럽게 풀어봤어요.
```

---

### 11.3 자동 공개는 없다

공개 예정일은 자동 공개일이 아니라 **압축 풀기 확인일**이다.

전날 알림:

```txt
내일 열릴 소곤파일이 있어요.
상대에게 보여주기 전에 확인해주세요.
```

당일 알림:

```txt
오늘 이 소곤파일을 열 예정이에요.

“사실 나는 매운 음식을 잘 못 먹어.”

[오늘 열기]
[수정하고 열기]
[다음 기념일로 미루기]
[아직 닫아두기]
```

---

### 11.4 열린 순간은 기록된다

파일이 열리면 상대방은 반응을 남길 수 있고, 그 순간은 캘린더에 기록된다.

```txt
D+100
우리가 하나 더 가까워진 날

음식취향.zip이 열렸어요.
```

---

## 12. 주요 화면 구성

## 12.1 Intro

```txt
소곤.zip

조용히 저장한 취향이,
우리의 시간이 되는 곳.

[시작하기]
```

Visual:

```txt
레트로한 작은 폴더 아이콘
.zip 파일 아이콘
부드러운 크림 배경
말풍선처럼 작게 떠 있는 파일들
```

---

## 12.2 Relationship Select

```txt
누구와 소곤.zip을 시작할까요?

[연인과 시작하기]
데이트와 기념일을 더 편하게 기록해요.

[친구와 시작하기]
약속, 여행, 취향을 더 쉽게 맞춰요.
```

---

## 12.3 Sogon Room Connect

```txt
닉네임을 입력해주세요

[닉네임 입력]

[새 소곤방 만들기]
[초대코드로 들어가기]
```

초대 화면:

```txt
상대방을 초대해주세요

초대코드
A7K92

[코드 복사하기]
[공유하기]
```

---

## 12.4 Home

연인 모드:

```txt
D+87
우리의 소곤.zip

오늘의 추천.zip
두 사람의 취향을 조심스럽게 풀어봤어요.
[추천 열기]

다가오는 소곤파일
D+100에 열릴 파일 2개
[확인하기]

최근 기록.zip
음식취향.zip이 열렸어요.
[기록 보기]
```

친구 모드:

```txt
우리의 소곤.zip

오늘의 약속 추천.zip
친구와의 취향을 조심스럽게 풀어봤어요.
[추천 열기]

다가오는 소곤파일
다음 약속 전에 열릴 파일 1개
[확인하기]

최근 기록.zip
카페취향.zip이 열렸어요.
[기록 보기]
```

---

## 12.5 Create Sogon File

```txt
새 소곤파일 만들기

언젠가 알려주고 싶은 취향이나 마음을
조용히 저장해보세요.
```

입력 항목:

```txt
파일 태그
[음식] [알레르기] [카페] [데이트 취향] [취미] [비밀] [+ 직접 추가]

파일 내용
[사실 나는 매운 음식을 잘 못 먹어.]

민감도
😄 😀 🙂 🙁 😣

열리는 시점
[지금 알려도 좋아요]
[100일 후]
[200일 후]
[1년 후]
[직접 날짜 선택]
[내가 직접 열게요]
[열고 싶지 않아요]

추천에 반영하기
[ON]

[소곤파일 저장하기]
```

---

## 12.6 My Sogon Folder

```txt
내 소곤폴더

[열릴 예정] [열 준비됨] [열림] [닫아둠]
```

파일 카드 예시:

```txt
음식취향.zip
🔒 아직 닫혀 있어요
D+100 열림 예정
민감도 😀
추천 반영 ON

[수정]
[시점 변경]
```

```txt
카페취향.zip
🎁 열림 완료
D+50에 열렸어요
반응 1개

[기록 보기]
```

---

## 12.7 Unzip Confirmation

```txt
오늘 열릴 소곤파일이 있어요

상대에게 보여주기 전에
마지막으로 확인해주세요.
```

파일 미리보기:

```txt
음식취향.zip

“사실 나는 매운 음식을 잘 못 먹어.”

함께 보낼 메시지:
[우리 벌써 100일 만났네. 사랑해.]
```

버튼:

```txt
[오늘 열기]
[수정하고 열기]
[다음 기념일로 미루기]
[아직 닫아두기]
```

주의 문구:

```txt
열기 전까지 상대는 이 내용을 볼 수 없어요.
```

---

## 12.8 Partner Received

```txt
새로운 소곤파일이 열렸어요

우리 벌써 100일 만났네. 사랑해.

음식취향.zip
“사실 나는 매운 음식을 잘 못 먹어.”
```

반응:

```txt
[🫶 말해줘서 고마워]
[🙂 기억해둘게]
[💛 귀엽다]
[답장 남기기]
```

버튼:

```txt
[기록.zip에서 보기]
```

---

## 12.9 Recommendation

연인 모드:

```txt
오늘의 추천.zip

[밥] [카페] [실내] [산책] [랜덤]

추천 코스:
1. 조용한 파스타집
2. 산책하기 좋은 카페거리
3. 가벼운 디저트 카페

추천 이유:
두 사람의 취향을 조심스럽게 풀어봤어요.

[다시 풀어보기]
[이 코스로 정하기]
```

친구 모드:

```txt
오늘의 약속 추천.zip

[밥] [카페] [전시] [쇼핑] [랜덤]

추천 코스:
1. 브런치 카페
2. 소품샵
3. 포토부스
4. 디저트 카페

추천 이유:
서로의 취향을 조심스럽게 풀어봤어요.

[다시 풀어보기]
[이 약속으로 정하기]
```

---

## 12.10 Record.zip / Calendar

```txt
기록.zip

2026년 8월

D+100
우리가 하나 더 가까워진 날

음식취향.zip이 열렸어요.
“사실 나는 매운 음식을 잘 못 먹어.”

반응:
“말해줘서 고마워.”
```

스탬프 타입:

```txt
📁 저장됨
🔒 닫힘
🎁 열림
💬 답장
🍽 음식
☕ 카페
📅 기념일
```

---

## 13. 디자인 시스템

## 13.1 전체 무드

```txt
트렌디한 1020 감성
레트로 컴퓨터 폴더 UI
부드러운 미니멀 감성
너무 유치하지 않은 귀여움
프라이버시가 느껴지는 안전한 공간
친구/연인 모두 쓸 수 있는 중립적 따뜻함
```

---

## 13.2 시각 스타일

### 핵심 형태

```txt
폴더형 카드
파일형 카드
.zip 확장자 뱃지
작은 파일 아이콘
둥근 사각형
레트로 OS 느낌의 탭
부드러운 픽셀 감성은 가능하되 과하지 않게
```

### 색상

```txt
Cream White
Soft Lavender
Pale Yellow
Warm Pink
Muted Mint
Soft Gray
Dark Navy Text
```

### 아이콘

```txt
📁 Folder
📄 File
🔒 Locked File
🎁 Opened File
💬 Whisper
📅 Calendar
🫶 Reaction
.zip Badge
```

---

## 13.3 UI 컴포넌트

```txt
SogonFileCard
SogonFolderCard
ZipBadge
LockedFilePreview
UnzipButton
RecommendationZipCard
SensitivityEmojiBar
OpenScheduleSelector
FileStatusTabs
RecordStamp
ReactionPill
```

---

## 14. 데이터 모델 초안

## 14.1 User

```ts
type User = {
  id: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 14.2 SogonRoom

```ts
type SogonRoom = {
  id: string;
  type: "couple" | "friend";
  inviteCode: string;
  createdByUserId: string;
  relationshipStartDate?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 14.3 RoomMember

```ts
type RoomMember = {
  id: string;
  roomId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
};
```

---

## 14.4 SogonFile

```ts
type SogonFile = {
  id: string;
  ownerUserId: string;
  roomId: string;

  fileName: string;
  tag: string;
  category: SogonFileCategory;

  content: string;

  sensitivity: 1 | 2 | 3 | 4 | 5;

  openPolicy: OpenPolicy;

  openAfterDays?: number;
  openDate?: string;

  isOpened: boolean;
  openedAt?: string;

  recommendationEnabled: boolean;

  status: SogonFileStatus;

  createdAt: string;
  updatedAt: string;
};
```

---

## 14.5 SogonFileCategory

```ts
type SogonFileCategory =
  | "food"
  | "allergy"
  | "cafe"
  | "date_preference"
  | "hobby"
  | "lifestyle"
  | "relationship_style"
  | "family"
  | "health"
  | "secret"
  | "sexual_preference"
  | "gift"
  | "travel"
  | "custom";
```

---

## 14.6 OpenPolicy

```ts
type OpenPolicy =
  | "open_now"
  | "after_days"
  | "specific_date"
  | "anniversary"
  | "manual_only"
  | "never";
```

설명:

```txt
open_now: 지금 공개
after_days: N일 후 열림 예정
specific_date: 특정 날짜에 열림 예정
anniversary: 100일, 200일, 1년 등 기념일 기준
manual_only: 내가 직접 열게요
never: 열고 싶지 않아요
```

---

## 14.7 SogonFileStatus

```ts
type SogonFileStatus =
  | "locked"
  | "scheduled"
  | "ready_to_unzip"
  | "opened"
  | "postponed"
  | "cancelled";
```

---

## 14.8 UnzipEvent

```ts
type UnzipEvent = {
  id: string;
  roomId: string;
  fileId: string;

  openerUserId: string;
  receiverUserId: string;

  title: string;
  message?: string;

  openedAt: string;
  relationshipDay?: number;

  stampText: string;

  createdAt: string;
};
```

---

## 14.9 Reaction

```ts
type Reaction = {
  id: string;
  unzipEventId: string;
  senderUserId: string;
  receiverUserId: string;

  type: "thanks" | "remember" | "cute" | "custom";
  message?: string;

  createdAt: string;
};
```

---

## 15. 추천 로직 초기 방향

MVP에서는 AI 없이 룰 기반 추천으로 시작한다.

예시:

```txt
SogonFile:
태그: 음식
내용: 매운 음식 싫어함
추천 반영: ON
공개 여부: false
```

내부 추천 처리:

```txt
spicy_food penalty -80
non_spicy_food boost +30
```

유저에게 보이는 설명:

```txt
두 사람의 취향을 조심스럽게 풀어봤어요.
```

보이면 안 되는 설명:

```txt
상대가 매운 음식을 싫어해서 제외했어요.
```

---

## 16. 보안 원칙

이 앱은 민감정보를 다룰 수 있으므로 보안이 중요하다.

### MVP 보안 방향

```txt
카드/파일 내용 암호화 저장
roomId와 membership 검증 후 접근
공개 전 receiver는 content 조회 불가
추천 로직은 서버에서 처리
추천 이유에서 비공개 정보 직접 노출 금지
민감도 4~5 파일은 열기 전 이중 확인
```

### 블록체인 활용은 후순위

블록체인을 활용할 경우:

```txt
온체인:
- 파일 해시
- 공개 조건
- 공개 가능 시점

오프체인:
- 암호화된 파일 내용
- 유저 정보
- 관계방 정보
```

민감정보 원문은 절대 온체인에 올리지 않는다.

---

## 17. BM 구조

BM은 “비밀을 여는 값”을 받으면 안 된다.

돈을 받는 대상은 다음이다.

```txt
기록을 더 오래 보관하는 것
파일을 더 예쁘게 꾸미는 것
추천을 더 정교하게 받는 것
소중한 순간을 더 좋은 형태로 저장하는 것
```

---

## 17.1 Free Plan

```txt
무료
- 소곤방 1개
- 소곤파일 10개
- 기본 추천.zip
- 기본 기록.zip
- 텍스트 파일
- 기본 반응
```

---

## 17.2 Plus Plan

```txt
Sogon.zip Plus
월 8,900원

- 소곤파일 100개
- 커스텀 태그
- 사진 파일
- 기록.zip 테마
- 기념일 알림
- 월간 리포트
- AI 추천.zip 월 20회
```

---

## 17.3 Premium Plan

```txt
Sogon.zip Premium
월 12,900원

- 소곤파일 무제한
- 사진/음성 파일
- 고급 기록.zip 테마
- AI 추천.zip
- 기념일 리포트
- 우리.zip 내보내기
- 고급 보안 잠금
```

---

## 17.4 일회성 결제

```txt
100일 기념 파일팩: 3,900원
1주년 우리.zip 내보내기: 9,900원~14,900원
기록.zip 테마팩: 2,900원
음성 파일 기능 해금: 4,900원
Open 기록 PDF 내보내기: 7,900원
```

---

## 18. MVP 우선순위

## 18.1 반드시 필요한 기능

```txt
1. 온보딩
2. 연인/친구 선택
3. 소곤방 생성/참여
4. 소곤파일 작성
5. 파일별 민감도 설정
6. 파일별 열림 시점 설정
7. 추천 반영 ON/OFF
8. 내 소곤폴더
9. 열기 전 작성자 확인
10. 상대방 수신 화면
11. 반응 남기기
12. 기록.zip 저장
13. 기본 추천.zip
```

---

## 18.2 후순위 기능

```txt
1. 친구 그룹 모드
2. AI 추천
3. 지도 기반 장소 추천
4. 사진/음성 파일
5. 우리.zip 내보내기
6. 블록체인 공개 조건 증명
7. 커플/친구 리포트
8. 위젯
```

---

## 19. Figma 디자인 방향

### 핵심 플로우

```txt
Intro
→ 연인/친구 선택
→ 소곤방 생성
→ 새 소곤파일 만들기
→ 내 소곤폴더
→ 열기 확인
→ 상대방 수신
→ 추천.zip
→ 기록.zip
```

### 가장 중요한 데모 플로우

```txt
새 소곤파일 만들기
→ 오늘 열릴 소곤파일 확인
→ 상대방에게 파일 열림
→ 기록.zip에 저장
```

---

## 20. Figma 프롬프트용 요약

```txt
Create a mobile app UI for a Korean relationship-based preference archive app called “Sogon.zip / 소곤.zip”.

The name means both:
1. A .zip file of quietly shared whispers and preferences.
2. A private little home where close people whisper to each other.

The target users are couples and close friends, especially 1020 users who understand the “맛집.zip / 여행.zip / 추억.zip” internet naming culture.

The app lets users create private “소곤파일” that store preferences, allergies, date styles, cafe preferences, secrets, gift preferences, and small personal stories.

Each 소곤파일 has:
- file name
- tag
- content
- sensitivity
- open/unzip timing
- recommendation reflection ON/OFF

Private files can still be reflected in recommendations, but the content is not shown to the partner/friend until the owner confirms opening it.

The core UI metaphor should be:
- computer folder
- .zip file
- locked file
- unzip/open interaction
- file explorer
- private home/archive

The app should feel:
- trendy
- soft
- private
- warm
- slightly retro computer folder style
- emotionally safe
- not childish
- suitable for both couples and friends

Main screens:
1. Intro
2. Relationship selection: lover or friend
3. Create/join Sogon room
4. Home
5. Create Sogon File
6. My Sogon Folder
7. Unzip Confirmation
8. Partner/Friend Received File
9. Recommendation.zip
10. Record.zip Calendar

Use Korean UI copy.
Use rounded folder/file cards.
Use soft cream, lavender, warm yellow, muted pink, and light gray colors.
Use folder, file, lock, zip badge, calendar, gift, and message icons.
```

---

## 21. 현재 최종 결론

Sogon.zip / 소곤.zip은 다음 앱이다.

```txt
가까운 사람과 나누고 싶은 취향과 마음을 소곤파일로 저장한다.
각 파일은 민감도와 열림 시점을 가진다.
닫힌 파일도 추천에는 반영될 수 있다.
하지만 상대방은 작성자가 확인하기 전까지 파일 내용을 볼 수 없다.
열린 파일은 상대에게 전달되고, 반응을 남길 수 있다.
그 순간은 기록.zip에 저장된다.
```

핵심 차별점:

```txt
취향 기반 추천
+ 관계별 비공개 취향 저장
+ 기념일/특정일 압축 해제
+ 폴더/zip 기반 트렌디한 UI
```

---

## 22. 데이트 추천 시스템 기술 아카이브

### 22.1 추천 시스템 방향

Sogon.zip의 데이트/약속 추천은 단순히 취향 태그가 많이 겹치는 장소를 고르는 방식보다, **현실 제약을 먼저 만족시키고 취향 조건을 단계적으로 적용하는 추천 파이프라인**이 잘 맞는다.

핵심 방향은 다음과 같다.

```txt
Hard Constraint는 반드시 지킨다.
Soft Constraint는 우선순위에 따라 적용한다.
결과가 부족하면 낮은 우선순위 조건부터 완화한다.
최종 결과는 코스 흐름과 두 사람의 취향 균형을 기준으로 랭킹한다.
```

추천 시스템 이름 후보:

```txt
Constraint Relaxation 기반 Cascade Date Course Recommendation System
```

한글 설명:

```txt
제약 완화 기반 다단계 데이트 코스 추천 시스템
```

---

### 22.2 핵심 기술 용어

#### 1. Cascade Filtering / 다단계 추천 파이프라인

우선순위가 높은 조건부터 차례대로 적용하면서 후보 장소 Pool을 좁혀가는 방식이다.

Sogon.zip에서는 다음 순서로 사용할 수 있다.

```txt
지역/반경 필터링
→ 운영 시간/기간 필터링
→ 관계 타입 필터링
→ 취향 태그 매칭
→ 코스 흐름 점수화
→ 최종 랭킹
```

대용량 추천 시스템의 일반적인 구조인 `Retrieval → Filtering → Scoring → Ranking`과도 잘 맞는다.

#### 2. Constraint Relaxation / 제약 완화

모든 조건을 만족하는 결과가 없을 때, 우선순위가 낮은 조건부터 하나씩 제거하거나 약화해서 추천 결과를 확보하는 방식이다.

데이트 추천에서는 과제약 상태가 자주 생긴다.

예시:

```txt
성수
반경 1km
조용한 카페
디저트 맛집
루프탑
전시 근처
비 오는 날 적합
오늘 19시 이후 영업
```

위 조건을 모두 만족하는 장소가 없으면 다음처럼 완화한다.

```txt
1차: 루프탑 조건 제거
2차: 반경 1km → 1.5km로 확장
3차: 디저트 맛집 → 카페 태그로 완화
4차: 전시 근처 조건을 Nice-to-have로 변경
```

Sogon.zip의 추천 로직에서 가장 중요한 알고리즘 개념으로 볼 수 있다.

#### 3. Elimination by Aspects / 속성별 제거 모형

가장 중요한 속성을 만족하지 않는 후보를 먼저 제거하고, 남은 후보에 대해 다음 속성을 적용하는 순차적 필터링 방식이다.

Sogon.zip에서는 다음처럼 활용할 수 있다.

```txt
1순위: 둘 다 싫어하지 않는 장소인가?
2순위: 시간/거리 조건을 만족하는가?
3순위: 최소 한 명의 강한 선호와 맞는가?
4순위: 대화하기 좋은 분위기인가?
5순위: 다음 코스와 이동 동선이 자연스러운가?
```

---

### 22.3 Hard Constraint와 Soft Constraint

#### Hard Constraint

깨면 추천 품질이 바로 무너지는 조건이다. 결과가 부족해도 쉽게 완화하지 않는다.

```txt
영업 중 여부
예약 가능 여부
전시/팝업 기간
영화 상영 시간
이동 가능 시간
알레르기/절대 비선호
예산 상한
이미 방문한 장소 제외 여부
```

#### Soft Constraint

만족하면 좋지만, 결과가 부족하면 우선순위에 따라 완화할 수 있는 조건이다.

```txt
감성적인 분위기
조용함
사진 찍기 좋음
디저트 맛집
루프탑
실내/실외 선호
핫플 여부
카페/전시/영화/산책 등 활동 취향
```

---

### 22.4 추천 파이프라인 초안

#### 1단계. Spatial Filtering

카카오맵 중심점 또는 선택 지역을 기준으로 후보 장소를 가져온다.

예시:

```txt
홍대
성수
연남
강남
잠실
```

후보 Pool:

```txt
음식점
카페
전시
팝업
영화관
산책 장소
소품샵
포토부스
```

#### 2단계. Time & Availability Filtering

실시간성이 강한 조건을 먼저 처리한다.

```txt
현재 영업 중인가?
오늘 방문 가능한가?
전시/팝업 기간 안에 있는가?
영화 시간이 코스 흐름과 맞는가?
예약이 필요한가?
```

#### 3단계. Tag Matching

두 사용자의 취향 태그를 비교한다.

```txt
User A tags
User B tags
Intersection = 둘 다 좋아하는 것
Union = 둘 중 한 명이라도 좋아하는 것
Blocked = 한 명이라도 강하게 싫어하는 것
```

추천 반영 방식:

```txt
교집합 태그는 높은 가중치
합집합 태그는 중간 가중치
강한 비선호 태그는 감점 또는 제외
비공개 소곤파일의 태그는 추천에는 반영하되 이유는 숨김
```

#### 4단계. Cascade Scoring

후보 장소와 코스를 점수화한다.

예시 점수:

```txt
tagMatchScore
distanceScore
timeFitScore
courseFlowScore
noveltyScore
budgetScore
relationshipMoodScore
```

최종 점수 예시:

```txt
finalScore =
  tagMatchScore * 0.35
  + timeFitScore * 0.20
  + distanceScore * 0.15
  + courseFlowScore * 0.15
  + noveltyScore * 0.10
  + budgetScore * 0.05
```

#### 5단계. Fallback via Constraint Relaxation

결과가 부족하면 낮은 우선순위 조건부터 완화한다.

예시:

```txt
추천 후보가 3개 미만이면:
1. 낮은 우선순위 Soft Tag 제거
2. 검색 반경 확장
3. 합집합 태그 기반 후보 추가
4. 인기 장소/검증된 장소를 보조 후보로 추가
5. 코스 개수를 3개 → 2개로 축소
```

---

### 22.5 Sogon.zip에 맞는 추천 UX 원칙

추천 이유는 너무 직접적으로 말하지 않는다.

나쁜 예시:

```txt
상대가 매운 음식을 싫어해서 마라탕을 제외했어요.
```

좋은 예시:

```txt
두 분이 부담 없이 즐길 수 있는 코스로 골라봤어요.
```

또는:

```txt
서로의 취향을 조심스럽게 풀어봤어요.
```

비공개 소곤파일은 추천에 반영될 수 있지만, 그 내용 자체를 추천 설명에 노출하지 않는다.

```txt
사용자에게 보여줄 것: 추천 결과, 부드러운 이유, 코스 흐름
사용자에게 숨길 것: 상대의 비공개 파일 내용, 민감한 취향 원문
```

---

### 22.6 MVP 구현 범위

처음부터 완전한 AI 추천으로 만들 필요는 없다. MVP에서는 규칙 기반 추천으로도 충분하다.

MVP 추천 로직:

```txt
1. 지역 선택
2. 두 사람의 태그 불러오기
3. 금지/비선호 태그 제외
4. 교집합 태그 우선 매칭
5. 결과 부족 시 합집합 태그로 확장
6. 거리와 시간 조건으로 정렬
7. 추천.zip 형태로 2~3개 코스 제안
```

추후 확장:

```txt
클릭/저장/방문 피드백 기반 개인화
날씨 기반 추천
기념일 기반 추천
혼잡도 반영
LLM 기반 코스 설명 생성
카카오맵 API 기반 실시간 장소 후보 확장
팝업/전시/영화 API 연동
```

---

### 22.7 최종 판단

이 기술 조합은 Sogon.zip의 데이트 추천 문제와 잘 맞는다.

이유:

```txt
데이트 추천은 조건이 많아 과제약 상태가 자주 생긴다.
두 사람의 취향을 동시에 고려해야 한다.
비공개 취향을 추천에는 반영하되 직접 노출하면 안 된다.
실시간 장소/시간/기간 제약이 중요하다.
추천 결과가 없을 때 자연스럽게 차선책을 만들어야 한다.
```

따라서 Sogon.zip의 추천 시스템은 다음 방향으로 설계한다.

```txt
Hard Constraint로 현실 가능성을 보장하고,
Soft Constraint로 취향 만족도를 높이며,
Constraint Relaxation으로 결과 없음 문제를 해결하는
Cascade 기반 데이트 코스 추천 시스템.
```
