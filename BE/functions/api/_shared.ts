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
};

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers
    }
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Response('Invalid JSON', { status: 400 });
  }
}

export function newId(prefix: string) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${token}`;
}

export function newAccountCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`sogonzip-beta:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getAuthToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export async function requireMember(request: Request, env: Env) {
  const memberId = getAuthToken(request);
  if (!memberId) {
    throw json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const member = await env.DB.prepare(
    'SELECT id, room_id, login_id, account_code, nickname, role FROM members WHERE id = ?'
  ).bind(memberId).first<SessionMember>();

  if (!member) {
    throw json({ error: '세션을 다시 확인해주세요.' }, { status: 401 });
  }

  return member;
}

export async function all<T>(statement: D1PreparedStatement) {
  const result = await statement.all<T>() as D1Result<T>;
  return result.results ?? [];
}

export async function findPartner(env: Env, member: SessionMember) {
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

  return {
    nickname: member.nickname,
    accountCode: member.account_code,
    relationshipType: 'lover' as const,
    partnerNickname: partner?.nickname,
    partnerAccountCode: partner?.account_code,
    isConnected: Boolean(member.room_id && partner),
    createdAt: new Date().toISOString()
  };
}
