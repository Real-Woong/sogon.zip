import { resolveOpening } from '../../../shared/sogonOpening';

type D1Result<T> = {
  results?: T[];
  success: boolean;
};

export type Env = {
  DB: D1Database;
};

export type SessionMember = {
  id: string;
  room_id: string | null;
  login_id: string;
  account_code: string;
  nickname: string;
  role: string;
  created_at: string;
};

/** 한 소곤폴더에 들어갈 수 있는 최대 인원. 커플/단짝 1:1 제품이므로 2명 고정. */
export const ROOM_CAPACITY = 2;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 남은 수명이 이보다 짧아지면 세션을 연장한다(요청마다 쓰기를 하지 않기 위한 장치). */
const SESSION_REFRESH_BELOW_MS = 23 * 24 * 60 * 60 * 1000;

export const MEMBER_COLUMNS = 'id, room_id, login_id, account_code, nickname, role, created_at';

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers
    }
  });
}

/**
 * Cloudflare Pages Functions는 핸들러가 throw하면 500을 돌려준다.
 * 지금까지 `throw json(...)`으로 만든 401/404가 전부 500으로 나가고 있었으므로,
 * 모든 핸들러를 이 래퍼로 감싸 Response throw를 정상 응답으로 변환한다.
 */
export function handle<E = Env>(fn: PagesFunction<E>): PagesFunction<E> {
  return async context => {
    try {
      return await fn(context);
    } catch (thrown) {
      if (thrown instanceof Response) {
        return thrown;
      }
      console.error('[sogonzip] unhandled error', thrown);
      return json({ error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }
  };
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }
}

function toHex(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(byteLength: number) {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export function newId(prefix: string) {
  return `${prefix}_${randomHex(12)}`;
}

export function newAccountCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

/** 길이가 같은 hex 문자열끼리 상수 시간 비교 */
function timingSafeEqualHex(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(hash);
}

// -- 비밀번호 ---------------------------------------------------------------

/**
 * Cloudflare Workers 무료 플랜은 요청당 CPU 10ms다. PBKDF2 100k는 그 예산을 넘길
 * 위험이 있어 50k로 잡았다. 반복 횟수를 password_algo에 함께 저장하므로,
 * 유료 플랜으로 올리거나 여유가 확인되면 이 상수만 올리면 된다.
 * 기존 계정은 다음 로그인 성공 시 자동으로 새 반복 횟수로 재해싱된다.
 */
const PBKDF2_ITERATIONS = 50_000;
const PBKDF2_ALGO = `pbkdf2-sha256-${PBKDF2_ITERATIONS}`;
const LEGACY_ALGO = 'sha256-legacy';

export type PasswordRecord = {
  hash: string;
  salt: string | null;
  algo: string;
};

/** 0001 스키마에서 쓰던 전역 prefix SHA-256. 검증 전용이며 새로 만들지 않는다. */
async function legacyHash(password: string) {
  return sha256Hex(`sogonzip-beta:${password}`);
}

async function pbkdf2Hex(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key,
    256
  );
  return toHex(bits);
}

export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  const salt = randomHex(16);
  return {
    hash: await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS),
    salt,
    algo: PBKDF2_ALGO
  };
}

export async function verifyPassword(password: string, record: PasswordRecord) {
  if (record.algo === LEGACY_ALGO || !record.salt) {
    const ok = timingSafeEqualHex(await legacyHash(password), record.hash);
    return { ok, needsUpgrade: ok };
  }

  const iterations = Number.parseInt(record.algo.split('-').pop() ?? '', 10) || PBKDF2_ITERATIONS;
  const ok = timingSafeEqualHex(await pbkdf2Hex(password, record.salt, iterations), record.hash);
  return { ok, needsUpgrade: ok && iterations !== PBKDF2_ITERATIONS };
}

export async function upgradePasswordHash(env: Env, memberId: string, password: string) {
  const record = await createPasswordRecord(password);
  await env.DB.prepare(
    'UPDATE members SET password_hash = ?, password_salt = ?, password_algo = ? WHERE id = ?'
  ).bind(record.hash, record.salt, record.algo, memberId).run();
}

