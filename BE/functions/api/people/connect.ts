import { buildProfile, Env, json, newId, readJson, requireMember, SessionMember } from '../_shared';

type ConnectInput = {
  accountCode?: string;
};

type MemberRow = SessionMember & {
  created_at: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);
  const input = await readJson<ConnectInput>(request);
  const accountCode = input.accountCode?.trim().toUpperCase();

  if (!accountCode) {
    return json({ error: '상대의 계정 코드를 입력해주세요.' }, { status: 400 });
  }

  const target = await env.DB.prepare(
    `SELECT id, room_id, login_id, account_code, nickname, role, created_at
       FROM members
      WHERE account_code = ?`
  ).bind(accountCode).first<MemberRow>();

  if (!target) {
    return json({ error: '해당 계정 코드를 찾지 못했어요.' }, { status: 404 });
  }

  if (target.id === member.id) {
    return json({ error: '내 계정 코드는 연결 대상으로 사용할 수 없어요.' }, { status: 400 });
  }

  if (member.room_id && target.room_id && member.room_id !== target.room_id) {
    return json({ error: '이미 서로 다른 소곤폴더에 연결된 계정이에요.' }, { status: 409 });
  }

  const roomId = member.room_id ?? target.room_id ?? newId('room');
  const now = new Date().toISOString();

  if (!member.room_id && !target.room_id) {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO rooms (id, relationship_type, title, created_at) VALUES (?, ?, ?, ?)'
      ).bind(roomId, 'lover', `${member.nickname} & ${target.nickname}`, now),
      env.DB.prepare('UPDATE members SET room_id = ? WHERE id IN (?, ?)').bind(roomId, member.id, target.id)
    ]);
  } else if (!member.room_id) {
    await env.DB.prepare('UPDATE members SET room_id = ? WHERE id = ?').bind(roomId, member.id).run();
  } else if (!target.room_id) {
    await env.DB.prepare('UPDATE members SET room_id = ? WHERE id = ?').bind(roomId, target.id).run();
  }

  const connectedMember = {
    ...member,
    room_id: roomId
  };

  return json({
    roomId,
    partner: {
      nickname: target.nickname,
      accountCode: target.account_code
    },
    profile: await buildProfile(env, connectedMember)
  });
};
