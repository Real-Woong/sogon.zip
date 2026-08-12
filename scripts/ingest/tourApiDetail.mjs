/**
 * TourAPI 소개정보조회(detailIntro2)로 **영업시간**을 채운다.
 *
 *   yarn node scripts/ingest/tourApiDetail.mjs --sample 5   # 응답 필드부터 눈으로 본다
 *   yarn node scripts/ingest/tourApiDetail.mjs              # 분석만 (기본)
 *   yarn node scripts/ingest/tourApiDetail.mjs --apply
 *   yarn node scripts/ingest/tourApiDetail.mjs --apply --limit 400
 *
 * ## 왜 이게 급한가
 *
 * 하루짜리 코스에서 영업시간은 부가 정보가 아니라 문제 그 자체다. "12시에
 * 밥"을 정하려면 12시에 문 연 곳을 알아야 한다. 지금 `opening_hours_json`은
 * 1,364건 **전부 NULL**이라, 시간표를 만들면 닫힌 가게로 사람을 보낸다.
 *
 * `tourApi.mjs`의 목록 조회에는 영업시간이 없다. 콘텐츠마다 이 조회를 한 번씩
 * 더 불러야 한다. 개발계정 트래픽이 하루 1000건이라 며칠에 나눠 돌린다.
 *
 * ## 두 가지 설계 결정
 *
 * **1. 필드명을 하드코딩하지 않는다.** detailIntro2는 콘텐츠 타입마다 필드
 * 이름이 다르다(`usetime`, `opentimefood`, `usetimeculture` ...). 문서를 보고
 * 다 적어넣는 대신 키 이름을 패턴으로 훑는다. 이름이 하나 틀리면 그 타입만
 * 조용히 비는데, 그건 나중에 "왜 음식점만 영업시간이 없지"로 돌아온다.
 * 그래서 `--sample`로 **실제 응답 키를 먼저 눈으로 본다.**
 *
 * **2. 원본을 통째로 저장한다.** `place_sources`에 `source='tourapi_detail'`로
 * 남긴다. 파싱 규칙을 고쳤을 때 API를 다시 부르지 않고 로컬에서 다시 돌릴 수
 * 있다. 하루 1000건 제한이 있는 이상 이건 선택이 아니다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { maskKey, requireKey } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'sogonzip-detail-'));

const SOURCE = 'tourapi';
const DETAIL_SOURCE = 'tourapi_detail';
const BASE = 'https://apis.data.go.kr/B551011/KorService2';

/** 개발계정 하루 트래픽이 1000이다. 다른 스크립트가 쓸 여유를 남긴다. */
const DEFAULT_LIMIT = 900;

/** 공공 API에 몰아치지 않는다. */
const REQUEST_GAP_MS = 120;

// ---------------------------------------------------------------- 인자

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const numberArg = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? Number(argv[at + 1]) : fallback;
};
const limit = numberArg('--limit', DEFAULT_LIMIT);
const sampleCount = numberArg('--sample', 0);

// ---------------------------------------------------------------- shared/

