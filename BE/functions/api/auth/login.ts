import { Env, hashPassword, json, readJson } from '../_shared';

type LoginInput = {
  loginId?: string;
  password?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const input = await readJson<LoginInput>(request);
  const loginId = input.loginId?.trim();
  const password = input.password ?? '';

  if (!loginId || !password) {
    return json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const member = await env.DB.prepare(
    `SELECT members.id, members.room_id, members.login_id, members.nickname, members.role,
            rooms.invite_code, rooms.relationship_type
       FROM members
       JOIN rooms ON rooms.id = members.room_id
      WHERE members.login_id = ? AND members.password_hash = ?`
  ).bind(loginId, passwordHash).first<{
    id: string;
    room_id: string;
    login_id: string;
    nickname: string;
    role: string;
    invite_code: string;
    relationship_type: 'lover' | 'friend';
  }>();

  if (!member) {
    return json({ error: '아이디 또는 비밀번호를 다시 확인해주세요.' }, { status: 401 });
  }

  return json({
    token: member.id,
    profile: {
      nickname: member.nickname,
      relationshipType: member.relationship_type,
      roomCode: member.invite_code,
      createdAt: new Date().toISOString()
    }
  });
};
