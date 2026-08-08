/**
 * 추천 대상(places) 정규화 규칙. 운영자 수동 큐레이션과 배치 ingest가 함께 쓴다.
 *
 * 이 파일이 "같은 장소인가"를 판단하는 단일 소스다. 수동 입력과 배치 수집이
 * 각자 다른 규칙으로 정규화하면 같은 장소가 두 행으로 갈라져 중복 추천이 된다.
 *
 * 외부 API 의존이 없는 순수 함수만 둔다. DB나 fetch가 필요한 로직은 여기 넣지 않는다.
 */

export type PlaceKind = 'restaurant' | 'cafe' | 'exhibition' | 'popup' | 'activity' | 'park';

export const PLACE_KINDS: PlaceKind[] = [
  'restaurant',
  'cafe',
  'exhibition',
  'popup',
  'activity',
  'park'
];

/** 기간이 정해져 있는 게 정상인 종류. 종료일 없이 들어오면 검토 대상이다. */
export const TIME_BOUND_KINDS: PlaceKind[] = ['popup', 'exhibition'];

export type PreferenceAxis = 'food' | 'activity' | 'mood' | 'budget' | 'travel' | 'time' | 'gift';

export const PREFERENCE_AXES: PreferenceAxis[] = [
  'food',
  'activity',
  'mood',
  'budget',
  'travel',
  'time',
  'gift'
];

export function isPlaceKind(value: unknown): value is PlaceKind {
  return typeof value === 'string' && (PLACE_KINDS as string[]).includes(value);
}

export function isPreferenceAxis(value: unknown): value is PreferenceAxis {
  return typeof value === 'string' && (PREFERENCE_AXES as string[]).includes(value);
}

// -- 상호명 정규화 ----------------------------------------------------------

/**
 * 지점 표기는 소스마다 제각각이라("성수티하우스 성수점", "성수 티하우스(2호점)")
 * 병합 키에서 떼어낸다. 다만 상호 전체가 지점 표기뿐이면 이름이 사라지므로
 * 앞에 다른 토큰이 남아 있을 때만 제거한다.
 */
const BRANCH_SUFFIX = /\s*\S{1,10}(점|지점)$/;

/**
 * 병합 판단용 키를 만든다. 사람에게 보여주는 이름은 places.name에 원본 그대로 남기고,
 * 이 값은 places.name_normalized에만 쓴다.
 */
