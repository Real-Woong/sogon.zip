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
/** 순서대로 실행해야 하는 append-only 마이그레이션. 새 파일을 만들면 여기 더한다. */
const MIGRATIONS = [
  '0001_beta_schema.sql',
  '0002_security_and_scheduling.sql',
  '0003_recommendation.sql',
  '0004_date_plans.sql',
  '0005_date_plan_window.sql',
  '0006_core_preference_answers.sql',
  '0007_date_plan_course_pattern.sql',
  '0008_member_course_preferences.sql'
];

function buildSchema(db) {
  for (const file of MIGRATIONS) {
    execFileSync('sqlite3', [db], {
      input: readFileSync(join(root, 'BE/migrations', file), 'utf8'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

// --------------------------------------------------------- 날짜 / 오늘의 질문
async function testDateQuestionRules() {
  const {
    DATE_QUESTIONS,
    dateKeyInTimeZone,
    daysBetweenDateKeys,
    isDateKey,
    questionForDate
  } = await bundle('shared/dateQuestions.ts', 'date_questions.mjs');

  section('[날짜/질문] 한국 날짜 기준으로 D-7부터 하루 한 문항');
  check('문항은 D-7부터 D-1까지 7개다', DATE_QUESTIONS.length, 7);
  check('D-7은 첫 문항', questionForDate('2026-08-17', '2026-08-10').id, DATE_QUESTIONS[0].id);
  check('D-1은 마지막 문항', questionForDate('2026-08-11', '2026-08-10').id, DATE_QUESTIONS[6].id);
  check('D-8에는 아직 묻지 않는다', questionForDate('2026-08-18', '2026-08-10'), null);
  check('약속 당일에는 새 질문이 없다', questionForDate('2026-08-10', '2026-08-10'), null);
  check('윤년을 건너도 날짜 차이가 맞다', daysBetweenDateKeys('2028-02-28', '2028-03-01'), 2);
  check('없는 날짜는 거절한다', isDateKey('2026-02-30'), false);
  check(
    'UTC 날짜가 전날이어도 한국 날짜를 쓴다',
    dateKeyInTimeZone(new Date('2026-08-09T15:30:00.000Z')),
    '2026-08-10'
  );

  section('[날짜/질문] 선택지는 학습 신호 한 축을 공유한다');
  check(
    '반대 선택이 같은 axis/tag의 부호만 바꾼다',
    DATE_QUESTIONS.every(question => {
      const [left, right] = question.options;
      return left.axis === right.axis && left.tag === right.tag && left.weight === -right.weight;
    }),
    true
  );
}

async function testCorePreferenceRules() {
  const {
    CORE_PREFERENCE_OPTIONS,
    CORE_PREFERENCE_QUESTIONS,
    CORE_PREFERENCE_TOTAL,
    findCorePreference
  } = await bundle('shared/corePreferences.ts', 'core_preferences.mjs');

  section('[핵심취향] 실제 장소 데이터로 판정 가능한 20문항');
  check('필수 문항은 20개다', CORE_PREFERENCE_TOTAL, 20);
  check('질문 id가 겹치지 않는다', new Set(CORE_PREFERENCE_QUESTIONS.map(item => item.id)).size, 20);
  check('추천 피처 tag가 겹치지 않는다', new Set(CORE_PREFERENCE_QUESTIONS.map(item => item.tag)).size, 20);
  check('좋음·중립·피함 세 단계다', CORE_PREFERENCE_OPTIONS.map(item => item.weight), [1, 0, -1]);
  check('정의되지 않은 답은 거절한다', findCorePreference('food-korean', 'maybe'), null);

  const db = join(work, 'core-preferences.db');
  buildSchema(db);
  seedRoom(db);
  sqlite(
    db,
    `INSERT INTO core_preference_answers
       (id,room_id,member_id,question_id,option_id,axis,tag,weight,created_at,updated_at)
     VALUES ('core_1','room_ab','mem_a','food-korean','like','food','cuisine:korean',1,'2026-08-12','2026-08-12');`
  );
  let duplicate = false;
  try {
    sqlite(
      db,
      `INSERT INTO core_preference_answers
         (id,room_id,member_id,question_id,option_id,axis,tag,weight,created_at,updated_at)
       VALUES ('core_2','room_ab','mem_a','food-korean','avoid','food','cuisine:korean',-1,'2026-08-12','2026-08-12');`
    );
  } catch {
    duplicate = true;
  }
  check('한 사람은 한 질문에 답 하나만 가진다', duplicate, true);
  check(
    '소곤파일 본문으로 가는 경로가 없다',
    /content/i.test(sqlite(db, `SELECT group_concat(name) FROM pragma_table_info('core_preference_answers');`)),
    false
  );
}

function testDatePlanSchema() {
  const db = join(work, 'date-plans.db');
  buildSchema(db);
  seedRoom(db);

  sqlite(
    db,
    `PRAGMA foreign_keys=ON;
     INSERT INTO date_plans
       (id,room_id,created_by,title,scheduled_date,start_time,status,created_at,updated_at)
       VALUES ('plan_1','room_ab','mem_a','성수 데이트','2026-08-17','14:30','planned','2026-08-10','2026-08-10');
     INSERT INTO date_plans
       (id,room_id,created_by,title,scheduled_date,start_time,status,created_at,updated_at)
       VALUES ('plan_past','room_ab','mem_b','지난 데이트','2026-08-01','18:00','planned','2026-07-30','2026-07-30');
     INSERT INTO preferences VALUES ('pref_q1','room_ab','mem_a','오늘의 질문','질문 — 답','2026-08-10');
     INSERT INTO date_question_answers
       (id,plan_id,room_id,member_id,question_id,option_id,axis,tag,weight,preference_id,answered_on,created_at)
       VALUES ('ans_1','plan_1','room_ab','mem_a','activity-energy','active','activity','active',1,'pref_q1','2026-08-10','2026-08-10');`
  );

  section('[날짜/약속] 방의 두 사람에게 같은 약속이 보인다');
  check(
    'room_id로 조회하면 만든 사람과 무관하게 약속이 나온다',
    sqlite(db, `SELECT group_concat(title, ',') FROM (SELECT title FROM date_plans WHERE room_id='room_ab' AND status='planned' ORDER BY scheduled_date);`),
    '지난 데이트,성수 데이트'
  );

  section('[날짜/캘린더] 지난 데이트도 기록에 남는다');
  check(
    '다가오는 약속 목록은 오늘 이후만 조회한다',
    sqlite(db, `SELECT group_concat(title) FROM date_plans WHERE room_id='room_ab' AND status='planned' AND scheduled_date >= '2026-08-10';`),
    '성수 데이트'
  );
  check(
    '캘린더는 지난 약속도 함께 조회한다',
    sqlite(db, `SELECT group_concat(title, ',') FROM (SELECT title FROM date_plans WHERE room_id='room_ab' AND status IN ('planned','completed') ORDER BY scheduled_date);`),
    '지난 데이트,성수 데이트'
  );

  section('[날짜/질문] 같은 사람이 같은 문항에 두 번 답하지 않는다');
  let duplicateAnswer = false;
  try {
    sqlite(
      db,
      `INSERT INTO date_question_answers
        (id,plan_id,room_id,member_id,question_id,option_id,axis,tag,weight,answered_on,created_at)
       VALUES ('ans_2','plan_1','room_ab','mem_a','activity-energy','calm','activity','active',-1,'2026-08-10','2026-08-10');`
    );
  } catch {
    duplicateAnswer = true;
  }
  check('계획·사람·문항 단위 중복이 막힌다', duplicateAnswer, true);

  sqlite(
    db,
    `INSERT INTO date_question_answers
      (id,plan_id,room_id,member_id,question_id,option_id,axis,tag,weight,answered_on,created_at)
     VALUES ('ans_3','plan_1','room_ab','mem_b','activity-energy','calm','activity','active',-1,'2026-08-10','2026-08-10');`
  );
  check(
    '두 사람 답은 개인 단위로 각각 남는다',
    sqlite(db, `SELECT group_concat(member_id || ':' || weight) FROM date_question_answers ORDER BY member_id;`),
    'mem_a:1.0,mem_b:-1.0'
  );

  section('[날짜/추천] 추천 요청은 날짜 계획을 선택적으로 참조한다');
  sqlite(
    db,
    `INSERT INTO recommendation_requests
      (id,room_id,requested_by,target_date,ranker_version,created_at,plan_id)
     VALUES ('rq_plan','room_ab','mem_a','2026-08-17','rules-v0','2026-08-10','plan_1');`
  );
  check('plan_id로 추천 요청을 찾는다', sqlite(db, `SELECT plan_id FROM recommendation_requests WHERE id='rq_plan';`), 'plan_1');

  section('[날짜/프라이버시] 날짜와 질문에는 소곤파일 본문 경로가 없다');
  const answerColumns = sqlite(db, `SELECT group_concat(name) FROM pragma_table_info('date_question_answers');`);
  check('질문 답 테이블에 content 컬럼이 없다', /content/i.test(answerColumns), false);
  check(
    '질문 답은 sogon_files를 참조하지 않는다',
    sqlite(db, `SELECT count(*) FROM pragma_foreign_key_list('date_question_answers') WHERE "table"='sogon_files';`),
    '0'
  );
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

// ------------------------------------------------------------------- 추천 기반
async function testPlaceNormalize() {
  const {
    computeInfoConfidence,
    dateRangesOverlap,
    geohashEncode,
    geohashWithNeighbors,
    normalizePlaceName,
    haversineMeters
  } = await bundle('shared/placeNormalize.ts', 'place.mjs');

  section('[추천/병합] 같은 장소는 같은 키로 정규화된다');
  check(
    '괄호 지점 표기와 붙여쓴 지점 표기가 같은 키가 된다',
    normalizePlaceName('성수 티하우스 (성수점)') === normalizePlaceName('성수티하우스 성수점'),
    true
  );
  check(
    '이름이 짧아도 지점 괄호는 떼어낸다',
    normalizePlaceName('카페 (2호점)') === normalizePlaceName('카페 2호점'),
    true
  );
  check('대소문자·공백 차이를 흡수한다', normalizePlaceName('  BLUE BOTTLE  성수점 '), 'bluebottle');
  check(
    '지점 표기만 남는 이름은 통째로 지우지 않는다',
    normalizePlaceName('본점').length > 0,
    true
  );
  check(
    '다른 장소는 다른 키를 유지한다',
    normalizePlaceName('성수 티하우스') === normalizePlaceName('성수 커피하우스'),
    false
  );

  section('[추천/병합] 지점 표기 말고는 괄호 안을 지우지 않는다 (Q5)');
  // 서울 문화행사 제목은 `[주최기관] 제목 [작품명]`이라 괄호를 다 지우면
  // "뮤지컬"만 남아 서로 다른 공연 6건이 같은 장소로 판정됐다.
  check(
    '주최기관·작품명이 살아남는다',
    normalizePlaceName('[세종문화회관] 뮤지컬 [베토벤]'),
    '세종문화회관뮤지컬베토벤'
  );
  check(
    '같은 장르의 다른 공연은 다른 키다',
    normalizePlaceName('[세종문화회관] 뮤지컬 [베토벤]') ===
      normalizePlaceName('[중구문화재단] 뮤지컬 [디어 에반 핸슨]'),
    false
  );
  check(
    '좌표까지 같은 같은 기획의 다른 회차도 구분된다',
    normalizePlaceName('[서울갤러리] 런치 스테이지 [기타리스트 HOOON]') ===
      normalizePlaceName('[서울갤러리] 런치 스테이지 [해금 솔로 아티스트 우하린]'),
    false
  );
  check(
    '괄호 밖이 길어도 괄호 안을 지우지 않는다',
    normalizePlaceName('[세종문화회관] 세종예술아카데미 [박인홍 작가] 여행드로잉 클래스') ===
      normalizePlaceName('[세종문화회관] 세종예술아카데미 [정승빈 작가] 여행드로잉 클래스'),
    false
  );
  check(
    '괄호는 문자만 사라져서 괄호 없는 표기와 여전히 병합된다',
    normalizePlaceName('블루보틀 (성수)') === normalizePlaceName('블루보틀 성수'),
    true
  );

  section('[추천/병합] 기간이 안 겹치면 같은 장소가 아니다 (Q5)');
  const august = { startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-31T00:00:00Z' };
  const september = { startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-30T00:00:00Z' };
  check('같은 극장의 다음 달 공연은 겹치지 않는다', dateRangesOverlap(august, september), false);
  check(
    '하루라도 걸치면 겹친다',
    dateRangesOverlap(august, { startsAt: '2026-08-31T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' }),
    true
  );
  check('기간이 없는 상시 장소는 항상 겹친다', dateRangesOverlap({}, august), true);
  check(
    '시작일만 있는 쪽은 그 뒤로 열려 있다',
    dateRangesOverlap({ startsAt: '2026-07-01T00:00:00Z' }, september),
    true
  );
  check(
    '종료일만 있는 쪽은 그 앞으로 열려 있다',
    dateRangesOverlap({ endsAt: '2026-07-01T00:00:00Z' }, september),
    false
  );

  section('[추천/후보생성] 격자 경계에서 후보가 새지 않는다');
  const seoul = { lat: 37.5665, lng: 126.978 };
  check('geohash5는 5자리', geohashEncode(seoul.lat, seoul.lng, 5).length, 5);

  const cells = geohashWithNeighbors(geohashEncode(seoul.lat, seoul.lng, 5));
  check('이웃 집합은 자기 셀 포함 9개이고 중복이 없다', new Set(cells).size, 9);

  // 셀 하나만 조회하면 경계 바로 건너편 장소가 통째로 빠진다.
  // ±4km 범위를 훑어 전부 이웃 집합 안에 들어오는지 본다.
  let outside = 0;
  for (let dLat = -0.036; dLat <= 0.0361; dLat += 0.004) {
    for (let dLng = -0.045; dLng <= 0.0451; dLng += 0.005) {
      if (!cells.includes(geohashEncode(seoul.lat + dLat, seoul.lng + dLng, 5))) {
        outside += 1;
      }
    }
  }
  check('±4km 안의 좌표는 모두 이웃 격자 안에 있다', outside, 0);
  check(
    '경도 180도 근처에서도 이웃 계산이 깨지지 않는다',
    new Set(geohashWithNeighbors(geohashEncode(0, 179.999, 5))).size,
    9
  );

  section('[추천/거리] 하버사인');
  const distance = haversineMeters(seoul, { lat: 37.4979, lng: 127.0276 });
  check('서울시청-강남역이 8~9km로 나온다', distance > 8000 && distance < 9500, true);
  check('같은 좌표는 0m', haversineMeters(seoul, seoul), 0);

  section('[추천/신뢰도] 종료일 없는 팝업은 만점을 받지 못한다');
  const full = { address: 'a', priceLevel: 2, isIndoor: true, tags: ['조용한'], openingHours: {} };
  check('종료일 없는 팝업은 0.5로 눌린다', computeInfoConfidence({ kind: 'popup', ...full }), 0.5);
  check('종료일 있는 팝업은 만점', computeInfoConfidence({ kind: 'popup', ...full, endsAt: '2026-12-01' }), 1);
  check('상시 카페는 종료일 없이도 만점', computeInfoConfidence({ kind: 'cafe', ...full }), 1);
  check('정보가 없으면 낮다', computeInfoConfidence({ kind: 'cafe' }), 0.1);
}

// --------------------------------------------------------------- 만료 장소 Cron
async function testCloseExpiredRules() {
  const { CloseExpiredError, closeExpired } = await bundle(
    'workers/close-expired/src/index.ts',
    'close_expired.mjs'
  );

  function fakeDb(rows, { failUpdate = false, leaveExpired = false } = {}) {
    return {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async first() {
                const cutoff = values[0];
                return {
                  count: rows.filter(
                    row => row.status === 'active' && row.endsAt !== null && row.endsAt < cutoff
                  ).length
                };
              },
              async run() {
                if (failUpdate) throw new Error('D1 쓰기 실패');
                const [updatedAt, cutoff] = values;
                let changed = 0;
                for (const row of rows) {
                  if (row.status !== 'active' || row.endsAt === null || row.endsAt >= cutoff) continue;
                  if (leaveExpired && changed > 0) continue;
                  row.status = 'closed';
                  row.updatedAt = updatedAt;
                  changed += 1;
                }
                return { success: true, meta: { changes: changed } };
              }
            };
          }
        };
      }
    };
  }

  const cutoff = '2026-08-10T18:05:00.000Z';
  const rows = [
    { id: 'expired_1', status: 'active', endsAt: '2026-08-09T14:59:59.999Z' },
    { id: 'expired_2', status: 'active', endsAt: '2026-08-10T14:59:59.999Z' },
    { id: 'future', status: 'active', endsAt: '2026-08-11T14:59:59.999Z' },
    { id: 'permanent', status: 'active', endsAt: null },
    { id: 'manual_closed', status: 'closed', endsAt: '2026-08-01T14:59:59.999Z' }
  ];

  section('[추천/만료정리] Cron은 끝난 active 장소만 닫는다');
  const first = await closeExpired(fakeDb(rows), cutoff);
  check('후보·성공·실패 건수를 검증한다', first, {
    cutoff,
    candidateCount: 2,
    successCount: 2,
    failureCount: 0
  });
  check(
    '상시·미종료·이미 닫힌 장소는 건드리지 않는다',
    rows.map(row => `${row.id}:${row.status}`),
    [
      'expired_1:closed',
      'expired_2:closed',
      'future:active',
      'permanent:active',
      'manual_closed:closed'
    ]
  );

  const second = await closeExpired(fakeDb(rows), cutoff);
  check('같은 시각으로 재실행해도 다시 바뀌지 않는다', second.successCount, 0);

  section('[추천/만료정리] 일부 또는 전체 실패를 건수와 함께 드러낸다');
  const partialRows = [
    { id: 'expired_1', status: 'active', endsAt: '2026-08-09T14:59:59.999Z' },
    { id: 'expired_2', status: 'active', endsAt: '2026-08-09T14:59:59.999Z' }
  ];
  let partialResult = null;
  try {
    await closeExpired(fakeDb(partialRows, { leaveExpired: true }), cutoff);
  } catch (error) {
    if (error instanceof CloseExpiredError) partialResult = error.result;
  }
  check('재확인에서 남은 행은 실패 건수로 남긴다', partialResult, {
    cutoff,
    candidateCount: 2,
    successCount: 1,
    failureCount: 1
  });

  let failedResult = null;
  try {
    await closeExpired(
      fakeDb([{ id: 'expired', status: 'active', endsAt: '2026-08-09T14:59:59.999Z' }], {
        failUpdate: true
      }),
      cutoff
    );
  } catch (error) {
    if (error instanceof CloseExpiredError) failedResult = error.result;
  }
  check('D1 쓰기 실패도 후보 전체를 실패 건수로 남긴다', failedResult, {
    cutoff,
    candidateCount: 1,
    successCount: 0,
    failureCount: 1
  });
}

function testRecommendationSchema() {
  const db = join(work, 'rec.db');
  buildSchema(db);
  seedRoom(db);

  sqlite(
    db,
    `INSERT INTO places (id,kind,name,name_normalized,lat,lng,geohash5,info_confidence,status,created_at,updated_at)
       VALUES ('pl_1','popup','성수 팝업','성수팝업',37.54,127.05,'wydm7',0.8,'active','2026-08-09','2026-08-09');
     INSERT INTO place_sources VALUES ('src_1','pl_1','manual','ext_1',NULL,'2026-08-09');
     INSERT INTO recommendation_requests (id,room_id,requested_by,target_date,ranker_version,created_at)
       VALUES ('rq_1','room_ab','mem_a','2026-08-15','rules-v0','2026-08-09');
     INSERT INTO recommendation_impressions
       VALUES ('im_1','rq_1','pl_1',1,1,0.82,'{"min_fit":0.7}',NULL,'2026-08-09');
     INSERT INTO recommendation_feedback VALUES ('fb_1','rq_1','pl_1','mem_a','saved',5,'2026-08-09');`
  );

  section('[추천/수집] 배치를 다시 돌려도 중복 행이 생기지 않는다');
  let idempotent = false;
  try {
    sqlite(db, `INSERT INTO place_sources VALUES ('src_2','pl_1','manual','ext_1',NULL,'2026-08-10');`);
  } catch {
    idempotent = true;
  }
  check('같은 (source, external_id)는 한 번만 들어간다', idempotent, true);

  section('[추천/피드백] 개인 단위로 기록된다');
  // 점수식의 min(A 만족도, B 만족도)는 누가 만족했는지 모르면 학습할 수 없다.
  sqlite(db, `INSERT INTO recommendation_feedback VALUES ('fb_2','rq_1','pl_1','mem_b','skipped',NULL,'2026-08-09');`);
  check(
    '같은 추천에 대해 두 사람의 반응이 따로 남는다',
    sqlite(db, `SELECT group_concat(member_id || ':' || action) FROM recommendation_feedback WHERE request_id='rq_1' ORDER BY id;`),
    'mem_a:saved,mem_b:skipped'
  );

  let duplicateFeedback = false;
  try {
    sqlite(db, `INSERT INTO recommendation_feedback VALUES ('fb_3','rq_1','pl_1','mem_a','saved',4,'2026-08-09');`);
  } catch {
    duplicateFeedback = true;
  }
  check('같은 사람의 같은 반응은 중복 저장되지 않는다', duplicateFeedback, true);

  section('[추천/학습데이터] 장소가 닫혀도 로그는 남는다');
  // places를 물리 삭제하면 과거 추천 기록의 참조가 깨진다. 소프트 삭제만 한다.
  sqlite(db, `UPDATE places SET status='closed' WHERE id='pl_1';`);
  check(
    '팝업이 끝나도 노출 로그는 그대로다',
    sqlite(db, `SELECT count(*) FROM recommendation_impressions WHERE place_id='pl_1';`),
    '1'
  );
  check(
    '추천 당시 피처가 보존된다',
    sqlite(db, `SELECT features_json FROM recommendation_impressions WHERE id='im_1';`),
    '{"min_fit":0.7}'
  );

  let orphanBlocked = false;
  try {
    sqlite(
      db,
      `PRAGMA foreign_keys=ON;
       INSERT INTO recommendation_impressions VALUES ('im_9','rq_1','pl_none',2,NULL,0.1,'{}',NULL,'2026-08-09');`
    );
  } catch {
    orphanBlocked = true;
  }
  check('없는 장소로는 노출을 기록할 수 없다', orphanBlocked, true);

  section('[추천/프라이버시] 소곤파일 본문은 추천 경로에 들어가지 않는다');
  // preference_signals는 동의한 취향에서만 만들어진다. 스키마에 본문으로 가는
  // 경로가 아예 없어야 한다.
  const signalColumns = sqlite(db, `SELECT group_concat(name) FROM pragma_table_info('preference_signals');`);
  check('preference_signals에 content 계열 컬럼이 없다', /content/i.test(signalColumns), false);
  check(
    'preference_signals는 sogon_files를 참조하지 않는다',
    sqlite(db, `SELECT count(*) FROM pragma_foreign_key_list('preference_signals') WHERE "table"='sogon_files';`),
    '0'
  );

  section('[추천/하드제약] 알레르기는 점수가 아니라 필터다');
  sqlite(
    db,
    `INSERT INTO preference_signals VALUES ('ps_1','room_ab','mem_a','food','땅콩',-1,1,'manual',NULL,'2026-08-09','2026-08-09');
     INSERT INTO preference_signals VALUES ('ps_2','room_ab','mem_a','mood','조용한',0.8,0,'manual',NULL,'2026-08-09','2026-08-09');`
  );
  check(
    '하드 제약만 따로 조회된다',
    sqlite(db, `SELECT group_concat(tag) FROM preference_signals WHERE room_id='room_ab' AND is_hard_constraint=1;`),
    '땅콩'
  );

  let duplicateSignal = false;
  try {
    sqlite(db, `INSERT INTO preference_signals VALUES ('ps_3','room_ab','mem_a','food','땅콩',0.5,0,'extracted',NULL,'2026-08-09','2026-08-09');`);
  } catch {
    duplicateSignal = true;
  }
  check('같은 사람의 같은 축·태그는 한 행으로 유지된다', duplicateSignal, true);

  section('[추천/방 해체] 추천 신호는 방과 함께 정리된다');
  check(
    'room CASCADE로 preference_signals가 지워진다',
    sqlite(
      db,
      `PRAGMA foreign_keys=ON;
       UPDATE members SET room_id=NULL WHERE room_id='room_ab';
       DELETE FROM sogon_files WHERE room_id='room_ab';
       DELETE FROM preferences WHERE room_id='room_ab';
       DELETE FROM rooms WHERE id='room_ab';
       SELECT count(*) FROM preference_signals;`
    ),
    '0'
  );
  check('공용 장소 데이터는 방과 무관하게 남는다', sqlite(db, `SELECT count(*) FROM places;`), '1');
}

// ------------------------------------------------------------ 하루 코스 시간표
async function testCourseSkeleton() {
  const m = await bundle('shared/dateCourseSkeleton.ts', 'course_skeleton.mjs');
  const {
    buildCourseSkeleton,
    buildCustomCourseSkeleton,
    applyWeatherToSkeleton,
    minutesToTime,
    SERVICE_START_MINUTES,
    SERVICE_END_MINUTES
  } = m;

  const labelsOf = skeleton => skeleton.slots.map(slot => slot.label);

  section('[코스/골격] 식사는 시계에 못 박힌다');
  const day = buildCourseSkeleton({ startTime: '12:00', endTime: '21:00' });
  check('12~21시는 점심으로 시작한다', day.slots[0].label, '점심');
  check('점심은 12:00에 시작한다', day.slots[0].startTime, '12:00');
  check(
    '저녁은 창 끝에서 역산해 여유를 남긴다',
    day.slots.filter(slot => slot.label === '저녁').map(slot => `${slot.startTime}-${slot.endTime}`),
    ['18:50-20:20']
  );
  check('마지막은 여유로 끝난다', day.slots.at(-1).label, '여유');
  check('갈 곳은 4~5군데다', day.placeSlotCount >= 4 && day.placeSlotCount <= 5, true);

  section('[코스/직접구성] 사용자가 고른 순서를 그대로 쓴다');
  const custom = buildCustomCourseSkeleton({
    startTime: '12:00',
    endTime: '20:00',
    pattern: ['cafe', 'walk', 'activity', 'meal']
  });
  check(
    '기본 식사-활동 반복 대신 고른 순서가 나온다',
    custom.slots.filter(slot => slot.placeKinds.length > 0).map(slot => slot.kind),
    ['cafe', 'walk', 'activity', 'meal']
  );
  check('직접 구성도 시작과 끝을 정확히 채운다', [custom.slots[0].startTime, custom.slots.at(-1).endTime], ['12:00', '20:00']);
  check(
    '시간보다 장소가 많으면 거절한다',
    Boolean(buildCustomCourseSkeleton({ startTime: '12:00', endTime: '13:30', pattern: ['meal', 'cafe', 'activity'] }).error),
    true
  );

  section('[코스/직접구성] 정한 시간을 지키고, 모자라면 비율대로 줄인다');
  const durationsOf = skeleton => skeleton.slots
    .filter(slot => slot.placeKinds.length > 0)
    .map(slot => slot.endMinutes - slot.startMinutes);

  // 창 270분 - 이동 30분 = 장소 240분. 원한 건 90+180+60 = 330분.
  const shrunk = buildCustomCourseSkeleton({
    startTime: '12:00',
    endTime: '16:30',
    pattern: [
      { kind: 'meal', minutes: 90 },
      { kind: 'activity', minutes: 180 },
      { kind: 'cafe', minutes: 60 }
    ]
  });
  check('모자라면 최소 30분을 깔고 원한 비율대로 줄인다', durationsOf(shrunk), [67, 124, 49]);
  check('줄여도 창을 정확히 다 쓴다', [shrunk.slots[0].startTime, shrunk.slots.at(-1).endTime], ['12:00', '16:30']);
  check('줄일 때는 여유를 만들지 않는다', shrunk.slots.some(slot => slot.kind === 'buffer'), false);

  // 창 120분 - 이동 15분 = 장소 105분. 원한 건 60+30 = 90분.
  const roomy = buildCustomCourseSkeleton({
    startTime: '12:00',
    endTime: '14:00',
    pattern: [{ kind: 'meal', minutes: 60 }, { kind: 'cafe', minutes: 30 }]
  });
  check('창이 남아도 정한 시간을 늘리지 않는다', durationsOf(roomy), [60, 30]);
  check('남는 시간은 여유로 뗀다', roomy.slots.at(-1).label, '여유');
  check('여유까지 합쳐 창을 정확히 다 쓴다', roomy.slots.at(-1).endTime, '14:00');
  check(
    '한 칸도 30분 아래로는 줄이지 않는다',
    Math.min(...durationsOf(buildCustomCourseSkeleton({
      startTime: '12:00',
      endTime: '14:00',
      pattern: [
        { kind: 'meal', minutes: 240 },
        { kind: 'cafe', minutes: 30 },
        { kind: 'walk', minutes: 30 }
      ]
    }))) >= 30,
    true
  );

  section('[코스/골격] 늦게 시작하면 점심을 넣지 않는다');
  check('15시 시작에는 점심이 없다', labelsOf(buildCourseSkeleton({ startTime: '15:00', endTime: '20:00' })).includes('점심'), false);
  check('15시 시작에도 저녁은 있다', labelsOf(buildCourseSkeleton({ startTime: '15:00', endTime: '20:00' })).includes('저녁'), true);
  check('창이 짧으면 식사 하나로 끝난다', buildCourseSkeleton({ startTime: '13:00', endTime: '15:00' }).placeSlotCount, 1);

  section('[코스/골격] 시간표에 구멍도 겹침도 없다');
  // 이건 눈으로 못 잡는다. 처음 손으로 확인한 6개 케이스는 전부 멀쩡했는데
  // 전수 검사에서 2046개 중 481개가 깨져 있었다.
  let broken = 0;
  let outsideService = 0;
  let longestBuffer = 0;
  let checked = 0;
  for (let start = 0; start <= 23 * 60 + 45; start += 15) {
    for (let width = 90; width <= 14 * 60; width += 15) {
      const end = start + width;
      if (end > 24 * 60) continue;
      const skeleton = buildCourseSkeleton({
        startTime: minutesToTime(start),
        endTime: minutesToTime(end)
      });
      if (skeleton.error) continue;
      checked += 1;

      let cursor = skeleton.startMinutes;
      let ok = true;
      for (const slot of skeleton.slots) {
        if (slot.startMinutes !== cursor || slot.endMinutes <= slot.startMinutes) {
          ok = false;
          break;
        }
        if (slot.kind === 'buffer') {
          longestBuffer = Math.max(longestBuffer, slot.endMinutes - slot.startMinutes);
        }
        if (
          slot.placeKinds.length > 0 &&
          (slot.startMinutes < SERVICE_START_MINUTES || slot.endMinutes > SERVICE_END_MINUTES)
        ) {
          outsideService += 1;
        }
        cursor = slot.endMinutes;
      }
      if (!ok || cursor !== skeleton.endMinutes) broken += 1;
    }
  }
  check('검사한 시간 창이 2000개를 넘는다', checked > 2000, true);
  check('구멍·겹침이 하나도 없다', broken, 0);
  check('문 여는 시간 밖에 장소를 넣지 않는다', outsideService, 0);
  check('빈 시간이 1시간을 넘지 않는다', longestBuffer <= 60, true);

  section('[코스/골격] 문 연 곳이 없는 시간대는 잘라낸다');
  const early = buildCourseSkeleton({ startTime: '06:00', endTime: '21:00' });
  check('06시 시작은 08시로 당겨진다', early.slots[0].startTime, '08:00');
  check('사용자가 넣은 시각은 그대로 돌려준다', early.requestedStartMinutes, 6 * 60);
  check('잘랐다는 걸 문장으로 알려준다', Boolean(early.note), true);
  check('새벽만 잡으면 거절한다', Boolean(buildCourseSkeleton({ startTime: '02:00', endTime: '06:00' }).error), true);
  check('창이 너무 짧으면 거절한다', Boolean(buildCourseSkeleton({ startTime: '12:00', endTime: '13:00' }).error), true);

  section('[코스/날씨] 하루가 아니라 시간대로 판정한다');
  const rainy = applyWeatherToSkeleton(
    day.slots,
    Array.from({ length: 24 }, (_, hour) => ({
      hour,
      precipitationProbability: hour >= 17 ? 80 : 10,
      temperature: 22
    }))
  );
  check(
    '비 오기 전 슬롯은 그대로다',
    rainy.filter(slot => slot.endMinutes <= 17 * 60 && slot.weatherNote).length,
    0
  );
  check(
    '비 오는 시간대 슬롯만 실내로 바뀐다',
    rainy.filter(slot => slot.weatherNote).length > 0,
    true
  );
  check(
    '예보가 없으면 아무것도 바꾸지 않는다',
    applyWeatherToSkeleton(day.slots, []).filter(slot => slot.weatherNote).length,
    0
  );

  const walkDay = buildCourseSkeleton({ startTime: '18:00', endTime: '22:00' });
  const walkSlot = walkDay.slots.find(slot => slot.kind === 'walk');
  const swapped = applyWeatherToSkeleton(
    walkDay.slots,
    Array.from({ length: 24 }, (_, hour) => ({ hour, precipitationProbability: 90, temperature: 20 }))
  ).find(slot => slot.index === walkSlot.index);
  check('산책 슬롯은 종류 자체가 실내로 바뀐다', swapped.kind, 'activity');
  check('바꾼 이유를 사용자에게 보여줄 문장으로 남긴다', Boolean(swapped.weatherNote), true);
}

// ------------------------------------------------------------------- 영업시간
async function testOpeningHours() {
  const { parseOpeningHours, isOpenDuring, serializeOpeningHours } = await bundle(
    'shared/openingHours.ts',
    'opening_hours.mjs'
  );

  section('[영업시간] 읽을 수 있는 것만 읽는다');
  check('단순 범위를 읽는다', parseOpeningHours('10:00~22:00').weekly[1], [{ openMinutes: 600, closeMinutes: 1320 }]);
  check('공백·물결 표기가 달라도 읽는다', parseOpeningHours('11시30분 - 21시00분').parsed, true);
  check('24시간을 알아본다', parseOpeningHours('24시간 영업').alwaysOpen, true);
  check('HTML 태그를 걷어낸다', parseOpeningHours('<b>09:00~18:00</b>').parsed, true);
  check('심야 영업은 다음 날로 넘긴다', parseOpeningHours('18:00~02:00').weekly[0][0].closeMinutes, 26 * 60);

  section('[영업시간] 반쯤 읽느니 모른다고 한다');
  // 평일 시간을 주말에도 적용하면 일요일에 닫힌 가게를 열려 있다고 말하게 된다.
  check('요일마다 다르면 읽지 않는다', parseOpeningHours('평일 09:00~18:00, 주말 10:00~17:00').parsed, false);
  check('계절마다 다르면 읽지 않는다', parseOpeningHours('하절기 09:00~19:00 동절기 09:00~18:00').parsed, false);
  check('못 읽어도 원문은 남긴다', parseOpeningHours('평일 09:00~18:00').raw, '평일 09:00~18:00');
  check('시간 표기가 아니면 읽지 않는다', parseOpeningHours('연중무휴').parsed, false);

  section('[영업시간] 모름은 열림이 아니다');
  // 이 세 줄이 이 파일의 존재 이유다. 1,364건 전부 영업시간이 NULL인 상태에서
  // 모름을 열림으로 접으면 닫힌 가게로 사람을 보내는 코스가 나온다.
  check('데이터가 없으면 unknown', isOpenDuring(null, 1, 720, 780), 'unknown');
  check('못 읽은 원문만 있어도 unknown', isOpenDuring(parseOpeningHours('평일만 영업'), 1, 720, 780), 'unknown');
  const cafe = parseOpeningHours('10:00~22:00');
  check('영업시간 안이면 open', isOpenDuring(cafe, 1, 720, 780), 'open');
  check('여는 시각 전이면 closed', isOpenDuring(cafe, 1, 540, 600), 'closed');
  check('닫는 시각을 넘기면 closed', isOpenDuring(cafe, 1, 1290, 1350), 'closed');
  // 슬롯 전체가 들어와야 한다. 시작만 보면 닫기 10분 전에 들여보낸다.
  check('슬롯 끝이 영업시간을 넘으면 closed', isOpenDuring(cafe, 1, 1310, 1340), 'closed');
  check('24시간은 언제나 open', isOpenDuring(parseOpeningHours('24시간'), 3, 60, 120), 'open');

  section('[영업시간] 저장 형식');
  check('아무것도 못 읽었으면 NULL로 둔다', serializeOpeningHours(parseOpeningHours('')), null);
  check('원문만 있어도 저장한다', typeof serializeOpeningHours(parseOpeningHours('평일 09:00~18:00')), 'string');
}

// ------------------------------------------------------------- 실제 장소 채우기
async function testCoursePlaces() {
  const { buildCourseSkeleton } = await bundle(
    'shared/dateCourseSkeleton.ts',
    'course_places_skeleton.mjs'
  );
  const { fillCourseWithPlaces } = await bundle(
    'shared/dateCoursePlaces.ts',
    'course_places.mjs'
  );
  const { parseOpeningHours, serializeOpeningHours } = await bundle(
    'shared/openingHours.ts',
    'course_places_hours.mjs'
  );

  const day = buildCourseSkeleton({ startTime: '12:00', endTime: '21:00' });
  const candidate = (input = {}) => ({
    id: 'place_default',
    kind: 'activity',
    name: '상설 공간',
    address: '서울',
    areaCode: 'seongsu',
    isIndoor: true,
    tags: [],
    openingHoursJson: serializeOpeningHours(parseOpeningHours('09:00~22:00')),
    startsAt: null,
    endsAt: null,
    popularity: 0,
    infoConfidence: 0.5,
    ...input
  });
  const filled = fillCourseWithPlaces({
    slots: day.slots,
    scheduledDate: '2026-08-15',
    candidates: [
      candidate({ id: 'meal_closed', kind: 'restaurant', name: '닫힌 식당', openingHoursJson: serializeOpeningHours(parseOpeningHours('09:00~11:00')) }),
      candidate({ id: 'meal_unknown', kind: 'restaurant', name: '확인 필요한 식당', openingHoursJson: null }),
      candidate({ id: 'event_ended', kind: 'exhibition', name: '끝난 전시', startsAt: '2026-07-01', endsAt: '2026-08-14' }),
      candidate({ id: 'event_now', kind: 'exhibition', name: '지금 하는 전시', startsAt: '2026-08-01', endsAt: '2026-08-31' }),
      candidate({ id: 'activity_regular', name: '상설 체험' }),
      candidate({ id: 'cafe', kind: 'cafe', name: '카페' }),
      candidate({ id: 'park', kind: 'park', name: '공원' })
    ]
  });
  const places = filled.map(slot => slot.place).filter(Boolean);

  section('[코스/장소] 실제 날짜·종류·영업시간으로 슬롯을 채운다');
  check('진행 중인 기간 한정 행사를 활동보다 먼저 고른다', places.find(place => place.kind === 'exhibition')?.name, '지금 하는 전시');
  check('날짜가 끝난 행사는 들어가지 않는다', places.some(place => place.name === '끝난 전시'), false);
  check('닫힌 식당은 들어가지 않는다', places.some(place => place.name === '닫힌 식당'), false);
  check('영업시간 미상은 확인 경고를 붙인다', Boolean(places.find(place => place.id === 'meal_unknown')?.caution), true);
  check('같은 장소를 하루에 두 번 넣지 않는다', new Set(places.map(place => place.id)).size, places.length);

  const preferenceFilled = fillCourseWithPlaces({
    slots: day.slots,
    scheduledDate: '2026-08-15',
    preferenceSignals: [
      { memberId: 'a', tag: 'genre:art', weight: 1 },
      { memberId: 'b', tag: 'genre:art', weight: 1 },
      { memberId: 'a', tag: 'genre:history', weight: -1 },
      { memberId: 'b', tag: 'genre:history', weight: -1 }
    ],
    candidates: [
      candidate({ id: 'limited_history', name: '기간 한정 역사 행사', tags: ['genre:history'], startsAt: '2026-08-01', endsAt: '2026-08-31' }),
      candidate({ id: 'liked_art', kind: 'exhibition', name: '둘이 좋아하는 미술 전시', tags: ['genre:art'] })
    ]
  });
  const preferenceActivity = preferenceFilled.find(slot => slot.kind === 'activity')?.place;
  check('기간 한정 행사보다 둘의 공통 취향을 먼저 반영한다', preferenceActivity?.name, '둘이 좋아하는 미술 전시');
  check('왜 골랐는지 공통 취향 근거를 남긴다', preferenceActivity?.preferenceReason, '둘 다 좋아한다고 답한 미술을 반영했어요.');
}

// --------------------------------------------------------------------- 상권
async function testAreaConsistency() {
  const { AREA_OPTIONS, findAreaLabel } = await bundle('shared/areas.ts', 'areas_shared.mjs');
  const { AREAS } = await import(pathToFileURL(join(root, 'scripts/ingest/areas.mjs')).href);

  section('[상권] 화면 목록과 수집기 목록이 어긋나지 않는다');
  // 한쪽만 늘리면 고른 동네에 장소가 하나도 없거나, 수집한 동네를 아무도 고를 수 없다.
  check(
    '상권 코드가 같다',
    AREA_OPTIONS.map(area => area.code).sort(),
    AREAS.map(area => area.code).sort()
  );
  check(
    '라벨도 같다',
    AREA_OPTIONS.map(area => `${area.code}:${area.label}`).sort(),
    AREAS.map(area => `${area.code}:${area.label}`).sort()
  );
  check('없는 코드는 라벨이 없다', findAreaLabel('busan'), null);
  check('빈 값도 안전하다', findAreaLabel(null), null);
}

// --------------------------------------------------------------------- 패싯
async function testPlaceFacets() {
  const m = await bundle('shared/placeFacets.ts', 'place_facets.mjs');
  const names = JSON.parse(readFileSync(join(root, 'scripts/ingest/tourCategories.json'), 'utf8'));

  section('[패싯] 분류 코드 매핑이 실제 코드표와 맞는다');
  // 코드를 한 글자 틀리면 아무 태그도 안 붙는데 에러도 안 난다. 조용히 비는 게 제일 위험하다.
  const mapped = [...Object.keys(m.TOUR_CAT3_CUISINE), ...Object.keys(m.TOUR_CAT3_GENRE)];
  check('없는 코드에 매핑을 걸지 않았다', mapped.filter(code => !names[code]), []);
  check('공원 코드도 코드표에 있다', m.TOUR_CAT3_PARK.filter(code => !names[code]), []);
  check(
    '한 코드가 음식과 활동 양쪽에 있지 않다',
    Object.keys(m.TOUR_CAT3_CUISINE).filter(code => code in m.TOUR_CAT3_GENRE),
    []
  );

  section('[패싯] 두 소스가 같은 어휘로 접힌다');
  // 이게 이 파일의 존재 이유다. 접히지 않으면 슬롯 채울 때 둘이 영영 안 만난다.
  check('미술관/화랑 → art', m.facetsFromTourApi({ cat3: 'A02060500' }), ['genre:art']);
  check('전시/미술 → art', m.facetsFromSeoulCulture({ CODENAME: '전시/미술' }), ['genre:art']);
  check('한식 → cuisine', m.facetsFromTourApi({ cat3: 'A05020100' }), ['cuisine:korean']);
  check('카페는 음식 계열이다', m.facetsFromTourApi({ cat3: 'A05020900' }), ['cuisine:cafe']);

  section('[패싯] 모르면 붙이지 않는다');
  // openingHours가 모름을 열림으로 접지 않는 것과 같은 규칙이다.
  check('모르는 코드는 빈 배열', m.facetsFromTourApi({ cat3: 'Z99999999' }), []);
  check('코드가 없어도 안전하다', m.facetsFromTourApi({}), []);
  check('"기타"는 매핑하지 않는다', m.facetsFromSeoulCulture({ CODENAME: '기타' }), []);
  check(
    '요금이 빈값이면 유료로 접지 않는다',
    m.facetsFromSeoulCulture({ CODENAME: '기타', IS_FREE: '' }),
    []
  );
  check(
    '무료·유료는 그대로 남긴다',
    m.facetsFromSeoulCulture({ CODENAME: '연극', THEMECODE: '가족 문화행사', IS_FREE: '유료' }),
    ['genre:performance', 'audience:family', 'fee:paid']
  );

  section('[패싯] 다시 돌려도 태그가 불어나지 않는다');
  // 백필은 여러 번 돌린다. 붙이기만 하면 같은 값이 쌓이고 매핑을 고쳐도 옛 값이 남는다.
  const once = m.mergeFacets(['음식점'], m.facetsFromTourApi({ cat3: 'A05020100' }));
  const twice = m.mergeFacets(once, m.facetsFromTourApi({ cat3: 'A05020100' }));
  check('한 번 돌린 결과', once, ['cuisine:korean', '음식점']);
  check('두 번 돌려도 같다', twice, once);
  check(
    '매핑을 고치면 옛 패싯은 사라진다',
    m.mergeFacets(['cuisine:korean', '음식점'], ['cuisine:japanese']),
    ['cuisine:japanese', '음식점']
  );
  check('표시용 라벨은 지우지 않는다', m.mergeFacets(['전시/미술', '무료'], []), ['전시/미술', '무료']);
  check('패싯과 라벨을 구분한다', [m.isFacet('genre:art'), m.isFacet('전시/미술')], [true, false]);
  check('값만 꺼낼 수 있다', m.facetValues(['genre:art', 'fee:free', '무료'], 'genre'), ['art']);

  section('[패싯] 공원은 A02에 있어도 park이다');
  // TourAPI는 "공원"을 A02(인문) 밑에 둔다. cat1='A01'만 보면 26곳을 놓치고,
  // 산책 슬롯이 찾을 수 있는 장소가 서울 전체에서 7곳으로 줄어든다.
  check(
    '공원(A02020700)은 park',
    m.kindFromTourApi({ contenttypeid: '12', cat1: 'A02', cat3: 'A02020700' }),
    'park'
  );
  check('공원은 실외다', m.isIndoorForKind('park'), false);
  check(
    '테마공원은 park이 아니다',
    m.kindFromTourApi({ contenttypeid: '12', cat1: 'A02', cat3: 'A02020600' }),
    'activity'
  );
  check(
    '자연(A01)은 그대로 park',
    m.kindFromTourApi({ contenttypeid: '12', cat1: 'A01', cat3: 'A01010400' }),
    'park'
  );
  check(
    '카페는 cat3로 갈린다',
    [
      m.kindFromTourApi({ contenttypeid: '39', cat3: 'A05020900' }),
      m.kindFromTourApi({ contenttypeid: '39', cat3: 'A05020100' })
    ],
    ['cafe', 'restaurant']
  );
  check('레포츠는 실내외 미상', m.isIndoorForKind('activity'), null);

  section('[패싯] 수집기를 다시 돌려도 패싯이 날아가지 않는다');
  // 두 수집기 모두 ON CONFLICT로 tags_json을 통째로 덮어쓴다. seoulCulture는
  // 주 1회 돌기 때문에, 수집기가 패싯을 안 만들면 매주 백필이 지워진다.
  for (const [name, file] of [
    ['tourApi', 'scripts/ingest/tourApi.mjs'],
    ['seoulCulture', 'scripts/ingest/seoulCulture.mjs']
  ]) {
    const source = readFileSync(join(root, file), 'utf8');
    check(`${name}가 패싯을 만든다`, source.includes('mergeFacets'), true);
  }
  check(
    'tourApi가 kind를 shared에서 가져온다',
    readFileSync(join(root, 'scripts/ingest/tourApi.mjs'), 'utf8').includes('kindFromTourApi'),
    true
  );
}

function testDatePlanWindowSchema() {
  const db = join(work, 'plan-window.db');
  buildSchema(db);
  seedRoom(db);

  sqlite(
    db,
    `INSERT INTO date_plans
       (id,room_id,created_by,title,scheduled_date,start_time,end_time,origin_area,
        budget_per_person,course_pattern_json,status,created_at,updated_at)
     VALUES ('plan_w','room_ab','mem_a','성수 하루','2026-08-22','12:00','21:00','seongsu',
             80000,'["cafe","activity","meal"]','planned','2026-08-11','2026-08-11');`
  );

  section('[날짜/시간창] 코스 설정이 약속에 붙는다');
  check(
    '시간 창·동네·예산이 한 행에 남는다',
    sqlite(db, `SELECT start_time || '~' || end_time || ' ' || origin_area || ' ' || budget_per_person FROM date_plans WHERE id='plan_w';`),
    '12:00~21:00 seongsu 80000'
  );
  check(
    '직접 고른 코스 순서가 한 행에 남는다',
    sqlite(db, `SELECT course_pattern_json FROM date_plans WHERE id='plan_w';`),
    '["cafe","activity","meal"]'
  );
  check(
    '끝 시각을 안 정한 약속도 그대로 저장된다',
    sqlite(
      db,
      `INSERT INTO date_plans (id,room_id,title,scheduled_date,start_time,status,created_at,updated_at)
         VALUES ('plan_x','room_ab','미정','2026-08-23','13:00','planned','2026-08-11','2026-08-11');
       SELECT coalesce(end_time,'(없음)') FROM date_plans WHERE id='plan_x';`
    ),
    '(없음)'
  );
  check(
    '다가오는 약속 인덱스가 만들어졌다',
    sqlite(db, `SELECT count(*) FROM sqlite_master WHERE type='index' AND name='idx_date_plans_window';`),
    '1'
  );
}

async function testCoursePreferences() {
  const m = await bundle('shared/coursePreferences.ts', 'course_preferences.mjs');

  section('[코스/기본취향] 두 사람이 각자 정하고 접점만 계산한다');
  check(
    '양쪽 순서를 지키는 공통 흐름만 남는다',
    m.commonCoursePattern(
      ['meal', 'cafe', 'activity', 'walk', 'meal'],
      ['meal', 'activity', 'cafe', 'walk', 'meal']
    ).map(step => step.kind),
    ['meal', 'activity', 'walk', 'meal']
  );
  check(
    '겹친 칸의 시간은 두 사람의 평균이다',
    m.commonCoursePattern(
      [{ kind: 'meal', minutes: 90 }, { kind: 'activity', minutes: 120 }],
      [{ kind: 'meal', minutes: 30 }, { kind: 'activity', minutes: 240 }]
    ),
    [{ kind: 'meal', minutes: 60 }, { kind: 'activity', minutes: 180 }]
  );
  check(
    '홀수 합은 내림해서 어느 계정에서나 같은 값이 나온다',
    m.commonCoursePattern([{ kind: 'cafe', minutes: 45 }], [{ kind: 'cafe', minutes: 30 }]),
    [{ kind: 'cafe', minutes: 37 }]
  );
  check('30분 미만은 저장할 수 없다', m.isValidCoursePattern([{ kind: 'cafe', minutes: 20 }]), false);
  check('6시간 초과는 저장할 수 없다', m.isValidCoursePattern([{ kind: 'cafe', minutes: 400 }]), false);
  check('종류만 있는 옛 형태도 그대로 받는다', m.isValidCoursePattern(['meal', 'cafe']), true);
  check('빈 흐름은 저장할 수 없다', m.isValidCoursePattern([]), false);
  check('장소 유형은 8개까지만 저장한다', m.isValidCoursePattern(Array(9).fill('meal')), false);

  // 접점을 약속의 기본 코스로 승격할지 판정하는 규칙. 사용자가 고르지도 않은
  // 기본값이 "카페 6시간" 같은 칸을 내밀면 안 된다.
  const skeleton = await bundle('shared/dateCourseSkeleton.ts', 'course_skeleton_default.mjs');
  check(
    '접점이 창을 채우면 기본 코스로 쓴다',
    skeleton.resolveDefaultCoursePattern({
      startTime: '12:00',
      endTime: '17:00',
      pattern: ['meal', 'activity', 'cafe']
    }),
    [
      { kind: 'meal', minutes: 90 },
      { kind: 'activity', minutes: 120 },
      { kind: 'cafe', minutes: 60 }
    ]
  );
  check(
    '접점이 짧아 칸이 늘어나면 규칙 기본으로 물러난다',
    skeleton.resolveDefaultCoursePattern({
      startTime: '12:00',
      endTime: '18:00',
      pattern: ['cafe']
    }),
    null
  );
  check(
    '같은 접점이라도 창이 짧으면 그대로 쓴다',
    skeleton.resolveDefaultCoursePattern({
      startTime: '12:00',
      endTime: '13:30',
      pattern: ['cafe']
    }),
    [{ kind: 'cafe', minutes: 60 }]
  );
  check(
    '접점이 창보다 길면 규칙 기본으로 물러난다',
    skeleton.resolveDefaultCoursePattern({
      startTime: '12:00',
      endTime: '14:00',
      pattern: ['meal', 'cafe', 'activity', 'walk', 'meal']
    }),
    null
  );
  check(
    '접점이 없으면 기본 코스도 없다',
    skeleton.resolveDefaultCoursePattern({ startTime: '12:00', endTime: '17:00', pattern: [] }),
    null
  );

  const db = join(work, 'course-preferences.db');
  buildSchema(db);
  seedRoom(db);
  sqlite(
    db,
    `INSERT INTO member_course_preferences (member_id,room_id,pattern_json,created_at,updated_at)
       VALUES ('mem_a','room_ab','["meal","cafe"]','2026-08-12','2026-08-12');
     INSERT INTO member_course_preferences (member_id,room_id,pattern_json,created_at,updated_at)
       VALUES ('mem_b','room_ab','["meal","activity"]','2026-08-12','2026-08-12');`
  );
  check(
    '두 사람의 기본 코스가 개인별로 따로 남는다',
    sqlite(db, `SELECT count(*) FROM member_course_preferences WHERE room_id='room_ab';`),
    '2'
  );
  check(
    '소곤파일 본문 컬럼이 없다',
    /content/i.test(sqlite(db, `SELECT group_concat(name) FROM pragma_table_info('member_course_preferences');`)),
    false
  );
}

// ----------------------------------------------------------------- 온보딩 투어
async function testOnboardingTour() {
  const m = await bundle(
    'FE/ProtoWeb/src/app/lib/onboardingTour.ts',
    'onboarding_tour.mjs'
  );

  section('[온보딩] 투어 정의 자체가 성립한다');
  check('두 흐름을 안내한다', m.TOURS.map(tour => tour.id), ['date-course', 'sogon-zip']);
  check('빈 투어가 없다', m.TOURS.filter(tour => tour.steps.length === 0).map(tour => tour.id), []);
  check(
    '한 투어 안에서 같은 앵커를 두 번 짚지 않는다',
    m.TOURS.filter(tour => new Set(tour.steps.map(step => step.anchor)).size !== tour.steps.length)
      .map(tour => tour.id),
    []
  );
  check('없는 투어를 찾으면 null이다', m.findTour('nope'), null);

  section('[온보딩] 투어가 가리키는 화면이 실제로 있다');
  // 라우트를 지우거나 이름을 바꾸면 투어는 "*" → "/"로 튕겨 나가고, 사용자는
  // 안내를 누른 뒤 인트로 화면에 떨어진다. 타입체크로는 안 잡힌다.
  const appSource = readFileSync(join(root, 'FE/ProtoWeb/src/app/App.tsx'), 'utf8');
  const routePaths = new Set(
    [...appSource.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1])
  );
  const missingRoutes = m.TOURS.flatMap(tour =>
    tour.steps.filter(step => !routePaths.has(step.route)).map(step => `${tour.id}:${step.route}`)
  );
  check('모든 단계의 경로가 App.tsx에 등록돼 있다', [...new Set(missingRoutes)], []);
  check('온보딩 화면 자체도 라우트가 있다', routePaths.has('/onboarding'), true);

  section('[온보딩] 코치마크 앵커가 화면에 남아 있다');
  // 이게 이 테스트의 존재 이유다. 컴포넌트에서 data-tour를 빼도 컴파일은 되고,
  // 투어만 조용히 "구멍 없는 안내"로 퇴화한다.
  const screenSource = execFileSync(
    'grep',
    ['-rho', '--include=*.tsx', 'data-tour="[a-z-]*"\\|tour: .[a-z-]*.', 'FE/ProtoWeb/src/app'],
    { cwd: root, encoding: 'utf8' }
  );
  const missingAnchors = m.TOURS.flatMap(tour =>
    tour.steps
      .filter(step => !screenSource.includes(step.anchor))
      .map(step => `${tour.id}:${step.anchor}`)
  );
  check('모든 앵커가 화면 소스에 있다', missingAnchors, []);

  section('[온보딩] 저장된 진행 상태를 믿지 않고 읽는다');
  check('아무것도 없으면 빈 상태', m.parseOnboardingState(null), { offered: false, completed: [] });
  check('문자열이 와도 안전하다', m.parseOnboardingState('yes'), { offered: false, completed: [] });
  check(
    '모르는 투어 id는 버린다',
    m.parseOnboardingState({ offered: true, completed: ['date-course', 'ghost'] }),
    { offered: true, completed: ['date-course'] }
  );
  check(
    '중복은 접는다',
    m.parseOnboardingState({ completed: ['sogon-zip', 'sogon-zip'] }).completed,
    ['sogon-zip']
  );
  check('offered는 true일 때만 true다', m.parseOnboardingState({ offered: 1 }).offered, false);

  section('[온보딩] 완료 표시');
  const once = m.markTourComplete(m.EMPTY_ONBOARDING_STATE, 'date-course');
  check('완료하면 남는다', m.isTourComplete(once, 'date-course'), true);
  check('두 번 완료해도 하나다', m.markTourComplete(once, 'date-course').completed, ['date-course']);
  check('하나만 봤으면 아직 다 본 게 아니다', m.allToursComplete(once), false);
  check('둘 다 보면 끝이다', m.allToursComplete(m.markTourComplete(once, 'sogon-zip')), true);
}

try {
  await testOpeningRules();
  await testDateQuestionRules();
  await testCorePreferenceRules();
  await testPasswords();
  testRoomAndVisibility();
  await testPlaceNormalize();
  await testCloseExpiredRules();
  testRecommendationSchema();
  testDatePlanSchema();
  await testCourseSkeleton();
  await testOpeningHours();
  await testCoursePlaces();
  await testAreaConsistency();
  await testPlaceFacets();
  testDatePlanWindowSchema();
  await testCoursePreferences();
  await testOnboardingTour();
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
