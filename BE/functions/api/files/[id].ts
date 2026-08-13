import { Env, handle, json, readJson, requireMember, resolveOpening } from '../_shared';
import type { SogonFileStatus } from '../../../../shared/sogonOpening';

type PatchFileInput = {
  content?: string;
  openingTime?: string;
  openingAt?: string | null;
  recommendationOn?: boolean;
  status?: SogonFileStatus;
};

const EDITABLE_STATUSES: SogonFileStatus[] = ['scheduled', 'ready', 'opened', 'closed'];

/** 내가 쓴 소곤파일을 지운다. 열린 파일도 지울 수 있다(작성자에게 마지막 권한). */
export const onRequestDelete: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '소곤파일을 찾을 수 없어요.' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    'DELETE FROM sogon_files WHERE id = ? AND room_id = ? AND author_member_id = ?'
  ).bind(String(params.id), member.room_id, member.id).run();

  if (result.meta.changes === 0) {
    return json({ error: '소곤파일을 찾을 수 없어요.' }, { status: 404 });
  }

  return json({ ok: true });
});

export const onRequestPatch: PagesFunction<Env> = handle(async ({ request, env, params }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 소곤파일을 수정할 수 있어요.' }, { status: 409 });
  }

  const fileId = String(params.id);
  const input = await readJson<PatchFileInput>(request);

  // 같은 방이라는 이유만으로 상대의 소곤파일을 수정하거나 강제로 열 수 없어야 한다.
  // 작성자 본인만 수정할 수 있다.
  const existing = await env.DB.prepare(
    `SELECT id, opening_time, opening_at, status
       FROM sogon_files
      WHERE id = ? AND room_id = ? AND author_member_id = ?`
  ).bind(fileId, member.room_id, member.id).first<{
    id: string;
    opening_time: string;
    opening_at: string | null;
    status: SogonFileStatus;
  }>();

  if (!existing) {
    return json({ error: '소곤파일을 찾을 수 없어요.' }, { status: 404 });
  }

  // 한 번 열린 파일은 관계의 기록이므로 되돌리거나 고칠 수 없다.
  if (existing.status === 'opened') {
    return json({ error: '이미 열린 소곤파일은 수정할 수 없어요.' }, { status: 409 });
  }

  if (input.status !== undefined && !EDITABLE_STATUSES.includes(input.status)) {
    return json({ error: '알 수 없는 파일 상태예요.' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.content !== undefined) {
    const content = input.content.trim();
    if (!content) {
      return json({ error: '내용을 비울 수는 없어요.' }, { status: 400 });
    }
    updates.push('content = ?');
    values.push(content);
  }

  if (input.recommendationOn !== undefined) {
    updates.push('recommendation_on = ?');
    values.push(input.recommendationOn ? 1 : 0);
  }

  // 열림 시점이 바뀌면 opening_at과 status를 규칙에서 함께 다시 계산한다.
  if (input.openingTime !== undefined || input.openingAt !== undefined) {
    const opening = resolveOpening({
      openingTime: input.openingTime ?? existing.opening_time,
      openingAt: input.openingAt ?? existing.opening_at
    });
    updates.push('opening_time = ?', 'opening_at = ?');
    values.push(opening.openingTime, opening.openingAt);

    if (input.status === undefined) {
      updates.push('status = ?');
      values.push(opening.status);
    }
  }

  // 작성자가 직접 여는 것은 언제든 허용한다("owner control comes first").
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);

    // 연 시각은 이 순간에만 알 수 있다. 나중에 소급이 안 되므로 여기서 남긴다.
    // 기록 캘린더가 "열어본 날"을 찍는 근거이자, 상대 홈의 도착 배너 기준이다.
    if (input.status === 'opened') {
      updates.push('opened_at = ?');
      values.push(new Date().toISOString());
    }
  }

  if (updates.length === 0) {
    return json({ ok: true });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString(), fileId, member.room_id, member.id);

  await env.DB.prepare(
    `UPDATE sogon_files SET ${updates.join(', ')}
      WHERE id = ? AND room_id = ? AND author_member_id = ?`
  ).bind(...values).run();

  const updated = await env.DB.prepare(
    `SELECT opening_time, opening_at, status, opened_at FROM sogon_files WHERE id = ?`
  ).bind(fileId).first<{
    opening_time: string;
    opening_at: string | null;
    status: SogonFileStatus;
    opened_at: string | null;
  }>();

  return json({
    ok: true,
    file: updated
      ? {
          id: fileId,
          openingTime: updated.opening_time,
          openingAt: updated.opening_at,
          status: updated.status,
          openedAt: updated.opened_at
        }
      : null
  });
});