export function normalizePlaceName(raw: string): string {
  let value = raw.normalize('NFKC').trim();

  // 괄호 안 부연설명 제거: "성수 티하우스 (성수점)" → "성수 티하우스"
  value = value.replace(/[([{][^)\]}]*[)\]}]/g, ' ').trim();

  // 지점 표기 제거. 남는 토큰이 있을 때만.
  const withoutBranch = value.replace(BRANCH_SUFFIX, '').trim();
  if (withoutBranch.length > 0) {
    value = withoutBranch;
  }

  // 공백·문장부호를 모두 없앤다. 소스마다 띄어쓰기가 달라서 그대로 두면 병합이 안 된다.
  value = value.replace(/[\s··,.'"`~!@#$%^&*\-_=+/\\|:;?]/g, '');

  return value.toLowerCase();
}

// -- 지오해시 ---------------------------------------------------------------

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** 후보 생성에 쓰는 격자 정밀도. 5자리는 대략 5km × 5km다. */
export const RECALL_GEOHASH_PRECISION = 5;

export function geohashEncode(lat: number, lng: number, precision = RECALL_GEOHASH_PRECISION): string {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  let hash = '';
  let bits = 0;
  let bitCount = 0;
  let useLng = true;

  while (hash.length < precision) {
    if (useLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        bits = (bits << 1) + 1;
        lngMin = mid;
      } else {
        bits = bits << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        bits = (bits << 1) + 1;
        latMin = mid;
      } else {
        bits = bits << 1;
        latMax = mid;
      }
    }

    useLng = !useLng;
    bitCount += 1;

    if (bitCount === 5) {
      hash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return hash;
}

type Direction = 'top' | 'bottom' | 'left' | 'right';
type Parity = 'even' | 'odd';

const NEIGHBOR_TABLE: Record<Direction, Record<Parity, string>> = {
  right: { even: 'bc01fg45238967deuvhjyznpkmstqrwx', odd: 'p0r21436x8zb9dcf5h7kjnmqesgutwvy' },
  left: { even: '238967debc01fg45kmstqrwxuvhjyznp', odd: '14365h7k9dcfesgujnmqp0r2twvyx8zb' },
  top: { even: 'p0r21436x8zb9dcf5h7kjnmqesgutwvy', odd: 'bc01fg45238967deuvhjyznpkmstqrwx' },
  bottom: { even: '14365h7k9dcfesgujnmqp0r2twvyx8zb', odd: '238967debc01fg45kmstqrwxuvhjyznp' }
};

const BORDER_TABLE: Record<Direction, Record<Parity, string>> = {
  right: { even: 'bcfguvyz', odd: 'prxz' },
  left: { even: '0145hjnp', odd: '028b' },
  top: { even: 'prxz', odd: 'bcfguvyz' },
  bottom: { even: '028b', odd: '0145hjnp' }
};

function adjacent(hash: string, direction: Direction): string {
  const last = hash.charAt(hash.length - 1);
  const parity: Parity = hash.length % 2 === 0 ? 'even' : 'odd';
  let base = hash.slice(0, -1);

  if (base.length > 0 && BORDER_TABLE[direction][parity].includes(last)) {
    base = adjacent(base, direction);
  }

  return base + BASE32[NEIGHBOR_TABLE[direction][parity].indexOf(last)];
}

/**
 * 지오해시 셀 하나만 조회하면 셀 경계 바로 건너편(수십 m)에 있는 장소가 후보에서
 * 통째로 빠진다. 후보 생성은 항상 자기 셀 + 8방향 이웃을 함께 조회해야 한다.
 */
export function geohashWithNeighbors(hash: string): string[] {
  const top = adjacent(hash, 'top');
  const bottom = adjacent(hash, 'bottom');

  return [
    hash,
    top,
    bottom,
    adjacent(hash, 'left'),
    adjacent(hash, 'right'),
    adjacent(top, 'left'),
    adjacent(top, 'right'),
    adjacent(bottom, 'left'),
    adjacent(bottom, 'right')
  ];
}

/** 출발지 좌표로 후보 생성 격자 목록을 만든다. */
export function recallCells(lat: number, lng: number): string[] {
  return geohashWithNeighbors(geohashEncode(lat, lng, RECALL_GEOHASH_PRECISION));
}

// -- 거리 -------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;

/** 직선 거리(m). 실제 이동 시간은 아니고, 하드 필터의 1차 컷과 동선 계산에 쓴다. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

// -- 정보 신뢰도 ------------------------------------------------------------

export type PlaceFacts = {
  kind: PlaceKind;
  address?: string | null;
  priceLevel?: number | null;
  isIndoor?: boolean | null;
  tags?: string[];
  openingHours?: unknown;
  startsAt?: string | null;
  endsAt?: string | null;
};

/**
 * places.info_confidence. v1 점수식의 "장소 정보 신뢰도" 항에 그대로 들어간다.
 *
 * 정보가 비어 있는 장소를 낮게 보는 이유는 품질이 나빠서가 아니라, 하드 필터를
 * 적용할 수 없어서다. 영업시간을 모르면 "지금 문 열었나"를 보장할 수 없으므로
 * 확신을 갖고 추천할 수 없다.
 */
export function computeInfoConfidence(facts: PlaceFacts): number {
  let score = 0;

  if (facts.address && facts.address.trim().length > 0) score += 0.2;
  if (typeof facts.priceLevel === 'number') score += 0.2;
  if (typeof facts.isIndoor === 'boolean') score += 0.1;
  if (facts.tags && facts.tags.length > 0) score += 0.2;
  if (facts.openingHours) score += 0.2;

  // 팝업·전시는 기간이 정보의 핵심이다. 종료일이 없으면 이미 끝난 행사를
  // 추천할 위험이 있으므로 나머지가 다 채워져도 만점을 주지 않는다.
  if (TIME_BOUND_KINDS.includes(facts.kind)) {
    if (facts.endsAt) {
      score += 0.1;
    } else {
      score = Math.min(score, 0.5);
    }
  } else {
    score += 0.1;
  }

  return Math.round(Math.min(1, score) * 100) / 100;
}

/** 기간 한정 장소가 기준 시각에 아직 유효한지. 상시 장소는 항상 true. */
export function isPlaceLive(
  facts: Pick<PlaceFacts, 'startsAt' | 'endsAt'>,
  now: Date = new Date()
): boolean {
  const at = now.getTime();

  if (facts.startsAt && new Date(facts.startsAt).getTime() > at) {
    return false;
  }
  if (facts.endsAt && new Date(facts.endsAt).getTime() < at) {
    return false;
  }
  return true;
}
