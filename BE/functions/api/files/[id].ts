import { Env, json, readJson, requireMember } from '../_shared';

type PatchFileInput = {
  content?: string;
  openingTime?: string;
  recommendationOn?: boolean;
  status?: 'scheduled' | 'ready' | 'opened' | 'closed';
};

function statusFromOpeningTime(openingTime: string) {
  if (openingTime === '지금 알려도 좋아요') {
    return 'ready';
  }
  if (openingTime === '열고 싶지 않아요') {
    return 'closed';
  }
  return 'scheduled';
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 소곤파일을 수정할 수 있어요.' }, { status: 409 });
  }

  const fileId = String(params.id);
  const input = await readJson<PatchFileInput>(request);

  const existing = await env.DB.prepare(
    'SELECT id FROM sogon_files WHERE id = ? AND room_id = ?'
  ).bind(fileId, member.room_id).first();

  if (!existing) {
    return json({ error: '소곤파일을 찾을 수 없어요.' }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.content !== undefined) {
    updates.push('content = ?');
    values.push(input.content.trim());
  }
  if (input.openingTime !== undefined) {
    updates.push('opening_time = ?');
    values.push(input.openingTime);
    if (input.status === undefined) {
      updates.push('status = ?');
      values.push(statusFromOpeningTime(input.openingTime));
    }
  }
  if (input.recommendationOn !== undefined) {
    updates.push('recommendation_on = ?');
    values.push(input.recommendationOn ? 1 : 0);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length === 0) {
    return json({ ok: true });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString(), fileId, member.room_id);

  await env.DB.prepare(
    `UPDATE sogon_files SET ${updates.join(', ')} WHERE id = ? AND room_id = ?`
  ).bind(...values).run();

  return json({ ok: true });
};
