/**
 * 운영자 장소 큐레이션. 팝업스토어는 공개 API가 없어서 초기 데이터는 사람이 넣는다.
 * 배치 ingest가 붙어도 이 경로는 남는다 — 자동 수집이 못 잡는 팝업이 계속 생긴다.
 *
 * 설계 배경: docs/date-recommendation-v2-ai.md
 */
import { all, Env, handle, json, newId, readJson, requireAdmin } from '../../_shared';
import {
  computeInfoConfidence,
  dateRangesOverlap,
  geohashEncode,
  geohashWithNeighbors,
  haversineMeters,
  isPlaceKind,
  normalizePlaceName,
  PLACE_KINDS,
  RECALL_GEOHASH_PRECISION,
  type PlaceKind
} from '../../../../../shared/placeNormalize';

/** 이 거리 안에서 정규화 상호가 같으면 같은 장소로 본다. */
const SAME_PLACE_METERS = 50;

/** 같은 상호지만 더 멀리 있으면 지점일 수도, 중복일 수도 있어 사람이 판단한다. */
const MERGE_REVIEW_METERS = 2_000;

const PLACE_STATUSES = ['active', 'closed', 'hidden', 'pending_review'] as const;
type PlaceStatus = (typeof PLACE_STATUSES)[number];

export type PlaceRow = {
  id: string;
  kind: PlaceKind;
  name: string;
  name_normalized: string;
  address: string | null;
  lat: number;
  lng: number;
  geohash5: string;
  area_code: string | null;
  price_level: number | null;
  is_indoor: number | null;
  tags_json: string;
  opening_hours_json: string | null;
  starts_at: string | null;
  ends_at: string | null;
  opened_at: string | null;
  popularity: number | null;
  info_confidence: number;
  status: string;
  curated_by: string | null;
  created_at: string;
  updated_at: string;
};

export function toPlace(row: PlaceRow) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    areaCode: row.area_code,
    priceLevel: row.price_level,
    isIndoor: row.is_indoor === null ? null : row.is_indoor === 1,
    tags: parseTags(row.tags_json),
    openingHours: row.opening_hours_json ? safeParse(row.opening_hours_json) : null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    openedAt: row.opened_at,
    popularity: row.popularity,
    infoConfidence: row.info_confidence,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseTags(value: string): string[] {
  const parsed = safeParse(value);
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
}

export const PLACE_COLUMNS = `id, kind, name, name_normalized, address, lat, lng, geohash5,
  area_code, price_level, is_indoor, tags_json, opening_hours_json, starts_at, ends_at,
  opened_at, popularity, info_confidence, status, curated_by, created_at, updated_at`;

// -- 입력 검증 --------------------------------------------------------------

export type PlaceInput = {
  kind?: string;
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  areaCode?: string | null;
  priceLevel?: number | null;
  isIndoor?: boolean | null;
  tags?: string[];
  openingHours?: unknown;
  startsAt?: string | null;
  endsAt?: string | null;
  openedAt?: string | null;
  status?: string;
};

export type ValidatedPlace = {
  kind: PlaceKind;
  name: string;
  nameNormalized: string;
  address: string | null;
  lat: number;
  lng: number;
  geohash5: string;
  areaCode: string | null;
  priceLevel: number | null;
  isIndoor: boolean | null;
  tags: string[];
  openingHours: unknown;
  startsAt: string | null;
  endsAt: string | null;
  openedAt: string | null;
  status: PlaceStatus;
  infoConfidence: number;
};

function isIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * 부분 수정(PATCH)도 같은 규칙을 타야 하므로 기존 값을 base로 받는다.
 * 좌표나 이름이 바뀌면 병합 키와 신뢰도를 반드시 다시 계산한다.
 */
