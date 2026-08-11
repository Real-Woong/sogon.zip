/**
 * 장소의 성격을 **하나의 통제된 어휘**로 표현한다.
 *
 * 두 수집 소스가 서로 다른 말을 쓴다. TourAPI는 "미술관/화랑", 서울 문화행사는
 * "전시/미술"이라고 부르는데 둘은 같은 걸 가리킨다. 태그를 원문 그대로 두면
 * 슬롯을 채울 때 둘이 절대 만나지 않는다. 그래서 소스별 원문을 여기서
 * `genre:art` 하나로 접는다.
 *
 * 접두사를 붙이는 이유는 기계가 읽는 값과 사람이 읽는 값을 한 배열에 같이
 * 두기 위해서다. `tags_json`에는 `genre:art`(매칭용)와 `미술관/화랑`(표시용)이
 * 함께 들어간다. 컬럼을 새로 만들지 않으니 마이그레이션이 필요 없다.
 *
 * **모르는 코드에는 태그를 붙이지 않는다.** 억지로 어딘가에 넣으면 그 장소는
 * 영영 잘못된 슬롯에 들어간다. 안 붙이면 후보에서 빠질 뿐이고, 백필 스크립트가
 * 매번 "매핑 없음"으로 보고한다. `shared/openingHours.ts`가 모름을 열림으로
 * 접지 않는 것과 같은 이유다.
 */

/** 음식 계열. `kind`가 restaurant·cafe인 장소에만 붙는다. */
export type Cuisine = 'korean' | 'western' | 'japanese' | 'chinese' | 'other' | 'cafe';

/**
 * 활동 계열. 슬롯을 채울 때 "무엇을 하는 곳인가"를 가른다.
 * 값 하나하나가 슬롯 배치나 다양성 판정을 바꿀 때만 추가한다.
 */
export type Genre =
  | 'art'
  | 'history'
  | 'performance'
  | 'hands_on'
  | 'shopping'
  | 'nature'
  | 'sports'
  | 'landmark'
  | 'festival'
  | 'reading'
  | 'theme_park';

/** 요금. **모르면 붙이지 않는다.** 없음은 "유료"가 아니라 "미상"이다. */
export type Fee = 'free' | 'paid';

/**
 * 대상. 데이트 코스에서는 대개 **감점 신호**다 —
 * 어린이 문화행사는 두 사람의 하루에 넣을 자리가 아니다.
 */
export type Audience = 'kids' | 'seniors' | 'family' | 'women';

export const FACET_PREFIXES = ['cuisine', 'genre', 'fee', 'audience'] as const;
export type FacetPrefix = (typeof FACET_PREFIXES)[number];

/** `genre:art` 형태의 문자열 하나. */
export type Facet = string;

export function facet(prefix: FacetPrefix, value: string): Facet {
  return `${prefix}:${value}`;
}

/** 태그 배열에서 한 접두사의 값만 꺼낸다. 없으면 빈 배열. */
export function facetValues(tags: readonly string[], prefix: FacetPrefix): string[] {
  const head = `${prefix}:`;
  return tags.filter(tag => tag.startsWith(head)).map(tag => tag.slice(head.length));
}

/** 접두사가 붙은 값만 골라낸다. 표시용 원문 라벨과 구분할 때 쓴다. */
export function isFacet(tag: string): boolean {
  return FACET_PREFIXES.some(prefix => tag.startsWith(`${prefix}:`));
}

// ---------------------------------------------------------------- TourAPI

/**
 * TourAPI 3단계 분류(`cat3`) → 음식 계열.
 * 코드로 건다. 이름은 바뀔 수 있지만 코드는 안 바뀐다.
 */
export const TOUR_CAT3_CUISINE: Readonly<Record<string, Cuisine>> = {
  A05020100: 'korean', // 한식
  A05020200: 'western', // 서양식
  A05020300: 'japanese', // 일식
  A05020400: 'chinese', // 중식
  A05020700: 'other', // 이색음식점
  A05020900: 'cafe' // 카페/전통찻집
};

/**
 * TourAPI 3단계 분류(`cat3`) → 활동 계열.
 *
 * 일부러 비워둔 코드가 있다. 아래는 데이트 코스에 넣을 장르가 없는 것들이라
 * 억지로 매핑하지 않는다.
 *   A02020400 이색찜질방 · A02040800 기타 · A02061100 문화전수시설
 *   A02061400 학교 · A02060700 문화원 · A02060800 외국문화원
 */
