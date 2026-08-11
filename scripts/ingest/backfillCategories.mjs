/**
 * `places.tags_json`에 통제된 패싯을 채운다. **API 호출 0회.**
 *
 *   yarn node scripts/ingest/backfillCategories.mjs             # 분석만 (기본)
 *   yarn node scripts/ingest/backfillCategories.mjs --apply     # 태그 갱신
 *   yarn node scripts/ingest/backfillCategories.mjs --apply --fix-kind
 *
 * 수집기가 분류 코드를 받아놓고 버렸다. TourAPI 961건의 `tags_json`이
 * `["음식점"]`처럼 `kind`와 완전히 겹쳐서 정보량이 0이었다. 원본은
 * `place_sources.raw_json`에 통째로 남아 있어서 다시 부를 필요가 없다.
 *
 * `--fix-kind`는 태그가 아니라 `kind`를 고친다. 별도 플래그로 둔 이유는
 * 그게 파생값이 아니라 후보 조회의 1차 기준이라서다 (`shared/placeFacets.ts`의
 * `TOUR_CAT3_PARK` 주석 참고). 무엇이 바뀌는지 먼저 눈으로 보고 결정한다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { execFile, query, quote } from './d1.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'sogonzip-facets-'));

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const fixKind = argv.includes('--fix-kind');

/** `shared/`는 TS라 esbuild로 번들해서 부른다. `renormalize.mjs`와 같은 방식. */
async function loadShared() {
  const outfile = join(work, 'placeFacets.mjs');
  execFileSync(
    join(root, 'node_modules/.bin/esbuild'),
    [
      join(root, 'shared/placeFacets.ts'),
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

function parseTags(text) {
  try {
    const parsed = JSON.parse(text ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function tally(list) {
  const counts = new Map();
  for (const key of list) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function sameTags(a, b) {
  return a.length === b.length && a.every((tag, at) => tag === b[at]);
}

async function main() {
  const shared = await loadShared();
  // 코드 이름은 보고서에만 쓴다. 매핑은 코드로 걸려 있다.
  const categoryNames = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tourCategories.json'), 'utf8')
  );

  console.log('\n분류 백필 — tags_json에 패싯을 채운다');

  const rows = query(
    `SELECT p.id, p.kind, p.tags_json, p.is_indoor, s.source,` +
      ` json_extract(s.raw_json, '$.cat3') AS cat3,` +
      ` json_extract(s.raw_json, '$.CODENAME') AS codename,` +
      ` json_extract(s.raw_json, '$.THEMECODE') AS themecode,` +
      ` json_extract(s.raw_json, '$.IS_FREE') AS is_free` +
      ` FROM places p JOIN place_sources s ON s.place_id = p.id` +
      ` WHERE p.curated_by IS NULL ORDER BY p.id`
  );
  console.log(`  장소 ${rows.length}건을 읽었다 (운영자가 손댄 장소는 뺐다).`);

  const tagChanges = [];
  const kindChanges = [];
  const unmapped = [];

  for (const row of rows) {
    const existing = parseTags(row.tags_json);

    let facets = [];
    if (row.source === 'tourapi') {
      facets = shared.facetsFromTourApi({ cat3: row.cat3 });
      if (facets.length === 0 && row.cat3) {
        unmapped.push(`${row.cat3} ${categoryNames[row.cat3] ?? '(이름 모름)'}`);
      }
      if (shared.TOUR_CAT3_PARK.includes(row.cat3) && row.kind !== 'park') {
        kindChanges.push({ id: row.id, name: row.id, from: row.kind, to: 'park' });
      }
    } else if (row.source === 'seoul_culture') {
      facets = shared.facetsFromSeoulCulture({
        CODENAME: row.codename,
        THEMECODE: row.themecode,
        IS_FREE: row.is_free
      });
      if (!shared.SEOUL_CODENAME_GENRE[String(row.codename ?? '').trim()]) {
        unmapped.push(`CODENAME ${row.codename || '(빈값)'}`);
      }
    }

    const next = shared.mergeFacets(existing, facets);
    if (!sameTags(existing, next)) tagChanges.push({ id: row.id, from: existing, to: next });
  }

  console.log(`\n  태그가 바뀌는 장소 ${tagChanges.length}건`);
  for (const row of tagChanges.slice(0, 6)) {
    console.log(`    ${JSON.stringify(row.from)}  →  ${JSON.stringify(row.to)}`);
  }
  if (tagChanges.length > 6) console.log(`    … 외 ${tagChanges.length - 6}건`);

  const facetTally = tally(
    tagChanges.flatMap(row => row.to.filter(tag => shared.isFacet(tag)))
  );
  console.log('\n  붙는 패싯');
  for (const [tag, count] of facetTally) console.log(`  ${String(count).padStart(5)}  ${tag}`);

  if (unmapped.length > 0) {
    console.log(`\n  ⚠ 매핑이 없어 태그를 못 붙인 장소 ${unmapped.length}건`);
    console.log('    (억지로 넣지 않는다. 늘어나면 shared/placeFacets.ts에 추가한다)');
    for (const [label, count] of tally(unmapped)) console.log(`  ${String(count).padStart(5)}  ${label}`);
  }

  if (kindChanges.length > 0) {
    console.log(`\n  ⚠ kind가 틀린 장소 ${kindChanges.length}건 — activity로 들어간 공원`);
    console.log(`    산책 슬롯은 kind='park'만 찾는다. 지금 서울 전체에 park이 7곳뿐이다.`);
    console.log(`    ${fixKind ? '--fix-kind가 켜져 있다. 함께 고친다.' : '고치려면 --fix-kind를 붙인다.'}`);
  }

  if (tagChanges.length === 0 && (!fixKind || kindChanges.length === 0)) {
    console.log('\n갱신할 게 없다.\n');
    return;
  }
  if (!apply) {
    console.log('\n분석만 했다. 실제로 갱신하려면 --apply를 붙인다.\n');
    return;
  }

  // `updated_at`은 건드리지 않는다. 여기서 바꾸는 건 사람이 남긴 정보가 아니라
  // 이미 들고 있던 원본에서 기계적으로 유도되는 값이다 (`renormalize.mjs`와 같은 판단).
  const statements = tagChanges.map(
    row => `UPDATE places SET tags_json = ${quote(JSON.stringify(row.to))} WHERE id = ${quote(row.id)};`
  );
  if (fixKind) {
    // 공원은 실외다. kind를 고치면서 is_indoor도 같이 맞춘다.
    statements.push(
      ...kindChanges.map(
        row => `UPDATE places SET kind = 'park', is_indoor = 0 WHERE id = ${quote(row.id)};`
      )
    );
  }

  const chunkSize = 400;
  console.log(`\nD1에 갱신 — ${statements.length}개 문장`);

  for (let at = 0; at < statements.length; at += chunkSize) {
    const file = join(work, `facets-${at}.sql`);
    writeFileSync(file, statements.slice(at, at + chunkSize).join('\n'), 'utf8');
    execFile(file);
    console.log(`  ${Math.min(at + chunkSize, statements.length)}/${statements.length}`);
  }

  // wrangler가 주는 변경 행 수는 믿을 수 없다. 직접 다시 읽어 확인한다.
  const stored = new Map(
    query('SELECT id, kind, tags_json FROM places').map(row => [row.id, row])
  );
  const staleTags = tagChanges.filter(
    row => !sameTags(parseTags(stored.get(row.id)?.tags_json), row.to)
  );
  if (staleTags.length > 0) {
    throw new Error(`태그가 갱신되지 않은 행이 ${staleTags.length}건 있다. 예: ${staleTags[0].id}`);
  }
  if (fixKind) {
    const staleKind = kindChanges.filter(row => stored.get(row.id)?.kind !== 'park');
    if (staleKind.length > 0) {
      throw new Error(`kind가 갱신되지 않은 행이 ${staleKind.length}건 있다. 예: ${staleKind[0].id}`);
    }
  }

  console.log(`\n끝. 태그 ${tagChanges.length}건${fixKind ? `, kind ${kindChanges.length}건` : ''} 갱신됐다.\n`);
}

main().catch(error => {
  console.error(`\n실패: ${error.message}\n`);
  process.exit(1);
});
