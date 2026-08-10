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
  for (const file of [
    '0001_beta_schema.sql',
    '0002_security_and_scheduling.sql',
    '0003_recommendation.sql',
    '0004_date_plans.sql'
  ]) {
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
     INSERT INTO preferences VALUES ('pref_q1','room_ab','mem_a','오늘의 질문','질문 — 답','2026-08-10');
     INSERT INTO date_question_answers
       (id,plan_id,room_id,member_id,question_id,option_id,axis,tag,weight,preference_id,answered_on,created_at)
       VALUES ('ans_1','plan_1','room_ab','mem_a','activity-energy','active','activity','active',1,'pref_q1','2026-08-10','2026-08-10');`
  );

  section('[날짜/약속] 방의 두 사람에게 같은 약속이 보인다');
  check(
    'room_id로 조회하면 만든 사람과 무관하게 약속이 나온다',
    sqlite(db, `SELECT title FROM date_plans WHERE room_id='room_ab' AND status='planned';`),
    '성수 데이트'
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

try {
  await testOpeningRules();
  await testDateQuestionRules();
  await testPasswords();
  testRoomAndVisibility();
  await testPlaceNormalize();
  testRecommendationSchema();
  testDatePlanSchema();
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
