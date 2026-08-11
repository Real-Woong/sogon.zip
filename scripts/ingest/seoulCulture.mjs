/**
 * 서울 열린데이터광장 `culturalEventInfo` 수집.
 *
 *   yarn node scripts/ingest/seoulCulture.mjs              # 분석만 (기본)
 *   yarn node scripts/ingest/seoulCulture.mjs --apply      # 실제로 D1에 적재
 *   yarn node scripts/ingest/seoulCulture.mjs --radius 3000
 *   yarn node scripts/ingest/seoulCulture.mjs --areas-only  # 상권 안만 저장
 *
 * 기본은 서울 전체를 저장하고 상권은 `area_code`로 표시만 한다.
 * 이 소스에서 아직 안 끝난 행사가 서울 전체를 통틀어 403건뿐이라 버릴 이유가 없다.
 * 밀도는 저장 단계가 아니라 추천 시점의 지오해시 후보 생성에서 잡는다.
 *
 * 왜 Cron Worker가 아니라 로컬 스크립트인가:
 * Pages Functions는 cron을 못 돌리고 요청당 CPU가 10ms다. 2만 건을 훑는 일은
 * 요청 경로에 둘 수 없다. 자동화가 필요해지면 별도 Worker로 옮긴다.
 *
 * 멱등성: place id를 `place_seoul_<cultcode>`로 결정론적으로 만든다.
 * 몇 번을 다시 돌려도 같은 행사는 같은 행으로 들어간다. 운영자가 손댄 장소
 * (`curated_by IS NOT NULL`)는 덮어쓰지 않는다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { AREAS, DEFAULT_RADIUS_M, findArea } from './areas.mjs';
import { maskKey, requireKey } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'sogonzip-ingest-'));

const SOURCE = 'seoul_culture';
const PAGE_SIZE = 1000;
const ENDPOINT = 'http://openapi.seoul.go.kr:8088';

// ---------------------------------------------------------------- 인자

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const areasOnly = argv.includes('--areas-only');
const radiusM = (() => {
  const at = argv.indexOf('--radius');
  return at >= 0 ? Number(argv[at + 1]) : DEFAULT_RADIUS_M;
})();

// ---------------------------------------------------------------- shared/ 번들

/** `shared/`는 TS라 esbuild로 번들해서 부른다. `scripts/test.mjs`와 같은 방식. */
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

/**
 * 서울시 API는 KST 벽시계 시각을 준다. "2026-12-24 00:00:00.0" 같은 형태다.
 * 이걸 그대로 저장하면 UTC로 읽혀서 9시간이 밀린다.
 *
 * 종료일은 하루의 끝으로 올린다. END_DATE가 00:00으로 오기 때문에 그대로 두면
 * 당일 저녁 공연이 아침에 이미 끝난 것으로 보인다.
 */
function kstToIso(raw, { endOfDay = false } = {}) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(raw ?? '').trim());
  if (!matched) return null;

  const [, y, mo, d, hh, mi] = matched;
  const hour = endOfDay ? 23 : Number(hh ?? 0);
  const minute = endOfDay ? 59 : Number(mi ?? 0);
  const second = endOfDay ? 59 : 0;

  // KST(UTC+9) 벽시계를 UTC로 되돌린다.
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), hour - 9, minute, second);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/**
 * 요금 문자열에서 1인 최소 가격을 뽑아 1~4로 나눈다.
 * 최소가를 쓰는 이유: 예산 필터가 답해야 하는 질문이 "이 돈으로 갈 수 있나"라서
 * 가장 싼 좌석이 기준이다. 못 읽으면 null이고, null은 예산 필터에서 제외되지 않는다.
 */
function toPriceLevel(useFee, isFree) {
  if (String(isFree ?? '').includes('무료')) return 1;

  const prices = [...String(useFee ?? '').matchAll(/([\d,]{3,})\s*원/g)]
    .map(match => Number(match[1].replaceAll(',', '')))
    .filter(value => Number.isFinite(value) && value > 0);

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  if (min <= 10_000) return 1;
  if (min <= 30_000) return 2;
  if (min <= 70_000) return 3;
  return 4;
}

// CODENAME → places.kind. 모르는 분류는 로그로 남기고 activity로 둔다.
const KIND_BY_CODE = {
  '전시/미술': 'exhibition',
  '전시': 'exhibition',
  '미술': 'exhibition',
  '박물관': 'exhibition',
  '콘서트': 'activity',
  '클래식': 'activity',
  '국악': 'activity',
  '뮤지컬/오페라': 'activity',
  '연극': 'activity',
  '무용': 'activity',
  '독주/독창회': 'activity',
  '영화': 'activity',
  '축제-문화/예술': 'activity',
  '축제-전통/역사': 'activity',
  '축제-시민화합': 'activity',
  '축제-기타': 'activity',
  '축제-관광/체육': 'activity',
  '축제-자연/경관': 'activity',
  '교육/체험': 'activity',
  '기타': 'activity'
};