export function validatePlace(input: PlaceInput, base?: ValidatedPlace): ValidatedPlace {
  const kindRaw = input.kind ?? base?.kind;
  if (!isPlaceKind(kindRaw)) {
    throw json(
      { error: `장소 종류는 ${PLACE_KINDS.join(', ')} 중 하나여야 해요.` },
      { status: 400 }
    );
  }

  const name = (input.name ?? base?.name ?? '').trim();
  if (!name) {
    throw json({ error: '장소 이름을 입력해주세요.' }, { status: 400 });
  }

  const nameNormalized = normalizePlaceName(name);
  if (!nameNormalized) {
    throw json({ error: '장소 이름에 글자가 포함돼야 해요.' }, { status: 400 });
  }

  const lat = input.lat ?? base?.lat;
  const lng = input.lng ?? base?.lng;
  if (typeof lat !== 'number' || Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw json({ error: '위도(lat)가 올바르지 않아요.' }, { status: 400 });
  }
  if (typeof lng !== 'number' || Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw json({ error: '경도(lng)가 올바르지 않아요.' }, { status: 400 });
  }

  const priceLevel = input.priceLevel === undefined ? base?.priceLevel ?? null : input.priceLevel;
  if (priceLevel !== null && (!Number.isInteger(priceLevel) || priceLevel < 1 || priceLevel > 4)) {
    throw json({ error: '가격대(priceLevel)는 1~4 사이 정수여야 해요.' }, { status: 400 });
  }

  const startsAt = input.startsAt === undefined ? base?.startsAt ?? null : input.startsAt;
  const endsAt = input.endsAt === undefined ? base?.endsAt ?? null : input.endsAt;
  for (const [label, value] of [['시작일', startsAt], ['종료일', endsAt]] as const) {
    if (value !== null && !isIsoDate(value)) {
      throw json({ error: `${label} 형식이 올바르지 않아요.` }, { status: 400 });
    }
  }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw json({ error: '종료일이 시작일보다 빠를 수 없어요.' }, { status: 400 });
  }

  const statusRaw = input.status ?? base?.status ?? 'active';
  if (!(PLACE_STATUSES as readonly string[]).includes(statusRaw)) {
    throw json({ error: '알 수 없는 상태예요.' }, { status: 400 });
  }

  const tags = (input.tags ?? base?.tags ?? [])
    .map(tag => String(tag).trim())
    .filter(tag => tag.length > 0);

  const openingHours = input.openingHours === undefined ? base?.openingHours ?? null : input.openingHours;
  const address = (input.address === undefined ? base?.address ?? null : input.address) || null;
  const isIndoor = input.isIndoor === undefined ? base?.isIndoor ?? null : input.isIndoor;

  return {
    kind: kindRaw,
    name,
    nameNormalized,
    address,
    lat,
    lng,
    geohash5: geohashEncode(lat, lng, RECALL_GEOHASH_PRECISION),
    areaCode: (input.areaCode === undefined ? base?.areaCode ?? null : input.areaCode) || null,
    priceLevel,
    isIndoor,
    tags,
    openingHours,
    startsAt,
    endsAt,
    openedAt: input.openedAt === undefined ? base?.openedAt ?? null : input.openedAt,
    status: statusRaw as PlaceStatus,
    infoConfidence: computeInfoConfidence({
      kind: kindRaw,
      address,
      priceLevel,
      isIndoor,
      tags,
      openingHours,
      startsAt,
      endsAt
    })
  };
}

// -- 중복 탐지 --------------------------------------------------------------

/**
 * 병합 후보를 찾는다. 키는 세 축이다 — 정규화 상호 + 좌표 + 기간 겹침.
 * (`../../../../../docs/date-course-data-strategy.md` §4)
 *
 * 이웃 격자까지 훑는 이유: 격자 하나만 보면 셀 경계 건너편의 같은 장소를 놓친다.
 * 기간을 보는 이유: 같은 극장의 다음 달 공연은 같은 이름·같은 좌표여도 다른 것이다.
 */
