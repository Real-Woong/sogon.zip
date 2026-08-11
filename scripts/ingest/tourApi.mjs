/**
 * 한국관광공사 TourAPI(KorService2) 수집. 상권 좌표 기준 반경 조회.
 *
 *   yarn node scripts/ingest/tourApi.mjs              # 분석만 (기본)
 *   yarn node scripts/ingest/tourApi.mjs --apply      # 실제로 D1에 적재
 *   yarn node scripts/ingest/tourApi.mjs --radius 3000
 *
 * 서울 문화행사(`seoulCulture.mjs`)가 공연·전시만 주는 것과 달리 여기서는
 * 음식점·카페·관광지가 나온다. 코스는 "전시 → 도보 12분 → 카페"라서 사이를
 * 채울 장소가 없으면 애초에 만들어지지 않는다.
 *
 * 두 가지가 함정이었다. 둘 다 증상이 403/400이라 원인이 안 보인다.
 *   1. KorService1은 폐지됐다. KorService2를 쓴다.
 *   2. 포털이 주는 키는 URL 인코딩된 상태다. 그대로 쿼리에 넣으면 이중
 *      인코딩돼서 403이 난다. decodeURIComponent를 한 번 거쳐야 한다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { AREAS, DEFAULT_RADIUS_M, findArea } from './areas.mjs';
import { maskKey, requireKey } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'sogonzip-tour-'));

const SOURCE = 'tourapi';
const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const PAGE_SIZE = 100;

/**
 * 수집할 콘텐츠 타입.
 *   15 축제공연행사 — 서울 문화행사가 이미 덮고 있고, 이 조회로는 행사 기간이
 *      안 나온다. 종료일 없이 넣으면 끝난 행사를 추천하게 된다.
 *   25 여행코스   — 장소가 아니라 코스다. 우리가 코스를 만드는 쪽이다.
 *   32 숙박       — 하루를 넘어가는 일정은 아직 다루지 않는다 (`05-open-questions.md` Q12).
 */
const CONTENT_TYPES = {
  12: '관광지',
  14: '문화시설',
  28: '레포츠',
  38: '쇼핑',
  39: '음식점'
};

// ---------------------------------------------------------------- 인자

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const radiusM = (() => {
  const at = argv.indexOf('--radius');
  return at >= 0 ? Number(argv[at + 1]) : DEFAULT_RADIUS_M;
})();

// ---------------------------------------------------------------- shared/

async function bundleShared(name) {
  const outfile = join(work, `${name}.mjs`);
  execFileSync(
    join(root, 'node_modules/.bin/esbuild'),
    [
      join(root, `shared/${name}.ts`),
      '--bundle',
      '--format=esm',
      '--platform=neutral',
      '--log-level=error',
      `--outfile=${outfile}`
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  return import(pathToFileURL(outfile).href);
}

async function loadShared() {
  const [normalize, facets] = await Promise.all([
    bundleShared('placeNormalize'),
    bundleShared('placeFacets')
  ]);
  return { ...normalize, ...facets };
}

// ---------------------------------------------------------------- 값 변환

// `kind`·실내 여부·패싯은 전부 `shared/placeFacets.ts`에 있다.
// 여기 두면 회귀 테스트가 못 잡는다 (`03-decisions.md` #28).

// ---------------------------------------------------------------- 수집

async function fetchList(key, { lat, lng, typeId, page }) {
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'sogonzip',
    _type: 'json',
    arrange: 'A',
    mapX: String(lng),
    mapY: String(lat),
    radius: String(radiusM),
    contentTypeId: String(typeId),
    numOfRows: String(PAGE_SIZE),
    pageNo: String(page)
  });

  // serviceKey는 이미 인코딩된 값이라 URLSearchParams에 넣으면 또 인코딩된다.
  const url = `${BASE}/locationBasedList2?serviceKey=${encodeURIComponent(key)}&${params}`;
  const response = await fetch(url);
  const text = await response.text();

  if (!text.trimStart().startsWith('{')) {
    throw new Error(`JSON이 아닌 응답 (http ${response.status}): ${maskKey(text, key).slice(0, 200)}`);
  }

  const body = JSON.parse(text);
  const header = body.response?.header;
  if (header?.resultCode !== '0000') {
    throw new Error(`${header?.resultCode} ${maskKey(header?.resultMsg ?? '', key)}`);
  }

  const payload = body.response.body;
  const items = payload.items?.item;
  return {
    total: payload.totalCount ?? 0,
    rows: Array.isArray(items) ? items : items ? [items] : []
  };
}