// 실내 여부. 날씨 대응에 쓴다. 모르면 null이고 null은 필터하지 않는다.
const OUTDOOR_HINTS = ['축제', '공원', '야외', '거리'];
const INDOOR_CODES = new Set([
  '전시/미술',
  '전시',
  '미술',
  '박물관',
  '콘서트',
  '클래식',
  '국악',
  '뮤지컬/오페라',
  '연극',
  '무용',
  '독주/독창회',
  '영화'
]);

function toIsIndoor(codeName, place) {
  const haystack = `${codeName ?? ''} ${place ?? ''}`;
  if (OUTDOOR_HINTS.some(hint => haystack.includes(hint))) return false;
  if (INDOOR_CODES.has(codeName)) return true;
  return null;
}

/**
 * 이 API에는 고유 ID 필드가 없다. 상세 페이지 주소에 들어 있는 `cultcode`가
 * 유일하게 안정적인 식별자라 그걸 뽑아 쓴다. 없으면 그 행은 버린다 —
 * 임의 해시로 만들면 제목이 한 글자만 바뀌어도 매번 새 장소가 생긴다.
 */
function toExternalId(row) {
  const matched = /cultcode=(\d+)/.exec(String(row.HMPG_ADDR ?? ''));
  return matched ? matched[1] : null;
}

// ---------------------------------------------------------------- 수집

