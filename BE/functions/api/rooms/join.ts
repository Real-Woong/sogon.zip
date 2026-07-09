import { Env, hashPassword, json, newId, readJson } from '../_shared';

type JoinRoomInput = {
  inviteCode?: string;
  loginId?: string;
  password?: string;
  nickname?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const input = await readJson<JoinRoomInput>(request);
  const inviteCode = input.inviteCode?.trim().toUpperCase();
  const loginId = input.loginId?.trim();
  const password = input.password ?? '';
  const nickname = input.nickname?.trim();

  if (!inviteCode || !loginId || !password || !nickname) {
    return json({ error: '초대코드, 아이디, 비밀번호, 닉네임이 필요해요.' }, { status: 400 });
  }

  const room = await env.DB.prepare(
    'SELECT id, invite_code, relationship_type FROM rooms WHERE invite_code = ?'
  ).bind(inviteCode).first<{ id: string; invite_code: string; relationship_type: 'lover' | 'friend' }>();

  if (!room) {
    return json({ error: '초대코드를 찾을 수 없어요.' }, { status: 404 });
  }

  const existing = await env.DB.prepare('SELECT id FROM members WHERE login_id = ?')
    .bind(loginId)
    .first();
  if (existing) {
    return json({ error: '이미 쓰고 있는 아이디예요.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const memberId = newId('mem');
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO members (id, room_id, login_id, password_hash, nickname, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(memberId, room.id, loginId, passwordHash, nickname, 'member', now).run();

  return json({
    token: memberId,
    profile: {
      nickname,
      relationshipType: room.relationship_type,
      roomCode: room.invite_code,
      createdAt: now
    }
  });
};