function loadShared(entry, outname) {
  const outfile = join(work, outname);
  execFileSync(
    join(root, 'node_modules/.bin/esbuild'),
    [
      join(root, entry),
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

// ---------------------------------------------------------------- D1 읽기

function queryD1(sql) {
  const raw = execFileSync(
    'yarn',
    ['wrangler', 'd1', 'execute', 'sogonzip-db', '--remote', '--command', sql, '--json'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
  );

  // wrangler가 JSON 앞에 배너를 찍는 버전이 있다. 첫 '[' 부터 잘라 쓴다.
  const start = raw.indexOf('[');
  if (start < 0) {
    throw new Error('D1 응답을 읽지 못했다. wrangler 로그인 상태를 확인한다.');
  }
  const parsed = JSON.parse(raw.slice(start));
  return parsed[0]?.results ?? [];
}

/**
 * 아직 소개정보를 안 받아온 TourAPI 장소를 가져온다.
 *
 * `place_sources`에 detail 행이 이미 있으면 건너뛴다. 이게 재개 지점이다 —
 * 하루 900건씩 이틀에 나눠 돌려도 같은 곳을 두 번 부르지 않는다.
 */
function loadPending() {
  return queryD1(
    `SELECT s.external_id AS content_id, s.place_id, p.name, p.kind, s.raw_json
       FROM place_sources s
       JOIN places p ON p.id = s.place_id
      WHERE s.source = '${SOURCE}'
        AND NOT EXISTS (
          SELECT 1 FROM place_sources d
           WHERE d.source = '${DETAIL_SOURCE}' AND d.external_id = s.external_id
        )
      ORDER BY s.external_id`
  );
}

function contentTypeIdOf(row) {
  try {
    return String(JSON.parse(row.raw_json ?? '{}').contenttypeid ?? '');
  } catch {
    return '';
  }
}

/**
 * 샘플은 external_id 앞쪽이 아니라 콘텐츠 타입별로 고른다.
 * 정렬된 앞 5건을 쓰면 쇼핑(38)만 나와 다른 타입의 필드명이 비어도 발견하지 못한다.
 */
function pickTypeBalancedSample(rows, count) {
  const picked = [];
  const seenTypes = new Set();

  for (const row of rows) {
    const typeId = contentTypeIdOf(row);
    if (!typeId || seenTypes.has(typeId)) continue;
    picked.push(row);
    seenTypes.add(typeId);
    if (picked.length >= count) return picked;
  }

  for (const row of rows) {
    if (picked.includes(row)) continue;
    picked.push(row);
    if (picked.length >= count) break;
  }

  return picked;
}

// ---------------------------------------------------------------- 수집

async function fetchDetail(key, contentId, contentTypeId) {
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'sogonzip',
    _type: 'json',
    contentId,
    contentTypeId
  });
  const url = `${BASE}/detailIntro2?serviceKey=${encodeURIComponent(key)}&${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${maskKey(url, key)}`);
  }

  const body = await response.json();
  const item = body?.response?.body?.items?.item;
  if (!item) {
    return null;
  }
  return Array.isArray(item) ? item[0] : item;
}

// ---------------------------------------------------------------- 필드 추출

/**
 * 영업시간·휴무일 필드를 **이름 패턴**으로 찾는다.
 *
 * 콘텐츠 타입마다 이름이 다르다: `usetime`(관광지), `opentimefood`(음식점),
 * `usetimeculture`(문화시설), `usetimeleports`(레포츠), `opentime`(쇼핑) ...
 * 하나씩 적으면 새 타입이 늘 때마다 조용히 빈다.
 */
const HOUR_KEY = /^(usetime|opentime|playtime)/i;
const CLOSED_KEY = /^(restdate|restday)/i;

function pickByPattern(item, pattern) {
  for (const [key, value] of Object.entries(item)) {
    if (!pattern.test(key)) continue;
    const text = String(value ?? '').trim();
    if (text.length > 0) return { key, text };
  }
  return null;
}

// ---------------------------------------------------------------- SQL

function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function toSql(record, fetchedAt) {
  const sourceId = `src_detail_${record.contentId}`;
  return [
    // 원본 보존. 파싱 규칙을 고치면 이 행으로 다시 돌린다.
    `INSERT INTO place_sources (id, place_id, source, external_id, raw_json, fetched_at)` +
      ` VALUES (${quote(sourceId)}, ${quote(record.placeId)}, ${quote(DETAIL_SOURCE)},` +
      ` ${quote(record.contentId)}, ${quote(JSON.stringify(record.raw))}, ${quote(fetchedAt)})` +
      ` ON CONFLICT(source, external_id) DO UPDATE SET` +
      ` raw_json = excluded.raw_json, fetched_at = excluded.fetched_at;`,
    // 영업시간을 못 읽었어도 opening_hours_json에 원문을 남긴다.
    // NULL로 두면 "아직 안 받아옴"과 "받아왔는데 못 읽음"이 구분되지 않는다.
    `UPDATE places SET opening_hours_json = ${quote(record.hoursJson)}, updated_at = ${quote(fetchedAt)}` +
      ` WHERE id = ${quote(record.placeId)};`
  ].join('\n');
}

// ---------------------------------------------------------------- 실행

