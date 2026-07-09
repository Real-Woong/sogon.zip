import { Env, hashPassword, json, newId, newInviteCode, readJson } from '../_shared';

type CreateRoomInput = {
  loginId?: string;
  password?: string;
  nickname?: string;
  relationshipType?: 'lover' | 'friend';
  title?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const input = await readJson<CreateRoomInput>(request);
  const loginId = input.loginId?.trim();
  const password = input.password ?? '';
  const nickname = input.nickname?.trim();

  if (!loginId || !password || !nickname) {
    return json({ error: '아이디, 비밀번호, 닉네임이 필요해요.' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM members WHERE login_id = ?')
    .bind(loginId)
    .first();
  if (existing) {
    return json({ error: '이미 쓰고 있는 아이디예요.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const roomId = newId('room');
  const memberId = newId('mem');
  const inviteCode = newInviteCode();
  const passwordHash = await hashPassword(password);
  const relationshipType = input.relationshipType ?? 'lover';

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO rooms (id, invite_code, relationship_type, title, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(roomId, inviteCode, relationshipType, input.title?.trim() || null, now),
    env.DB.prepare(
      'INSERT INTO members (id, room_id, login_id, password_hash, nickname, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(memberId, roomId, loginId, passwordHash, nickname, 'owner', now)
  ]);

  return json({
    token: memberId,
    inviteCode,
    profile: {
      nickname,
      relationshipType,
      roomCode: inviteCode,
      createdAt: now
    }
  });
};
