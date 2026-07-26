/**
 * P0 회귀 테스트. 프레임워크 없이 node로 바로 돈다.
 *
 *   yarn test
 *
 * 여기 있는 세 가지는 깨지면 조용히 프라이버시 사고가 되는 항목들이라
 * 반드시 자동으로 지켜야 한다.
 *   1. 소곤파일 가시성  : 상대에게는 '열린 파일'만 보여야 한다
 *   2. 연결 정원        : 한 소곤폴더에 3명이 들어갈 수 없어야 한다
 *   3. 열리는 시점      : 정해둔 날이 지나면 실제로 열 수 있어야 한다
 *   + 비밀번호 해싱/기존 계정 마이그레이션
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'sogonzip-test-'));

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`         expected: ${JSON.stringify(expected)}`);
    console.log(`         actual:   ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

function bundle(entry, outfile) {
  execFileSync(
    join(root, 'node_modules/.bin/esbuild'),
    [
      join(root, entry),
      '--bundle',
      '--format=esm',
      '--platform=neutral',
      '--log-level=error',
      `--outfile=${join(work, outfile)}`
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  return import(pathToFileURL(join(work, outfile)).href);
}

// stderr을 파이프로 받는다. 제약 위반을 일부러 유발하는 테스트가 있어서
// sqlite3의 에러 출력이 결과에 섞이면 안 된다.
function sqlite(db, sql) {
  return execFileSync('sqlite3', [db, sql], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

// ---------------------------------------------------------------- 열리는 시점
async function testOpeningRules() {
  const { resolveOpening, isOpenable, OPENING_LABELS } = await bundle(
    'shared/sogonOpening.ts',
    'opening.mjs'
  );

  const now = new Date('2026-07-26T12:00:00.000Z');
  const plusDays = n => new Date(now.getTime() + n * 86_400_000);

  section('[열리는 시점] 라벨이 실제 날짜로 변환된다');
  check(
    "'100일 후'가 실제 날짜를 만든다",
    resolveOpening({ openingTime: '100일 후', now }).openingAt,
    plusDays(100).toISOString()
  );
  check(
    "'지금 알려도 좋아요'는 바로 ready",
    resolveOpening({ openingTime: '지금 알려도 좋아요', now }).status,
    'ready'
  );
  check(
    "'열고 싶지 않아요'는 closed + 날짜 없음",
    resolveOpening({ openingTime: '열고 싶지 않아요', now }),
    { openingTime: '열고 싶지 않아요', openingAt: null, status: 'closed' }
  );
  check(
    "'내가 직접 열게요'는 날짜를 만들지 않는다",
    resolveOpening({ openingTime: '내가 직접 열게요', now }).openingAt,
    null
  );
  check(
    '알 수 없는 옛 라벨은 날짜를 지어내지 않고 보존한다',
    resolveOpening({ openingTime: 'D+100 열림 예정', now }),
    { openingTime: 'D+100 열림 예정', openingAt: null, status: 'scheduled' }
  );

  section('[열리는 시점] 정해둔 날이 오면 열 수 있다');
  const scheduled = { status: 'scheduled', openingAt: plusDays(100).toISOString() };
  check('생성 당일에는 못 연다', isOpenable(scheduled, now), false);
  check('99일 뒤에도 못 연다', isOpenable(scheduled, plusDays(99)), false);
  check('100일 뒤에는 열 수 있다', isOpenable(scheduled, plusDays(100)), true);
  check(
    '날짜 없는 수동 파일은 영원히 자동으로 열리지 않는다',
    isOpenable({ status: 'scheduled', openingAt: null }, new Date('2099-01-01')),
    false
  );

  section('[열리는 시점] 화면 간 라벨이 하나로 통일됐다');
  check('옵션 목록은 한 곳에서만 정의된다', OPENING_LABELS.length, 7);
  check("드리프트되던 'D+100 열림 예정' 제거", OPENING_LABELS.includes('D+100 열림 예정'), false);
}

// -------------------------------------------------------------------- 비밀번호
async function testPasswords() {
  const { createPasswordRecord, verifyPassword } = await bundle(
    'BE/functions/api/_shared.ts',
    'shared_be.mjs'
  );

  section('[비밀번호] 유저별 salt + PBKDF2');
  const record = await createPasswordRecord('sogon-secret-1');
  check('반복 횟수를 레코드에 남긴다', record.algo, 'pbkdf2-sha256-50000');
  check('salt는 16바이트', record.salt.length, 32);
  check('맞는 비밀번호 통과', (await verifyPassword('sogon-secret-1', record)).ok, true);
  check('틀린 비밀번호 거절', (await verifyPassword('nope', record)).ok, false);

  const second = await createPasswordRecord('sogon-secret-1');
  check('같은 비밀번호라도 해시가 다르다 (레인보우 테이블 무력화)', record.hash === second.hash, false);

  section('[비밀번호] 0001 스키마 기존 계정 마이그레이션');
  const legacyHash = [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sogonzip-beta:oldpw'))
    )
  ]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  const legacy = { hash: legacyHash, salt: null, algo: 'sha256-legacy' };

  check('기존 계정도 그대로 로그인된다', (await verifyPassword('oldpw', legacy)).ok, true);
  check('로그인 성공 시 재해싱 대상으로 표시', (await verifyPassword('oldpw', legacy)).needsUpgrade, true);
  check('기존 계정 틀린 비밀번호 거절', (await verifyPassword('wrong', legacy)).ok, false);
}

// ------------------------------------------------------------ 가시성 / 방 정원
function buildSchema(db) {
  for (const file of ['0001_beta_schema.sql', '0002_security_and_scheduling.sql']) {
    execFileSync('sqlite3', [db], {
      input: readFileSync(join(root, 'BE/migrations', file), 'utf8'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

function seedRoom(db) {
  execFileSync('sqlite3', [db], {
    stdio: ['pipe', 'pipe', 'pipe'],
    input: `
      INSERT INTO rooms VALUES ('room_ab','lover','A & B','2026-01-01');
      INSERT INTO members (id,room_id,login_id,account_code,password_hash,nickname,role,created_at) VALUES
        ('mem_a','room_ab','a','CODEAAAA','h','A','member','2026-01-01'),
        ('mem_b','room_ab','b','CODEBBBB','h','B','member','2026-01-01'),
        ('mem_c',NULL,'c','CODECCCC','h','C','member','2026-01-01');
      INSERT INTO sogon_files
        (id,room_id,author_member_id,tags_json,content,sensitivity,opening_time,opening_at,recommendation_on,status,created_at,updated_at) VALUES
        ('f_sched','room_ab','mem_a','["비밀"]','A의 안 연 비밀','x','100일 후','2026-11-03T00:00:00Z',1,'scheduled','2026-07-26','2026-07-26'),
        ('f_closed','room_ab','mem_a','["비밀"]','A가 닫아둔 마음','x','열고 싶지 않아요',NULL,0,'closed','2026-07-26','2026-07-26'),
        ('f_opened','room_ab','mem_a','["선물"]','A가 연 파일','x','지금 알려도 좋아요','2026-07-26T00:00:00Z',1,'opened','2026-07-26','2026-07-26'),
        ('f_due','room_ab','mem_a','["음식"]','개봉일 지난 파일','x','100일 후','2026-01-01T00:00:00Z',1,'scheduled','2025-09-01','2025-09-01');
    `
  });
}

function testRoomAndVisibility() {
  const db = join(work, 'test.db');
  buildSchema(db);
  seedRoom(db);

  section('[가시성] 상대에게는 열린 파일만 보인다');
  const visibleToB = sqlite(
    db,
    `SELECT group_concat(id) FROM sogon_files
      WHERE room_id='room_ab' AND (author_member_id='mem_b' OR status='opened');`
  );
  check('B에게 보이는 파일은 열린 것뿐', visibleToB, 'f_opened');

  const visibleToA = sqlite(
    db,
    `SELECT count(*) FROM sogon_files
      WHERE room_id='room_ab' AND (author_member_id='mem_a' OR status='opened');`
  );
  check('A는 자기 파일 4개를 모두 본다', visibleToA, '4');

  section('[열리는 시점] 지연 승격 UPDATE');
  sqlite(
    db,
    `UPDATE sogon_files SET status='ready', updated_at='2026-07-26T12:00:00Z'
      WHERE room_id='room_ab' AND status='scheduled'
        AND opening_at IS NOT NULL AND opening_at <= '2026-07-26T12:00:00Z';`
  );
  check(
    '개봉일이 지난 파일은 ready로 올라간다',
    sqlite(db, `SELECT status FROM sogon_files WHERE id='f_due';`),
    'ready'
  );
  check(
    '아직 안 된 파일은 그대로 scheduled',
    sqlite(db, `SELECT status FROM sogon_files WHERE id='f_sched';`),
    'scheduled'
  );

  section('[연결] 소곤폴더 정원은 2명');
  check(
    '이미 찬 방은 인원수로 걸러진다',
    sqlite(db, `SELECT count(*) FROM members WHERE room_id='room_ab';`),
    '2'
  );
  check(
    '이미 방이 있는 사람은 조건부 UPDATE가 적용되지 않는다',
    sqlite(
      db,
      `UPDATE members SET room_id='room_other' WHERE id='mem_a' AND room_id IS NULL;
       SELECT changes();`
    ),
    '0'
  );

  section('[삭제] 소곤파일은 작성자만 지울 수 있다');
  check(
    '남의 파일 삭제 시도는 0건 변경',
    sqlite(
      db,
      `DELETE FROM sogon_files WHERE id='f_sched' AND room_id='room_ab' AND author_member_id='mem_b';
       SELECT changes();`
    ),
    '0'
  );
  check(
    '내 파일 삭제는 성공',
    sqlite(
      db,
      `DELETE FROM sogon_files WHERE id='f_closed' AND room_id='room_ab' AND author_member_id='mem_a';
       SELECT changes();`
    ),
    '1'
  );

  section('[삭제] 방 해체가 계정을 지우면 안 된다 (FK CASCADE 지뢰)');
  // members.room_id에 ON DELETE CASCADE가 걸려 있어서, 방을 먼저 지우면
  // 그 방의 계정까지 삭제된다. dissolveRoom은 멤버를 먼저 떼어낸다.
  const naive = join(work, 'naive.db');
  buildSchema(naive);
  seedRoom(naive);
  sqlite(naive, `PRAGMA foreign_keys=ON; DELETE FROM rooms WHERE id='room_ab';`);
  check(
    '순진하게 방부터 지우면 그 방의 계정 2개가 함께 사라진다 (하면 안 되는 방식)',
    sqlite(naive, `SELECT group_concat(id) FROM members ORDER BY id;`),
    'mem_c'
  );

  const safe = join(work, 'safe.db');
  buildSchema(safe);
  seedRoom(safe);
  sqlite(
    safe,
    `PRAGMA foreign_keys=ON;
     UPDATE members SET room_id = NULL WHERE room_id='room_ab';
     DELETE FROM sogon_files WHERE room_id='room_ab';
     DELETE FROM preferences WHERE room_id='room_ab';
     DELETE FROM rooms WHERE id='room_ab';`
  );
  check('dissolveRoom 순서대로 하면 계정은 남는다', sqlite(safe, `SELECT count(*) FROM members;`), '3');
  check('공유 소곤파일은 사라진다', sqlite(safe, `SELECT count(*) FROM sogon_files;`), '0');
  check('방은 사라진다', sqlite(safe, `SELECT count(*) FROM rooms;`), '0');
  check(
    '남은 사람은 연결이 풀린 상태',
    sqlite(safe, `SELECT count(*) FROM members WHERE room_id IS NULL;`),
    '3'
  );

  section('[연결] pending 요청 중복 차단');
  sqlite(db, `INSERT INTO connection_requests VALUES ('r1','mem_c','mem_a','pending','2026-07-26',NULL);`);
  let duplicateBlocked = false;
  try {
    sqlite(db, `INSERT INTO connection_requests VALUES ('r2','mem_c','mem_a','pending','2026-07-26',NULL);`);
  } catch {
    duplicateBlocked = true;
  }
  check('같은 상대에게 pending 요청은 하나만', duplicateBlocked, true);

  sqlite(db, `UPDATE connection_requests SET status='declined' WHERE id='r1';`);
  let reRequestAllowed = true;
  try {
    sqlite(db, `INSERT INTO connection_requests VALUES ('r3','mem_c','mem_a','pending','2026-07-27',NULL);`);
  } catch {
    reRequestAllowed = false;
  }
  check('거절된 뒤에는 다시 요청할 수 있다', reRequestAllowed, true);
}

try {
  await testOpeningRules();
  await testPasswords();
  testRoomAndVisibility();
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