async function main() {
  const key = decodeURIComponent(requireKey('DATA_GO_KR_KEY'));
  const { parseOpeningHours, serializeOpeningHours } = await loadShared(
    'shared/openingHours.ts',
    'openingHours.mjs'
  );

  console.log('\nTourAPI 소개정보 수집 — 영업시간 채우기');
  const pending = loadPending();
  console.log(`  아직 안 받아온 장소: ${pending.length}건`);

  if (pending.length === 0) {
    console.log('\n전부 받아왔다. 끝.\n');
    return;
  }

  // --sample: 실제 응답에 어떤 키가 오는지부터 본다. 문서보다 이게 정확하다.
  if (sampleCount > 0) {
    console.log(`\n샘플 ${sampleCount}건의 응답 키를 그대로 출력한다.\n`);
    for (const row of pickTypeBalancedSample(pending, sampleCount)) {
      const typeId = contentTypeIdOf(row);
      const item = await fetchDetail(key, row.content_id, typeId);
      console.log(`  ${row.name} (kind=${row.kind}, contentTypeId=${typeId})`);
      if (!item) {
        console.log('    (응답 없음)');
      } else {
        for (const [k, v] of Object.entries(item)) {
          const text = String(v ?? '').trim();
          if (text.length > 0) console.log(`    ${k} = ${text.slice(0, 80)}`);
        }
      }
      console.log('');
      await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));
    }
    console.log('영업시간에 해당하는 키를 확인했으면 HOUR_KEY 패턴을 맞춘 뒤 --apply로 돌린다.\n');
    return;
  }

  const targets = pending.slice(0, limit);
  console.log(`  이번 실행에서 받아올 건수: ${targets.length}건 (--limit ${limit})`);
  if (targets.length < pending.length) {
    console.log(`  남는 ${pending.length - targets.length}건은 내일 다시 돌린다.`);
  }

  const records = [];
  const tally = { parsed: 0, rawOnly: 0, empty: 0, failed: 0 };
  const keysSeen = new Map();

  for (const [at, row] of targets.entries()) {
    const typeId = contentTypeIdOf(row);
    let item = null;
    try {
      item = await fetchDetail(key, row.content_id, typeId);
    } catch (error) {
      tally.failed += 1;
      console.log(`  실패 ${row.name}: ${error.message}`);
      continue;
    }
    await new Promise(resolve => setTimeout(resolve, REQUEST_GAP_MS));

    if (!item) {
      tally.empty += 1;
      continue;
    }

    const hourField = pickByPattern(item, HOUR_KEY);
    const closedField = pickByPattern(item, CLOSED_KEY);
    if (hourField) {
      keysSeen.set(hourField.key, (keysSeen.get(hourField.key) ?? 0) + 1);
    }

    const hours = parseOpeningHours(hourField?.text ?? null, closedField?.text ?? null);
    const hoursJson = serializeOpeningHours(hours);

    if (hours.parsed) tally.parsed += 1;
    else if (hoursJson) tally.rawOnly += 1;
    else tally.empty += 1;

    records.push({
      contentId: row.content_id,
      placeId: row.place_id,
      name: row.name,
      raw: item,
      hoursJson
    });

    if ((at + 1) % 100 === 0) {
      console.log(`  ${at + 1}/${targets.length}`);
    }
  }

  console.log('\n결과');
  console.log(`  영업시간을 읽었다        ${tally.parsed}`);
  console.log(`  원문만 남겼다(못 읽음)   ${tally.rawOnly}`);
  console.log(`  영업시간 정보 없음       ${tally.empty}`);
  console.log(`  요청 실패               ${tally.failed}`);

  if (keysSeen.size > 0) {
    console.log('\n  쓰인 필드 이름');
    for (const [key_, count] of [...keysSeen].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(count).padStart(5)}  ${key_}`);
    }
  }

  if (!apply) {
    console.log('\n분석만 했다. 실제로 넣으려면 --apply 를 붙인다.\n');
    return;
  }
  if (records.length === 0) {
    console.log('\n넣을 게 없다.\n');
    return;
  }

  const fetchedAt = new Date().toISOString();
  const chunkSize = 100;
  console.log(`\nD1에 적재 — ${records.length}건, ${Math.ceil(records.length / chunkSize)}묶음`);

  for (let at = 0; at < records.length; at += chunkSize) {
    const chunk = records.slice(at, at + chunkSize);
    const file = join(work, `detail-${at}.sql`);
    writeFileSync(file, chunk.map(record => toSql(record, fetchedAt)).join('\n'), 'utf8');

    execFileSync(
      'yarn',
      ['wrangler', 'd1', 'execute', 'sogonzip-db', '--remote', `--file=${file}`, '-y'],
      { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }
    );
    console.log(`  ${Math.min(at + chunkSize, records.length)}/${records.length}`);
  }

  console.log('\n끝.\n');
}

main().catch(error => {
  console.error(`\n실패: ${error.message}\n`);
  process.exit(1);
});