export const TOUR_CAT3_GENRE: Readonly<Record<string, Genre>> = {
  // A01 자연
  A01010400: 'nature', // 산
  A01010500: 'nature', // 자연생태관광지
  A01010900: 'nature', // 계곡
  A01011800: 'nature', // 강
  A01020200: 'nature', // 기암괴석

  // A0201 역사
  A02010100: 'history', // 고궁
  A02010200: 'history', // 성
  A02010300: 'history', // 문
  A02010400: 'history', // 고택
  A02010500: 'history', // 생가
  A02010600: 'history', // 민속마을
  A02010700: 'history', // 유적지/사적지
  A02010800: 'history', // 사찰
  A02010900: 'history', // 종교성지

  // A0202 휴양
  A02020200: 'landmark', // 관광단지
  A02020500: 'sports', // 헬스투어
  A02020600: 'theme_park', // 테마공원
  A02020700: 'nature', // 공원

  // A0203 체험
  A02030100: 'hands_on', // 농.산.어촌 체험
  A02030200: 'hands_on', // 전통체험
  A02030400: 'hands_on', // 이색체험
  A02030600: 'landmark', // 이색거리 — 걸으면서 보는 곳

  // A0205 건축·조형물
  A02050100: 'landmark', // 다리/대교
  A02050200: 'landmark', // 기념탑/기념비/전망대
  A02050400: 'landmark', // 동상
  A02050600: 'landmark', // 유명건물

  // A0206 문화시설
  A02060100: 'history', // 박물관
  A02060200: 'history', // 기념관
  A02060300: 'art', // 전시관
  A02060500: 'art', // 미술관/화랑
  A02060600: 'performance', // 공연장
  A02060900: 'reading', // 도서관
  A02061000: 'reading', // 대형서점

  // A03 레포츠 — 트래킹도 여기 둔다. 산을 타는 건 60분 산책 슬롯이 아니다
  A03020200: 'sports', // 수련시설
  A03020300: 'sports', // 경기장
  A03021300: 'sports', // 스케이트
  A03021600: 'sports', // 사격장
  A03021800: 'sports', // 암벽등반
  A03022700: 'sports', // 트래킹
  A03030400: 'sports', // 스노쿨링/스킨스쿠버다이빙
  A03030700: 'sports', // 수영
  A03050100: 'sports', // 복합 레포츠

  // A04 쇼핑
  A04010200: 'shopping', // 상설시장
  A04010300: 'shopping', // 백화점
  A04010600: 'shopping', // 전문매장/상가
  A04010700: 'hands_on', // 공예/공방 — 사는 게 아니라 만드는 곳이다
  A04011200: 'shopping' // 스키(보드) 렌탈샵
};

/**
 * `kind`가 잘못 붙은 코드.
 *
 * `toKind()`가 cat1이 A01(자연)일 때만 park을 준다. 그런데 **공원은 A02**에
 * 들어 있어서 26건이 activity로 저장됐다. 산책 슬롯은 `kind='park'`만 찾으므로
 * 지금 산책에 쓸 수 있는 장소가 서울 전체에 7곳뿐이다.
 *
 * 테마공원은 넣지 않는다. 놀이공원은 60분 산책이 아니라 하루짜리 활동이다.
 */
export const TOUR_CAT3_PARK: readonly string[] = ['A02020700'];

type TourRow = {
  cat1?: unknown;
  cat3?: unknown;
  contenttypeid?: unknown;
};

/** TourAPI 원본 행에서 패싯을 뽑는다. 못 읽으면 빈 배열. */
export function facetsFromTourApi(raw: TourRow): Facet[] {
  const cat3 = typeof raw.cat3 === 'string' ? raw.cat3.trim() : '';
  if (cat3.length === 0) return [];

  const cuisine = TOUR_CAT3_CUISINE[cat3];
  if (cuisine) return [facet('cuisine', cuisine)];

  const genre = TOUR_CAT3_GENRE[cat3];
  return genre ? [facet('genre', genre)] : [];
}

export type PlaceKind = 'restaurant' | 'cafe' | 'exhibition' | 'park' | 'activity';

