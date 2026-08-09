import { Env, handle, json, readJson, requireAdmin } from '../../_shared';
import {
  PLACE_COLUMNS,
  toPlace,
  validatePlace,
  type PlaceInput,
  type PlaceRow,
  type ValidatedPlace
} from './index';

async function loadPlace(env: Env, id: string) {
  const row = await env.DB.prepare(`SELECT ${PLACE_COLUMNS} FROM places WHERE id = ?`)
    .bind(id)
    .first<PlaceRow>();

  if (!row) {
    throw json({ error: '장소를 찾을 수 없어요.' }, { status: 404 });
  }

  return row;
}

/** 저장된 행을 validatePlace의 base 형태로 되돌린다. */
function toValidated(row: PlaceRow): ValidatedPlace {
  const place = toPlace(row);
  return {
    kind: row.kind,
    name: row.name,
    nameNormalized: row.name_normalized,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    geohash5: row.geohash5,
    areaCode: row.area_code,
    priceLevel: row.price_level,
    isIndoor: place.isIndoor,
    tags: place.tags,
    openingHours: place.openingHours,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    openedAt: row.opened_at,
    status: row.status as ValidatedPlace['status'],
    infoConfidence: row.info_confidence
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  await requireAdmin(request, env);
  return json({ place: toPlace(await loadPlace(env, String(params.id))) });
});

export const onRequestPatch: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  await requireAdmin(request, env);

  const id = String(params.id);
  const existing = await loadPlace(env, id);
  const input = await readJson<PlaceInput>(request);

  // 이름·좌표가 바뀌면 병합 키(name_normalized, geohash5)와 신뢰도가 함께 재계산된다.
  const place = validatePlace(input, toValidated(existing));
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE places SET
       kind = ?, name = ?, name_normalized = ?, address = ?, lat = ?, lng = ?, geohash5 = ?,
       area_code = ?, price_level = ?, is_indoor = ?, tags_json = ?, opening_hours_json = ?,
       starts_at = ?, ends_at = ?, opened_at = ?, info_confidence = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
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
    now,
    id
  ).run();

  return json({ place: toPlace(await loadPlace(env, id)) });
});

/**
 * 장소는 물리 삭제하지 않는다. recommendation_impressions가 이 행을 참조하고 있고,
 * 그 로그가 학습 데이터다. 팝업이 끝났다고 과거 추천 기록까지 사라지면 안 된다.
 */
export const onRequestDelete: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  await requireAdmin(request, env);

  const id = String(params.id);
  const result = await env.DB.prepare(
    "UPDATE places SET status = 'closed', updated_at = ? WHERE id = ? AND status != 'closed'"
  ).bind(new Date().toISOString(), id).run();

  if (result.meta.changes === 0) {
    // 이미 닫혀 있어도 404로 보이면 운영자가 혼란스럽다. 존재 여부를 확인해 구분한다.
    await loadPlace(env, id);
  }

  return json({ ok: true, status: 'closed' });
});
