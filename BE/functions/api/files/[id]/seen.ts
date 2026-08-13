import { Env, handle, json, requireMember } from '../../_shared';

/**
 * 받는 쪽이 "확인했다"고 표시한다.
 *
 * `PATCH /api/files/:id`와 일부러 나눠 뒀다. 그쪽은 작성자만 통과하는 문이고
 * (`author_member_id = ?`), 여기는 정반대로 **작성자가 아닌 사람만** 통과한다.
 * 한 엔드포인트에 두 권한을 섞으면 언젠가 조건 하나가 빠지면서
 * "상대가 내 파일을 강제로 열 수 있다"로 무너진다.
 *
 * 열린 파일에만 찍는다. 아직 안 열린 파일은 상대에게 존재조차 안 보여야 하므로
 * (절대 규칙 1), 확인 표시를 받을 이유도 없다.
 */
export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '소곤파일을 찾을 수 없어요.' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE sogon_files
        SET partner_seen_at = ?, updated_at = ?
      WHERE id = ?
        AND room_id = ?
        AND author_member_id <> ?
        AND status = 'opened'
        AND partner_seen_at IS NULL`
  ).bind(now, now, String(params.id), member.room_id, member.id).run();

  // 이미 확인한 파일에 또 눌러도 성공으로 친다. 배너를 닫는 동작이라
  // 두 번 눌렸다고 에러를 띄우면 사용자만 놀란다.
  return json({ ok: true, partnerSeenAt: result.meta.changes > 0 ? now : null });
});
