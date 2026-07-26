import { all, buildProfile, Env, handle, json, readJson, requireMember } from '../_shared';
import {
  assertCanConnect,
  cancelOtherPendingRequests,
  findMemberById,
  linkMembers
} from './_link';

type RequestRow = {
  id: string;
  status: string;
  created_at: string;
  nickname: string;
  account_code: string;
};

type RespondInput = {
  requestId?: string;
  action?: 'accept' | 'decline' | 'cancel';
};

/** 내가 받은/보낸 pending 연결 요청 */
export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  const [incoming, outgoing] = await Promise.all([
    all<RequestRow>(env.DB.prepare(
      `SELECT r.id, r.status, r.created_at, m.nickname, m.account_code
         FROM connection_requests r
         JOIN members m ON m.id = r.requester_id
        WHERE r.target_id = ? AND r.status = 'pending'
        ORDER BY r.created_at DESC`
    ).bind(member.id)),
    all<RequestRow>(env.DB.prepare(
      `SELECT r.id, r.status, r.created_at, m.nickname, m.account_code
         FROM connection_requests r
         JOIN members m ON m.id = r.target_id
        WHERE r.requester_id = ? AND r.status = 'pending'
        ORDER BY r.created_at DESC`
    ).bind(member.id))
  ]);

  const toItem = (row: RequestRow) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    person: { nickname: row.nickname, accountCode: row.account_code }
  });

  return json({
    incoming: incoming.map(toItem),
    outgoing: outgoing.map(toItem)
  });
});

/** 요청 수락 / 거절 / 취소 */
export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  const input = await readJson<RespondInput>(request);
  const requestId = input.requestId?.trim();
  const action = input.action;

  if (!requestId || !action) {
    return json({ error: '요청 정보가 올바르지 않아요.' }, { status: 400 });
  }

  const row = await env.DB.prepare(
    `SELECT id, requester_id, target_id, status
       FROM connection_requests
      WHERE id = ?`
  ).bind(requestId).first<{
    id: string;
    requester_id: string;
    target_id: string;
    status: string;
  }>();

  if (!row) {
    return json({ error: '연결 요청을 찾지 못했어요.' }, { status: 404 });
  }

  if (row.status !== 'pending') {
    return json({ error: '이미 처리된 연결 요청이에요.' }, { status: 409 });
  }

  const isTarget = row.target_id === member.id;
  const isRequester = row.requester_id === member.id;

  if (!isTarget && !isRequester) {
    return json({ error: '이 연결 요청에 응답할 수 없어요.' }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (action === 'cancel') {
    if (!isRequester) {
      return json({ error: '내가 보낸 요청만 취소할 수 있어요.' }, { status: 403 });
    }
    await env.DB.prepare(
      `UPDATE connection_requests SET status = 'cancelled', responded_at = ? WHERE id = ?`
    ).bind(now, requestId).run();
    return json({ ok: true, status: 'cancelled' });
  }

  if (!isTarget) {
    return json({ error: '받은 요청만 수락하거나 거절할 수 있어요.' }, { status: 403 });
  }

  if (action === 'decline') {
    await env.DB.prepare(
      `UPDATE connection_requests SET status = 'declined', responded_at = ? WHERE id = ?`
    ).bind(now, requestId).run();
    return json({ ok: true, status: 'declined' });
  }

  // accept: 요청을 보낸 시점이 아니라 수락하는 지금 기준으로 다시 검증한다.
  const requester = await findMemberById(env, row.requester_id);
  if (!requester) {
    return json({ error: '상대 계정을 찾지 못했어요.' }, { status: 404 });
  }

  await assertCanConnect(env, member, requester);
  const roomId = await linkMembers(env, member, requester);

  await env.DB.prepare(
    `UPDATE connection_requests SET status = 'accepted', responded_at = ? WHERE id = ?`
  ).bind(now, requestId).run();
  await cancelOtherPendingRequests(env, [member.id, requester.id], requestId);

  return json({
    ok: true,
    status: 'accepted',
    roomId,
    partner: { nickname: requester.nickname, accountCode: requester.account_code },
    profile: await buildProfile(env, { ...member, room_id: roomId })
  });
});