async function fetchArea(key, area, center, typeId) {
  const [lat, lng] = center;
  const rows = [];
  let page = 1;

  for (;;) {
    const { total, rows: pageRows } = await fetchList(key, { lat, lng, typeId, page });
    rows.push(...pageRows);
    if (rows.length >= total || pageRows.length === 0) break;
    page += 1;
  }

  return rows;
}

// ---------------------------------------------------------------- 매핑

function mapRow(row, shared) {
  const contentId = String(row.contentid ?? '').trim();
  if (contentId.length === 0) return { skip: 'contentid 없음' };

  const name = String(row.title ?? '').trim();
  if (name.length === 0) return { skip: '이름 없음' };

  // TourAPI는 mapx가 경도, mapy가 위도다. 서울시 API와 필드 이름이 반대라
  // 헷갈리기 쉽다. 범위로 한 번 더 확인한다.
  const lat = Number(row.mapy);
  const lng = Number(row.mapx);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { skip: '좌표 없음' };
  if (lat < 37.0 || lat > 38.0 || lng < 126.5 || lng > 127.5) return { skip: '좌표 범위 밖' };

  const kind = shared.kindFromTourApi(row);
  const isIndoor = shared.isIndoorForKind(kind);
  const address = [row.addr1, row.addr2].map(part => String(part ?? '').trim()).filter(Boolean).join(' ') || null;

  // 분류 코드는 사람이 못 읽는다. 매칭용 패싯과 표시용 대분류 이름을 같이 넣는다.
  // 패싯이 없으면 이 행의 태그는 kind와 완전히 중복이라 정보량이 0이다 (#28).
  const tags = shared.mergeFacets(
    [CONTENT_TYPES[Number(row.contenttypeid)]].filter(Boolean),
    shared.facetsFromTourApi(row)
  );

  // 가격대와 영업시간은 이 조회에 없다. 소개정보조회(detailIntro2)를 콘텐츠마다
  // 한 번씩 더 불러야 하는데 개발계정 트래픽이 하루 1000이라 지금은 비워둔다.
  // NULL은 "미상"이고 예산·영업시간 하드 필터에서 제외되지 않는다.
  const facts = {
    kind,
    address,
    priceLevel: null,
    isIndoor,
    tags,
    openingHours: null,
    startsAt: null,
    endsAt: null
  };

  return {
    place: {
      id: `place_tour_${contentId}`,
      kind,
      name,
      nameNormalized: shared.normalizePlaceName(name),
      address,
      lat,
      lng,
      geohash5: shared.geohashEncode(lat, lng),
      areaCode: findArea(lat, lng, radiusM, shared.haversineMeters)?.code ?? null,
      isIndoor,
      tags,
      infoConfidence: shared.computeInfoConfidence(facts)
    },
    source: { externalId: contentId, raw: row }
  };
}

// ---------------------------------------------------------------- SQL

