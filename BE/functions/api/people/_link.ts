import {
  countRoomMembers,
  Env,
  json,
  MEMBER_COLUMNS,
  newId,
  ROOM_CAPACITY,
  SessionMember
} from '../_shared';

export async function findMemberByAccountCode(env: Env, accountCode: string) {
  return env.DB.prepare(`SELECT ${MEMBER_COLUMNS} FROM members WHERE account_code = ?`)
    .bind(accountCode)
    .first<SessionMember>();
}

export async function findMemberById(env: Env, memberId: string) {
  return env.DB.prepare(`SELECT ${MEMBER_COLUMNS} FROM members WHERE id = ?`)
    .bind(memberId)
    .first<SessionMember>();
}

/**
 * 두 사람을 연결할 수 있는 상태인지 검사한다. 불가능하면 Response를 throw한다.
 *
 * 여기서 방 정원을 막지 않으면, 이미 연결된 두 사람의 방에 계정 코드만 아는
 * 제3자가 합류해 상대의 소곤파일을 전부 읽을 수 있다.
 */
export async function assertCanConnect(env: Env, member: SessionMember, target: SessionMember) {
  if (target.id === member.id) {
    throw json({ error: '내 계정 코드는 연결 대상으로 사용할 수 없어요.' }, { status: 400 });
  }

  if (member.room_id && target.room_id) {
    if (member.room_id === target.room_id) {
      throw json({ error: '이미 연결된 사람이에요.' }, { status: 409 });
    }
    throw json({ error: '이미 서로 다른 소곤폴더에 연결된 계정이에요.' }, { status: 409 });
  }

  if (member.room_id && (await countRoomMembers(env, member.room_id)) >= ROOM_CAPACITY) {
    throw json(
      { error: '내 소곤폴더는 이미 두 사람으로 가득 찼어요.' },
      { status: 409 }
    );
  }

  if (target.room_id && (await countRoomMembers(env, target.room_id)) >= ROOM_CAPACITY) {
    throw json(
      { error: '상대는 이미 다른 사람과 연결되어 있어요.' },
      { status: 409 }
    );
  }
}

/**
 * 실제로 두 사람을 한 방에 넣는다. 호출 전 assertCanConnect로 검증해야 한다.
 * UPDATE에 `room_id IS NULL` 조건을 걸어, 검사와 쓰기 사이에 상대가 다른 방에
 * 들어가버린 경우 조용히 덮어쓰지 않도록 한다.
 */
export async function linkMembers(env: Env, member: SessionMember, target: SessionMember) {
  const now = new Date().toISOString();

  if (!member.room_id && !target.room_id) {
    const roomId = newId('room');
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO rooms (id, relationship_type, title, created_at) VALUES (?, ?, ?, ?)'
      ).bind(roomId, 'lover', `${member.nickname} & ${target.nickname}`, now),
      env.DB.prepare('UPDATE members SET room_id = ? WHERE id = ? AND room_id IS NULL')
        .bind(roomId, member.id),
      env.DB.prepare('UPDATE members SET room_id = ? WHERE id = ? AND room_id IS NULL')
        .bind(roomId, target.id)
    ]);
    return roomId;
  }

  const host = member.room_id ? member : target;
  const joiner = member.room_id ? target : member;
  const roomId = host.room_id!;

  const result = await env.DB.prepare(
    'UPDATE members SET room_id = ? WHERE id = ? AND room_id IS NULL'
  ).bind(roomId, joiner.id).run();

  if (result.meta.changes === 0) {
    throw json({ error: '연결 상태가 방금 바뀌었어요. 다시 시도해주세요.' }, { status: 409 });
  }

  // 검사와 쓰기 사이에 다른 사람이 먼저 들어왔다면 되돌린다.
  if ((await countRoomMembers(env, roomId)) > ROOM_CAPACITY) {
    await env.DB.prepare('UPDATE members SET room_id = NULL WHERE id = ?').bind(joiner.id).run();
    throw json({ error: '그 소곤폴더는 이미 두 사람으로 가득 찼어요.' }, { status: 409 });
  }

  return roomId;
}

/** 두 사람 중 누구라도 얽혀 있는 다른 pending 요청을 정리한다. */
export async function cancelOtherPendingRequests(env: Env, memberIds: string[], keepRequestId: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE connection_requests
        SET status = 'cancelled', responded_at = ?
      WHERE status = 'pending'
        AND id != ?
        AND (requester_id IN (?, ?) OR target_id IN (?, ?))`
  ).bind(now, keepRequestId, memberIds[0], memberIds[1], memberIds[0], memberIds[1]).run();
}