async function fetchPage(key, start, end) {
  const url = `${ENDPOINT}/${key}/json/culturalEventInfo/${start}/${end}/`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${maskKey(url, key)}`);
  }

  const body = await response.json();
  const payload = body.culturalEventInfo;

  if (!payload) {
    // 인증키 오류는 다른 껍데기로 온다.
    const message = body.RESULT?.MESSAGE ?? JSON.stringify(body).slice(0, 200);
    throw new Error(`예상 밖 응답: ${maskKey(message, key)}`);
  }

  const code = payload.RESULT?.CODE;
  if (code && code !== 'INFO-000') {
    throw new Error(`${code} — ${maskKey(payload.RESULT?.MESSAGE ?? '', key)}`);
  }

  return { total: payload.list_total_count ?? 0, rows: payload.row ?? [] };
}

async function fetchAll(key) {
  const first = await fetchPage(key, 1, PAGE_SIZE);
  const rows = [...first.rows];
  const total = first.total;

  process.stdout.write(`  전체 ${total}건 — 1~${rows.length}`);

  for (let start = PAGE_SIZE + 1; start <= total; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, total);
    const page = await fetchPage(key, start, end);
    rows.push(...page.rows);
    process.stdout.write(`, ${start}~${end}`);
  }

  process.stdout.write('\n');
  return rows;
}

// ---------------------------------------------------------------- 매핑

function mapRow(row, shared, now) {
  const externalId = toExternalId(row);
  if (!externalId) return { skip: 'ID 없음' };

  const lat = Number(row.LAT);
  const lng = Number(row.LOT);

  // 서울 밖 좌표는 필드가 뒤바뀌었거나 값이 깨진 것이다. 지오해시가 통째로
  // 틀리면 후보 생성이 조용히 망가지므로 여기서 버린다.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { skip: '좌표 없음' };
  if (lat < 37.0 || lat > 38.0 || lng < 126.5 || lng > 127.5) return { skip: '좌표 범위 밖' };

  const startsAt = kstToIso(row.STRTDATE);
  const endsAt = kstToIso(row.END_DATE, { endOfDay: true });
  if (!endsAt) return { skip: '종료일 없음' };
  if (Date.parse(endsAt) < now.getTime()) return { skip: '이미 끝남' };

  const area = findArea(lat, lng, radiusM, shared.haversineMeters);
  if (!area && areasOnly) return { skip: '상권 밖', guName: row.GUNAME };

  const codeName = String(row.CODENAME ?? '').trim();
  const kind = KIND_BY_CODE[codeName] ?? 'activity';
  const themeCode = String(row.THEMECODE ?? '').trim();

  // 원문 라벨은 표시용으로 남기고, 매칭용 패싯을 앞에 붙인다.
  // 이 스크립트는 주 1회 돌기 때문에 여기서 패싯을 안 넣으면 매주 날아간다 (#28).
  const labels = [codeName, themeCode]
    .filter(tag => tag.length > 0 && tag !== '기타')
    .filter((tag, at, list) => list.indexOf(tag) === at);
  if (String(row.IS_FREE ?? '').includes('무료')) labels.push('무료');
  const tags = shared.mergeFacets(labels, shared.facetsFromSeoulCulture(row));

  const name = String(row.TITLE ?? '').trim();
  if (name.length === 0) return { skip: '이름 없음' };

  const guName = String(row.GUNAME ?? '').trim();
  const venue = String(row.PLACE ?? '').trim();
  const address = [guName && `서울 ${guName}`, venue].filter(Boolean).join(' ') || null;

  const priceLevel = toPriceLevel(row.USE_FEE, row.IS_FREE);
  const isIndoor = toIsIndoor(codeName, venue);

  const facts = { kind, address, priceLevel, isIndoor, tags, openingHours: null, startsAt, endsAt };

  return {
    unknownCode: KIND_BY_CODE[codeName] === undefined ? codeName : null,
    place: {
      id: `place_seoul_${externalId}`,
      kind,
      name,
      nameNormalized: shared.normalizePlaceName(name),
      address,
      lat,
      lng,
      geohash5: shared.geohashEncode(lat, lng),
      areaCode: area?.code ?? null,
      priceLevel,
      isIndoor,
      tags,
      startsAt,
      endsAt,
      infoConfidence: shared.computeInfoConfidence(facts)
    },
    source: { externalId, raw: row }
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
  const statements = [];

  statements.push(
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
        p.priceLevel,
        p.isIndoor === null ? null : p.isIndoor,
        JSON.stringify(p.tags),
        null,
        p.startsAt,
        p.endsAt,
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
      `) ON CONFLICT(id) DO UPDATE SET` +
      ` kind = excluded.kind, name = excluded.name, name_normalized = excluded.name_normalized,` +
      ` address = excluded.address, lat = excluded.lat, lng = excluded.lng,` +
      ` geohash5 = excluded.geohash5, area_code = excluded.area_code,` +
      ` price_level = excluded.price_level, is_indoor = excluded.is_indoor,` +
      ` tags_json = excluded.tags_json, starts_at = excluded.starts_at,` +
      ` ends_at = excluded.ends_at, info_confidence = excluded.info_confidence,` +
      ` updated_at = excluded.updated_at` +
      // 운영자가 손댄 장소는 수집이 덮어쓰지 않는다. 사람 판단이 항상 이긴다.
      ` WHERE places.curated_by IS NULL;`
  );

  statements.push(
    `INSERT INTO place_sources (id, place_id, source, external_id, raw_json, fetched_at) VALUES (` +
      [
        `psrc_seoul_${mapped.source.externalId}`,
        p.id,
        SOURCE,
        mapped.source.externalId,
        JSON.stringify(mapped.source.raw),
        fetchedAt
      ]
        .map(quote)
        .join(', ') +
      `) ON CONFLICT(source, external_id) DO UPDATE SET` +
      ` raw_json = excluded.raw_json, fetched_at = excluded.fetched_at;`
  );

  return statements.join('\n');
}

// ---------------------------------------------------------------- 실행

function tally(list) {
  const counts = new Map();
  for (const key of list) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const key = requireKey('SEOUL_OPEN_API_KEY');
  const shared = await loadShared();
  const now = new Date();

  console.log(`\n서울 문화행사 수집 — 상권 반경 ${radiusM}m${areasOnly ? ' (상권 안만 저장)' : ' (서울 전체 저장)'}`);
  const rows = await fetchAll(key);

  const kept = [];
  const skips = [];
  const outOfAreaGu = [];
  const unknownCodes = [];

  for (const row of rows) {
    const mapped = mapRow(row, shared, now);
    if (mapped.skip) {
      skips.push(mapped.skip);
      if (mapped.guName) outOfAreaGu.push(mapped.guName);
      continue;
    }
    if (mapped.unknownCode) unknownCodes.push(mapped.unknownCode);
    kept.push(mapped);
  }

  console.log(`\n버린 것 (${rows.length - kept.length}건)`);
  for (const [reason, count] of tally(skips)) console.log(`  ${String(count).padStart(6)}  ${reason}`);

  console.log(`\n남은 것 ${kept.length}건`);
  console.log('\n  상권별');
  for (const [code, count] of tally(kept.map(m => m.place.areaCode ?? '(상권 밖)'))) {
    const label = AREAS.find(area => area.code === code)?.label ?? code;
    console.log(`  ${String(count).padStart(6)}  ${label}`);
  }
  console.log('\n  종류별');
  for (const [kind, count] of tally(kept.map(m => m.place.kind))) {
    console.log(`  ${String(count).padStart(6)}  ${kind}`);
  }

  if (unknownCodes.length > 0) {
    console.log('\n  ⚠ 매핑에 없는 CODENAME (activity로 처리됨)');
    for (const [code, count] of tally(unknownCodes)) console.log(`  ${String(count).padStart(6)}  ${code}`);
  }

  if (outOfAreaGu.length > 0 && areasOnly) {
    console.log('\n  상권 밖 상위 구 (반경을 넓힐지 판단용)');
    for (const [gu, count] of tally(outOfAreaGu).slice(0, 8)) {
      console.log(`  ${String(count).padStart(6)}  ${gu}`);
    }
  }

  if (!apply) {
    console.log('\n분석만 했다. 실제로 넣으려면 --apply를 붙인다.\n');
    return;
  }

  if (kept.length === 0) {
    console.log('\n넣을 게 없다.\n');
    return;
  }

  const fetchedAt = now.toISOString();
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