function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function toSql(mapped, fetchedAt) {
  const p = mapped.place;

  const place =
    `INSERT INTO places (id, kind, name, name_normalized, address, lat, lng, geohash5, area_code,` +
    ` price_level, is_indoor, tags_json, opening_hours_json, starts_at, ends_at, opened_at,` +
    ` popularity, info_confidence, status, curated_by, created_at, updated_at) VALUES (` +
    [
      p.id,
      p.kind,
      p.name,
      p.nameNormalized,
      p.address,
      p.lat,
      p.lng,
      p.geohash5,
      p.areaCode,
      null,
      p.isIndoor,
      JSON.stringify(p.tags),
      null,
      null,
      null,
      null,
      null,
      p.infoConfidence,
      'active',
      null,
      fetchedAt,
      fetchedAt
    ]
      .map(quote)
      .join(', ') +
    `) ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, name = excluded.name,` +
    ` name_normalized = excluded.name_normalized, address = excluded.address,` +
    ` lat = excluded.lat, lng = excluded.lng, geohash5 = excluded.geohash5,` +
    ` area_code = excluded.area_code, is_indoor = excluded.is_indoor,` +
    ` tags_json = excluded.tags_json, info_confidence = excluded.info_confidence,` +
    ` updated_at = excluded.updated_at WHERE places.curated_by IS NULL;`;

  const source =
    `INSERT INTO place_sources (id, place_id, source, external_id, raw_json, fetched_at) VALUES (` +
    [
      `psrc_tour_${mapped.source.externalId}`,
      p.id,
      SOURCE,
      mapped.source.externalId,
      JSON.stringify(mapped.source.raw),
      fetchedAt
    ]
      .map(quote)
      .join(', ') +
    `) ON CONFLICT(source, external_id) DO UPDATE SET raw_json = excluded.raw_json,` +
    ` fetched_at = excluded.fetched_at;`;

  return `${place}\n${source}`;
}

// ---------------------------------------------------------------- 실행

function tally(list) {
  const counts = new Map();
  for (const key of list) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const key = decodeURIComponent(requireKey('DATA_GO_KR_KEY'));
  const shared = await loadShared();

  console.log(`\nTourAPI 수집 — 상권 ${AREAS.length}곳 × 종류 ${Object.keys(CONTENT_TYPES).length}가지, 반경 ${radiusM}m`);

  const raw = [];
  for (const area of AREAS) {
    let areaCount = 0;
    for (const center of area.centers) {
      for (const typeId of Object.keys(CONTENT_TYPES)) {
        const rows = await fetchArea(key, area, center, typeId);
        raw.push(...rows);
        areaCount += rows.length;
      }
    }
    console.log(`  ${area.label.padEnd(12)} ${String(areaCount).padStart(5)}건`);
  }

  // 상권 원이 겹치면 같은 장소가 여러 번 들어온다. contentid로 접는다.
  const byId = new Map();
  for (const row of raw) byId.set(String(row.contentid), row);
  console.log(`\n조회 ${raw.length}건 → 중복 접고 ${byId.size}건`);

  const kept = [];
  const skips = [];
  for (const row of byId.values()) {
    const mapped = mapRow(row, shared);
    if (mapped.skip) {
      skips.push(mapped.skip);
      continue;
    }
    kept.push(mapped);
  }

  if (skips.length > 0) {
    console.log('\n버린 것');
    for (const [reason, count] of tally(skips)) console.log(`  ${String(count).padStart(5)}  ${reason}`);
  }

  console.log(`\n남은 것 ${kept.length}건\n\n  종류별`);
  for (const [kind, count] of tally(kept.map(m => m.place.kind))) {
    console.log(`  ${String(count).padStart(5)}  ${kind}`);
  }
  console.log('\n  상권별');
  for (const [code, count] of tally(kept.map(m => m.place.areaCode ?? '(상권 밖)'))) {
    console.log(`  ${String(count).padStart(5)}  ${AREAS.find(a => a.code === code)?.label ?? code}`);
  }

  if (!apply) {
    console.log('\n분석만 했다. 실제로 넣으려면 --apply를 붙인다.\n');
    return;
  }

  const fetchedAt = new Date().toISOString();
  const chunkSize = 200;
  console.log(`\nD1에 적재 — ${kept.length}건, ${Math.ceil(kept.length / chunkSize)}묶음`);

  for (let at = 0; at < kept.length; at += chunkSize) {
    const chunk = kept.slice(at, at + chunkSize);
    const file = join(work, `chunk-${at}.sql`);
    writeFileSync(file, chunk.map(mapped => toSql(mapped, fetchedAt)).join('\n'), 'utf8');

    execFileSync(
      'yarn',
      ['wrangler', 'd1', 'execute', 'sogonzip-db', '--remote', `--file=${file}`, '-y'],
      { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }
    );
    console.log(`  ${Math.min(at + chunkSize, kept.length)}/${kept.length}`);
  }

  console.log('\n끝.\n');
}

main().catch(error => {
  console.error(`\n실패: ${error.message}\n`);
  process.exit(1);
});
