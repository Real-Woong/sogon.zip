import {
  assertNotLockedOut,
  buildProfile,
  clearFailedLogins,
  createSession,
  Env,
  handle,
  json,
  MEMBER_COLUMNS,
  readJson,
  recordFailedLogin,
  SessionMember,
  upgradePasswordHash,
  verifyPassword
} from '../_shared';

type LoginInput = {
  loginId?: string;
  password?: string;
};

type MemberWithPassword = SessionMember & {
  password_hash: string;
  password_salt: string | null;
  password_algo: string;
};

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const input = await readJson<LoginInput>(request);
  const loginId = input.loginId?.trim();
  const password = input.password ?? '';

  if (!loginId || !password) {
    return json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  await assertNotLockedOut(env, loginId);

  const member = await env.DB.prepare(
    `SELECT ${MEMBER_COLUMNS}, password_hash, password_salt, password_algo
       FROM members
      WHERE login_id = ?`
  ).bind(loginId).first<MemberWithPassword>();

  // 아이디 존재 여부를 응답으로 구분할 수 없게 같은 메시지를 쓴다.
  const invalid = json({ error: '아이디 또는 비밀번호를 다시 확인해주세요.' }, { status: 401 });

  if (!member) {
    await recordFailedLogin(env, loginId);
    return invalid;
  }

  const { ok, needsUpgrade } = await verifyPassword(password, {
    hash: member.password_hash,
    salt: member.password_salt,
    algo: member.password_algo
  });

  if (!ok) {
    await recordFailedLogin(env, loginId);
    return invalid;
  }

  await clearFailedLogins(env, loginId);

  // 예전 전역 prefix SHA-256 계정을 로그인 성공 시점에 조용히 PBKDF2로 옮긴다.
  if (needsUpgrade) {
    await upgradePasswordHash(env, member.id, password);
  }

  return json({
    token: await createSession(env, member.id),
    profile: await buildProfile(env, member)
  });
});