/**
 * TourAPI 원본 행 → `places.kind`.
 *
 * `contentTypeId`만으로는 카페와 밥집이 안 갈린다. A0502xx가 음식 분류이고
 * 그 안에서 A05020900이 카페·전통찻집이다.
 *
 * **공원을 cat1으로만 찾으면 안 된다.** TourAPI는 "공원"을 A02(인문) 밑에
 * 두는데 여기서 A01(자연)만 보면 26곳을 놓친다. 산책 슬롯은 `kind='park'`만
 * 찾으므로, 놓치면 서울 전체에서 산책할 곳이 7군데가 된다.
 *
 * 수집기에 두면 회귀 테스트가 못 잡는다. 그래서 여기 있다.
 */
export function kindFromTourApi(raw: TourRow): PlaceKind {
  const typeId = String(raw.contenttypeid ?? '');
  const cat1 = typeof raw.cat1 === 'string' ? raw.cat1.trim() : '';
  const cat3 = typeof raw.cat3 === 'string' ? raw.cat3.trim() : '';

  if (typeId === '39') return cat3 === 'A05020900' ? 'cafe' : 'restaurant';
  if (typeId === '14') return 'exhibition';
  if (TOUR_CAT3_PARK.includes(cat3)) return 'park';
  if (typeId === '12') return cat1 === 'A01' ? 'park' : 'activity'; // A01 = 자연
  return 'activity'; // 28 레포츠, 38 쇼핑
}

/** 실내 여부. 레포츠·쇼핑은 섞여 있어서 `null`(미상)이다. */
export function isIndoorForKind(kind: PlaceKind): boolean | null {
  if (kind === 'park') return false;
  if (kind === 'cafe' || kind === 'restaurant' || kind === 'exhibition') return true;
  return null;
}

// ---------------------------------------------------------------- 서울 문화행사

/** `CODENAME` → 활동 계열. "기타"는 매핑하지 않는다 — 원문이 이미 모른다고 말한다. */
export const SEOUL_CODENAME_GENRE: Readonly<Record<string, Genre>> = {
  '교육/체험': 'hands_on',
  '전시/미술': 'art',
  클래식: 'performance',
  콘서트: 'performance',
  연극: 'performance',
  국악: 'performance',
  '뮤지컬/오페라': 'performance',
  무용: 'performance',
  '독주/독창회': 'performance',
  영화: 'performance',
  '축제-문화/예술': 'festival',
  '축제-기타': 'festival',
  '축제-전통/역사': 'festival',
  '축제-관광/체육': 'festival',
  '축제-자연/경관': 'festival'
};

/** `THEMECODE` → 대상. */
export const SEOUL_THEMECODE_AUDIENCE: Readonly<Record<string, Audience>> = {
  '어린이/청소년 문화행사': 'kids',
  '어르신 문화행사': 'seniors',
  '가족 문화행사': 'family',
  '여성 문화행사': 'women'
};

type SeoulRow = {
  CODENAME?: unknown;
  THEMECODE?: unknown;
  IS_FREE?: unknown;
};

/** 서울 문화행사 원본 행에서 패싯을 뽑는다. */
export function facetsFromSeoulCulture(raw: SeoulRow): Facet[] {
  const facets: Facet[] = [];

  const codename = typeof raw.CODENAME === 'string' ? raw.CODENAME.trim() : '';
  const genre = SEOUL_CODENAME_GENRE[codename];
  if (genre) facets.push(facet('genre', genre));

  const themecode = typeof raw.THEMECODE === 'string' ? raw.THEMECODE.trim() : '';
  const audience = SEOUL_THEMECODE_AUDIENCE[themecode];
  if (audience) facets.push(facet('audience', audience));

  // 빈 문자열은 "모름"이다. 유료로 접지 않는다.
  const isFree = typeof raw.IS_FREE === 'string' ? raw.IS_FREE.trim() : '';
  if (isFree === '무료') facets.push(facet('fee', 'free'));
  else if (isFree === '유료') facets.push(facet('fee', 'paid'));

  return facets;
}

// ---------------------------------------------------------------- 병합

/**
 * 기존 태그에 패싯을 얹는다. 순서는 패싯 먼저, 그 다음 원문 라벨.
 *
 * 원문 라벨을 지우지 않는 이유는 그게 운영자 화면에 그대로 보이는 값이고,
 * 나중에 매핑을 고칠 때 "원래 뭐였는지"를 남겨두는 게 낫기 때문이다.
 * 같은 패싯을 두 번 붙이지 않도록 기존 패싯은 걷어내고 다시 계산한 걸 넣는다.
 */
export function mergeFacets(existing: readonly string[], facets: readonly Facet[]): string[] {
  const labels = existing.filter(tag => !isFacet(tag));
  return [...new Set([...facets, ...labels])];
}
