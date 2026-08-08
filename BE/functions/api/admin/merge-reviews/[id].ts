import { Env, handle, json, readJson, requireAdmin } from '../../_shared';

type ResolveInput = {
  /** merged = 같은 장소였다. rejected = 다른 장소다(지점 등). */
  action?: 'merged' | 'rejected';
  /** merged일 때 살릴 쪽. 지정하지 않으면 검토를 유발한 신규 장소를 닫는다. */
  keepPlaceId?: string;
};

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  await requireAdmin(request, env);

  const id = String(params.id);
  const input = await readJson<ResolveInput>(request);

  if (input.action !== 'merged' && input.action !== 'rejected') {
    return json({ error: 'action은 merged 또는 rejected여야 해요.' }, { status: 400 });
  }

  const review = await env.DB.prepare(
    `SELECT id, place_id, candidate_place_id, status
       FROM place_merge_reviews WHERE id = ?`
  ).bind(id).first<{
    id: string;
    place_id: string;
    candidate_place_id: string;
    status: string;
  }>();

  if (!review) {
    return json({ error: '검토 항목을 찾을 수 없어요.' }, { status: 404 });
  }
  if (review.status !== 'pending') {
    return json({ error: '이미 처리된 항목이에요.' }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (input.action === 'rejected') {
    await env.DB.prepare(
      "UPDATE place_merge_reviews SET status = 'rejected', resolved_at = ? WHERE id = ?"
    ).bind(now, id).run();

    return json({ ok: true, status: 'rejected' });
  }

  const keepId = input.keepPlaceId ?? review.candidate_place_id;
  const dropId = keepId === review.place_id ? review.candidate_place_id : review.place_id;

  if (keepId !== review.place_id && keepId !== review.candidate_place_id) {
    return json({ error: 'keepPlaceId가 이 검토 항목의 장소가 아니에요.' }, { status: 400 });
  }

  await env.DB.batch([
    // 지는 쪽은 지우지 않고 닫는다. 그 장소로 남은 노출 로그가 학습 데이터라서
    // 물리 삭제하면 과거 추천 기록의 참조가 깨진다.
    env.DB.prepare(
      "UPDATE places SET status = 'closed', updated_at = ? WHERE id = ?"
    ).bind(now, dropId),
    // 출처는 살리는 쪽으로 옮긴다. 어느 API에서 왔는지가 사라지면
    // 다음 배치가 같은 장소를 또 새로 만든다.
    env.DB.prepare(
      'UPDATE OR IGNORE place_sources SET place_id = ? WHERE place_id = ?'
    ).bind(keepId, dropId),
    env.DB.prepare(
      "UPDATE place_merge_reviews SET status = 'merged', resolved_at = ? WHERE id = ?"
    ).bind(now, id)
  ]);

  return json({ ok: true, status: 'merged', keptPlaceId: keepId, closedPlaceId: dropId });
});