// -- 로그인 시도 제한 -------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export async function assertNotLockedOut(env: Env, loginId: string) {
  const row = await env.DB.prepare(
    'SELECT locked_until FROM auth_attempts WHERE login_id = ?'
  ).bind(loginId).first<{ locked_until: string | null }>();

  if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw json({ error: '로그인 시도가 너무 많아요. 15분 뒤에 다시 시도해주세요.' }, { status: 429 });
  }
}

export async function recordFailedLogin(env: Env, loginId: string) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const row = await env.DB.prepare(
    'SELECT failed_count, first_failed_at FROM auth_attempts WHERE login_id = ?'
  ).bind(loginId).first<{ failed_count: number; first_failed_at: string }>();

  const withinWindow = row && now - new Date(row.first_failed_at).getTime() < ATTEMPT_WINDOW_MS;
  const failedCount = withinWindow ? row.failed_count + 1 : 1;
  const firstFailedAt = withinWindow ? row.first_failed_at : nowIso;
  const lockedUntil =
    failedCount >= MAX_FAILED_ATTEMPTS ? new Date(now + LOCK_MS).toISOString() : null;

  await env.DB.prepare(
    `INSERT INTO auth_attempts (login_id, failed_count, first_failed_at, locked_until)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(login_id) DO UPDATE SET
       failed_count = excluded.failed_count,
       first_failed_at = excluded.first_failed_at,
       locked_until = excluded.locked_until`
  ).bind(loginId, failedCount, firstFailedAt, lockedUntil).run();
}

export async function clearFailedLogins(env: Env, loginId: string) {
  await env.DB.prepare('DELETE FROM auth_attempts WHERE login_id = ?').bind(loginId).run();
}

// -- 세션 -------------------------------------------------------------------

export async function createSession(env: Env, memberId: string) {
  const token = randomHex(32);
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, member_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(
    await sha256Hex(token),
    memberId,
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString()
  ).run();

  return token;
}

export async function revokeSession(env: Env, token: string) {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(await sha256Hex(token))
    .run();
}

export function getAuthToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
}

