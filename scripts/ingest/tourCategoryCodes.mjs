/**
 * TourAPI 분류 코드표(`categoryCode2`)를 받아 `tourCategories.json`에 저장한다.
 *
 *   yarn node scripts/ingest/tourCategoryCodes.mjs           # 분석만 (기본)
 *   yarn node scripts/ingest/tourCategoryCodes.mjs --apply   # 파일에 쓴다
 *
 * `locationBasedList2`는 `cat1/cat2/cat3`을 **코드로만** 준다. `A02060500`이
 * 무슨 뜻인지는 이 조회로만 알 수 있다. 결과를 저장소에 커밋해두면
 * 백필(`backfillCategories.mjs`)은 API 호출 0회로 돌아간다.
 *
 * 코드표는 거의 안 바뀐다. 새 코드가 데이터에 나타났을 때만 다시 돌린다.
 * 호출 수는 실제 쓰이는 (cat1, cat2) 쌍 개수만큼이다 — 하루 1000건 중 20건 안쪽.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { query } from './d1.mjs';
import { maskKey, requireKey } from './env.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUTFILE = join(here, 'tourCategories.json');
const BASE = 'https://apis.data.go.kr/B551011/KorService2';

const apply = process.argv.slice(2).includes('--apply');

async function fetchCodes(key, params) {
  const search = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'sogonzip',
    _type: 'json',
    numOfRows: '100',
    pageNo: '1',
    ...params
  });

  // serviceKey는 이미 인코딩된 값이라 URLSearchParams에 넣으면 이중 인코딩된다.
  const url = `${BASE}/categoryCode2?serviceKey=${encodeURIComponent(key)}&${search}`;
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

  const items = body.response.body?.items?.item;
  const rows = Array.isArray(items) ? items : items ? [items] : [];
  return rows.map(row => ({ code: String(row.code ?? ''), name: String(row.name ?? '').trim() }));
}

/** 실제 데이터에 나타난 조합만 조회한다. 안 쓰는 코드까지 받을 이유가 없다. */
function usedCombinations() {
  const rows = query(
    `SELECT DISTINCT json_extract(raw_json, '$.cat1') AS cat1,` +
      ` json_extract(raw_json, '$.cat2') AS cat2,` +
      ` json_extract(raw_json, '$.cat3') AS cat3` +
      ` FROM place_sources WHERE source = 'tourapi'` +
      ` AND json_extract(raw_json, '$.cat3') IS NOT NULL`
  );
  return rows.filter(row => row.cat1 && row.cat2 && row.cat3);
}

async function main() {
  const key = decodeURIComponent(requireKey('DATA_GO_KR_KEY'));

  console.log('\nTourAPI 분류 코드표');

  const used = usedCombinations();
  const pairs = [...new Set(used.map(row => `${row.cat1}\t${row.cat2}`))].map(joined => {
    const [cat1, cat2] = joined.split('\t');
    return { cat1, cat2 };
  });
  const wantedCat3 = new Set(used.map(row => row.cat3));

  console.log(`  쓰이는 cat3 ${wantedCat3.size}종, 조회할 (cat1, cat2) 쌍 ${pairs.length}개`);

  const names = {};

  for (const row of await fetchCodes(key, {})) names[row.code] = row.name;
  console.log(`  대분류 ${Object.keys(names).length}종`);

  for (const { cat1, cat2 } of pairs) {
    for (const row of await fetchCodes(key, { cat1 })) names[row.code] = row.name;
    for (const row of await fetchCodes(key, { cat1, cat2 })) names[row.code] = row.name;
  }

  const missing = [...wantedCat3].filter(code => !names[code]);
  const covered = wantedCat3.size - missing.length;

  console.log(`\n  이름을 얻은 cat3 ${covered}/${wantedCat3.size}종`);
  if (missing.length > 0) {
    console.log(`  ⚠ 이름을 못 얻은 코드: ${missing.join(', ')}`);
  }

  const sorted = Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)));
  for (const code of [...wantedCat3].sort()) {
    console.log(`    ${code}  ${sorted[code] ?? '(모름)'}`);
  }

  if (!apply) {
    console.log(`\n분석만 했다. 파일에 쓰려면 --apply를 붙인다.\n`);
    return;
  }

  writeFileSync(OUTFILE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`\n${OUTFILE}에 ${Object.keys(sorted).length}종 저장했다.\n`);
}

main().catch(error => {
  console.error(`\n실패: ${error.message}\n`);
  process.exit(1);
});