export async function findNameMatches(env: Env, place: ValidatedPlace, excludeId?: string) {
  const cells = geohashWithNeighbors(place.geohash5);
  const placeholders = cells.map(() => '?').join(', ');

  const rows = await all<
    Pick<PlaceRow, 'id' | 'name' | 'lat' | 'lng' | 'status' | 'starts_at' | 'ends_at'>
  >(
    env.DB.prepare(
      `SELECT id, name, lat, lng, status, starts_at, ends_at
         FROM places
        WHERE name_normalized = ?
          AND geohash5 IN (${placeholders})
          AND id != ?`
    ).bind(place.nameNormalized, ...cells, excludeId ?? '')
  );

  return rows
    .filter(row => dateRangesOverlap(place, { startsAt: row.starts_at, endsAt: row.ends_at }))
    .map(row => ({ ...row, distance: haversineMeters(place, row) }))
    .sort((a, b) => a.distance - b.distance);
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  await requireAdmin(request, env);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const kind = url.searchParams.get('kind');
  const query = url.searchParams.get('q')?.trim();
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (status) {
    conditions.push('status = ?');
    bindings.push(status);
  }
  if (kind) {
    conditions.push('kind = ?');
    bindings.push(kind);
  }
  if (query) {
    conditions.push('name_normalized LIKE ?');
    bindings.push(`%${normalizePlaceName(query)}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await all<PlaceRow>(
    env.DB.prepare(
      `SELECT ${PLACE_COLUMNS} FROM places ${where} ORDER BY updated_at DESC LIMIT ?`
    ).bind(...bindings, limit)
  );

  return json({ places: rows.map(toPlace) });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  const place = validatePlace(await readJson<PlaceInput>(request));

  const matches = await findNameMatches(env, place);

  // 50m 안에 같은 상호가 있으면 같은 장소다. 새로 만들지 않고 기존 것을 알려준다.
  const duplicate = matches.find(match => match.distance <= SAME_PLACE_METERS);
  if (duplicate) {
    return json(
      {
        error: '이미 등록된 장소예요.',
        existingPlaceId: duplicate.id,
        distanceMeters: duplicate.distance
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const id = newId('place');

  const statements = [
    env.DB.prepare(
      `INSERT INTO places
         (id, kind, name, name_normalized, address, lat, lng, geohash5, area_code,
          price_level, is_indoor, tags_json, opening_hours_json, starts_at, ends_at,
          opened_at, popularity, info_confidence, status, curated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      place.kind,
      place.name,
      place.nameNormalized,
      place.address,
      place.lat,
      place.lng,
      place.geohash5,
      place.areaCode,
      place.priceLevel,
      place.isIndoor === null ? null : place.isIndoor ? 1 : 0,
      JSON.stringify(place.tags),
      place.openingHours === null ? null : JSON.stringify(place.openingHours),
      place.startsAt,
      place.endsAt,
      place.openedAt,
      place.infoConfidence,
      place.status,
      admin.id,
      now,
      now
    ),
    // 수동 입력도 출처를 남긴다. 나중에 배치가 같은 장소를 가져왔을 때
    // 사람이 넣은 값을 덮어쓸지 판단하려면 출처가 있어야 한다.
    env.DB.prepare(
      'INSERT INTO place_sources (id, place_id, source, external_id, raw_json, fetched_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(newId('src'), id, 'manual', id, null, now)
  ];

  // 같은 상호가 걸어갈 만한 거리에 있으면 지점인지 중복인지 사람이 본다.
  for (const match of matches.filter(item => item.distance <= MERGE_REVIEW_METERS)) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO place_merge_reviews
           (id, place_id, candidate_place_id, similarity, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      ).bind(
        newId('merge'),
        id,
        match.id,
        Math.round((1 - match.distance / MERGE_REVIEW_METERS) * 100) / 100,
        now
      )
    );
  }

  await env.DB.batch(statements);

  const row = await env.DB.prepare(`SELECT ${PLACE_COLUMNS} FROM places WHERE id = ?`)
    .bind(id)
    .first<PlaceRow>();

  return json(
    {
      place: row ? toPlace(row) : null,
      mergeReviewCount: statements.length - 2
    },
    { status: 201 }
  );
});
