import { buildProfile, Env, hashPassword, json, newAccountCode, newId, readJson, SessionMember } from '../_shared';

type SignupInput = {
  loginId?: string;
  password?: string;
  nickname?: string;
};

async function createUniqueAccountCode(env: Env) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const accountCode = newAccountCode();
    const existing = await env.DB.prepare(
      'SELECT id FROM members WHERE account_code = ?'
    ).bind(accountCode).first<{ id: string }>();

    if (!existing) {
      return accountCode;
    }
  }

  throw json({ error: '계정 코드를 만드는 중 문제가 생겼어요. 다시 시도해주세요.' }, { status: 500 });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const input = await readJson<SignupInput>(request);
  const loginId = input.loginId?.trim();
  const password = input.password ?? '';
  const nickname = input.nickname?.trim();

  if (!loginId || !password || !nickname) {
    return json({ error: '아이디, 비밀번호, 닉네임을 모두 입력해주세요.' }, { status: 400 });
  }

  if (password.length < 4) {
    return json({ error: '비밀번호는 4자 이상으로 입력해주세요.' }, { status: 400 });
  }

  const duplicate = await env.DB.prepare(
    'SELECT id FROM members WHERE login_id = ?'
  ).bind(loginId).first<{ id: string }>();

  if (duplicate) {
    return json({ error: '이미 사용 중인 아이디예요.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const member: SessionMember = {
    id: newId('mem'),
    room_id: null,
    login_id: loginId,
    account_code: await createUniqueAccountCode(env),
    nickname,
    role: 'member'
  };

  await env.DB.prepare(
    `INSERT INTO members
      (id, room_id, login_id, account_code, password_hash, nickname, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    member.id,
    member.room_id,
    member.login_id,
    member.account_code,
    await hashPassword(password),
    member.nickname,
    member.role,
    now
  ).run();

  return json({
    token: member.id,
    accountCode: member.account_code,
    profile: await buildProfile(env, member)
  }, { status: 201 });
};
