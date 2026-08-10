/**
 * 기간이 끝난 장소를 닫는다.
 *
 *   yarn node scripts/ingest/closeExpired.mjs           # 분석만 (기본)
 *   yarn node scripts/ingest/closeExpired.mjs --apply   # 실제로 닫음
 *   yarn node scripts/ingest/closeExpired.mjs --grace 1 # 종료 하루 뒤부터 닫음
 *
 * 수집기는 이미 끝난 행사를 새로 넣지 않지만, 넣을 때는 살아 있던 행사가
 * 시간이 지나면 그대로 `active`로 남는다. 이 스크립트가 그걸 정리한다.
 * 매일 한 번 돌리는 걸 전제로 만들었다 (`02-roadmap.md` 9번에서 Cron Worker로 옮긴다).
 *
 * 물리 삭제하지 않고 `status='closed'`로만 바꾼다.
 * `recommendation_impressions`가 이 행을 참조하고 그 로그가 학습 데이터다.
 *
 * 되돌리지는 않는다. 종료일이 미뤄져서 다시 살아난 행사를 자동으로 여는 건
 * 운영자가 손으로 닫은 장소까지 되살릴 위험이 있다. 다시 여는 건 사람이 한다.
 */
import { execFile, query, quote } from './d1.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');

/**
 * 종료 직후 바로 닫지 않고 두는 여유. 종료일이 날짜만 있고 시각이 없는 소스가
 * 있어서, 마지막 날 저녁 공연이 그날 아침에 사라지는 걸 막는다.
 */
const graceDays = (() => {
  const at = argv.indexOf('--grace');
  return at >= 0 ? Number(argv[at + 1]) : 0;
})();

function main() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - graceDays * 86_400_000).toISOString();

  console.log(`\n끝난 행사 정리 — 기준 ${cutoff}${graceDays ? ` (여유 ${graceDays}일)` : ''}`);

  const expired = query(
    `SELECT id, name, kind, ends_at, curated_by
       FROM places
      WHERE status = 'active'
        AND ends_at IS NOT NULL
        AND ends_at < ${quote(cutoff)}
      ORDER BY ends_at`
  );

  if (expired.length === 0) {
    console.log('\n닫을 게 없다.\n');
    return;
  }

  const counts = new Map();
  for (const row of expired) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);

  console.log(`\n  닫을 장소 ${expired.length}건`);
  for (const [kind, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${kind}`);
  }

  const curated = expired.filter(row => row.curated_by);
  if (curated.length > 0) {
    // 운영자가 넣은 장소도 종료일이 지나면 닫는다. 종료는 판단이 아니라 사실이다.
    console.log(`\n  이 중 운영자가 넣은 것 ${curated.length}건도 함께 닫힌다.`);
  }

  console.log('\n  가장 오래된 것부터');
  for (const row of expired.slice(0, 8)) {
    console.log(`    ${row.ends_at?.slice(0, 10)}  ${row.name}`);
  }
  if (expired.length > 8) console.log(`    … 외 ${expired.length - 8}건`);

  if (!apply) {
    console.log('\n분석만 했다. 실제로 닫으려면 --apply를 붙인다.\n');
    return;
  }

  const work = mkdtempSync(join(tmpdir(), 'sogonzip-close-'));
  const file = join(work, 'close.sql');
  writeFileSync(
    file,
    `UPDATE places SET status = 'closed', updated_at = ${quote(now.toISOString())}
      WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < ${quote(cutoff)};`,
    'utf8'
  );
  execFile(file);

  // wrangler가 주는 변경 행 수는 믿을 수 없다. 직접 다시 세어 확인한다.
  const remaining = query(
    `SELECT count(*) AS n FROM places
      WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < ${quote(cutoff)}`
  )[0]?.n;

  if (remaining !== 0) {
    throw new Error(`닫히지 않고 남은 장소가 ${remaining}건 있다.`);
  }

  console.log(`\n끝. ${expired.length}건 닫혔다.\n`);
}

try {
  main();
} catch (error) {
  console.error(`\n실패: ${error.message}\n`);
  process.exit(1);
}
