import { buildProfile, Env, handle, json, newId, readJson, requireMember } from '../_shared';
import {
  assertCanConnect,
  cancelOtherPendingRequests,
  findMemberByAccountCode,
  linkMembers
} from './_link';

type ConnectInput = {
  accountCode?: string;
};

type PendingRequestRow = {
  id: string;
  requester_id: string;
  target_id: string;
};

/**
 * 연결 "요청"을 보낸다. 예전에는 이 엔드포인트가 상대 동의 없이 바로 방에 넣었다.
 * 계정 코드는 공유하라고 만든 값이므로, 코드를 아는 것만으로 남의 소곤폴더에
 * 들어갈 수 있으면 안 된다. 실제 연결은 상대가 수락할 때만 일어난다.
 */
export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  const input = await readJson<ConnectInput>(request);
  const accountCode = input.accountCode?.trim().toUpperCase();

  if (!accountCode) {
    return json({ error: '상대의 계정 코드를 입력해주세요.' }, { status: 400 });
  }

  const target = await findMemberByAccountCode(env, accountCode);
  if (!target) {
    return json({ error: '해당 계정 코드를 찾지 못했어요.' }, { status: 404 });
  }

  await assertCanConnect(env, member, target);

  const now = new Date().toISOString();

  // 상대가 먼저 나에게 요청을 보내둔 상태라면, 이건 "수락"으로 본다.
  const incoming = await env.DB.prepare(
    `SELECT id, requester_id, target_id
       FROM connection_requests
      WHERE requester_id = ? AND target_id = ? AND status = 'pending'`
  ).bind(target.id, member.id).first<PendingRequestRow>();

  if (incoming) {
    const roomId = await linkMembers(env, member, target);
    await env.DB.prepare(
      `UPDATE connection_requests SET status = 'accepted', responded_at = ? WHERE id = ?`
    ).bind(now, incoming.id).run();
    await cancelOtherPendingRequests(env, [member.id, target.id], incoming.id);

    return json({
      status: 'connected',
      roomId,
      partner: { nickname: target.nickname, accountCode: target.account_code },
      profile: await buildProfile(env, { ...member, room_id: roomId })
    });
  }

  const existing = await env.DB.prepare(
    `SELECT id, requester_id, target_id
       FROM connection_requests
      WHERE requester_id = ? AND target_id = ? AND status = 'pending'`
  ).bind(member.id, target.id).first<PendingRequestRow>();

  const requestId = existing?.id ?? newId('creq');

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO connection_requests (id, requester_id, target_id, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`
    ).bind(requestId, member.id, target.id, now).run();
  }

  return json({
    status: 'requested',
    request: {
      id: requestId,
      status: 'pending',
      target: { nickname: target.nickname, accountCode: target.account_code }
    }
  }, { status: existing ? 200 : 201 });
});