export async function requireMember(request: Request, env: Env): Promise<SessionMember> {
  const token = getAuthToken(request);
  if (!token) {
    throw json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const tokenHash = await sha256Hex(token);
  const nowIso = new Date().toISOString();

  const row = await env.DB.prepare(
    `SELECT m.id, m.room_id, m.login_id, m.account_code, m.nickname, m.role, m.created_at,
            s.expires_at
       FROM sessions s
       JOIN members m ON m.id = s.member_id
      WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(tokenHash, nowIso).first<SessionMember & { expires_at: string }>();

  if (!row) {
    throw json({ error: '세션이 만료됐어요. 다시 로그인해주세요.' }, { status: 401 });
  }

  if (new Date(row.expires_at).getTime() - Date.now() < SESSION_REFRESH_BELOW_MS) {
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
      .bind(new Date(Date.now() + SESSION_TTL_MS).toISOString(), tokenHash)
      .run();
  }

  const { expires_at: _expiresAt, ...member } = row;
  return member;
}

/**
 * 운영자 전용 경로. 지금은 장소 큐레이션에만 쓴다.
 *
 * 가입은 항상 role='member'로만 만들어지고, 승격시키는 API는 일부러 두지 않았다.
 * 권한을 올리려면 D1에서 직접 UPDATE 한다. 베타 운영자가 한 명뿐인 동안은
 * 이게 가장 사고가 적다.
 *   yarn wrangler d1 execute sogonzip-db --remote \
 *     --command="UPDATE members SET role='admin' WHERE login_id='...'"
 *
 * 운영자여도 소곤파일 본문에는 접근하지 않는다. 이 헬퍼를 쓰는 경로는
 * places 같은 공개 데이터로 제한한다.
 */
export async function requireAdmin(request: Request, env: Env): Promise<SessionMember> {
  const member = await requireMember(request, env);

  if (member.role !== 'admin') {
    // 운영자 경로의 존재 자체를 알리지 않는다.
    throw json({ error: '찾을 수 없어요.' }, { status: 404 });
  }

  return member;
}

// -- 방 --------------------------------------------------------------------

export async function all<T>(statement: D1PreparedStatement) {
  const result = await statement.all<T>() as D1Result<T>;
  return result.results ?? [];
}

export async function countRoomMembers(env: Env, roomId: string) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM members WHERE room_id = ?'
  ).bind(roomId).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function findPartner(env: Env, member: Pick<SessionMember, 'id' | 'room_id'>) {
  if (!member.room_id) {
    return null;
  }

  return env.DB.prepare(
    `SELECT nickname, account_code
       FROM members
      WHERE room_id = ? AND id != ?
      ORDER BY created_at ASC
      LIMIT 1`
  ).bind(member.room_id, member.id).first<{ nickname: string; account_code: string }>();
}

export async function buildProfile(env: Env, member: SessionMember) {
  const partner = await findPartner(env, member);
  const room = member.room_id
    ? await env.DB.prepare('SELECT relationship_type FROM rooms WHERE id = ?')
        .bind(member.room_id)
        .first<{ relationship_type: string }>()
    : null;

  return {
    nickname: member.nickname,
    accountCode: member.account_code,
    relationshipType: (room?.relationship_type === 'friend' ? 'friend' : 'lover') as 'lover' | 'friend',
    partnerNickname: partner?.nickname,
    partnerAccountCode: partner?.account_code,
    isConnected: Boolean(member.room_id && partner),
    createdAt: member.created_at
  };
}

// -- 삭제 -------------------------------------------------------------------

/**
 * 방을 해체한다. 방에 있던 소곤파일과 취향 기록도 함께 사라진다.
 *
 * ⚠️ 순서가 중요하다. `members.room_id`에 `REFERENCES rooms(id) ON DELETE CASCADE`가
 * 걸려 있어서, 방을 먼저 지우면 그 방에 속한 **계정까지 함께 삭제된다.**
 * 반드시 멤버를 방에서 떼어낸 뒤에 방을 지운다.
 */
export async function dissolveRoom(env: Env, roomId: string) {
  await env.DB.batch([
    env.DB.prepare('UPDATE members SET room_id = NULL WHERE room_id = ?').bind(roomId),
    env.DB.prepare('DELETE FROM sogon_files WHERE room_id = ?').bind(roomId),
    env.DB.prepare('DELETE FROM preferences WHERE room_id = ?').bind(roomId),
    env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId)
  ]);
}

/**
 * 계정과 그 계정이 남긴 것을 모두 지운다.
 * 연결된 상태였다면 방을 먼저 해체하므로, 그 방의 공유 기록도 함께 사라진다.
 */
export async function deleteMemberAccount(env: Env, member: SessionMember) {
  if (member.room_id) {
    await dissolveRoom(env, member.room_id);
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE member_id = ?').bind(member.id),
    env.DB.prepare('DELETE FROM connection_requests WHERE requester_id = ? OR target_id = ?')
      .bind(member.id, member.id),
    env.DB.prepare('DELETE FROM sogon_files WHERE author_member_id = ?').bind(member.id),
    env.DB.prepare('DELETE FROM preferences WHERE member_id = ?').bind(member.id),
    env.DB.prepare('DELETE FROM auth_attempts WHERE login_id = ?').bind(member.login_id),
    env.DB.prepare('DELETE FROM members WHERE id = ?').bind(member.id)
  ]);
}

// -- 소곤파일 개봉 ----------------------------------------------------------

/**
 * opening_at이 지난 scheduled 파일을 ready로 올린다.
 * 별도 크론 없이, 파일을 읽는 시점에 지연 승격시킨다.
 */
export async function promoteReadyFiles(env: Env, roomId: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE sogon_files
        SET status = 'ready', updated_at = ?
      WHERE room_id = ?
        AND status = 'scheduled'
        AND opening_at IS NOT NULL
        AND opening_at <= ?`
  ).bind(now, roomId, now).run();
}

export { resolveOpening };
