import type { CustomCourseKind } from '../../../../shared/dateCourseSkeleton';
import { isValidCoursePattern } from '../../../../shared/coursePreferences';
import { coursePreferenceStatus } from '../_coursePreferences';
import { Env, handle, json, readJson, requireMember } from '../_shared';

type SaveInput = {
  pattern?: CustomCourseKind[];
};

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 기본 코스를 맞출 수 있어요.' }, { status: 409 });
  }
  return json({ coursePreferences: await coursePreferenceStatus(env, member.room_id, member.id) });
});

export const onRequestPut: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 기본 코스를 공유할 수 있어요.' }, { status: 409 });
  }
  const input = await readJson<SaveInput>(request);
  if (!isValidCoursePattern(input.pattern)) {
    return json({ error: '기본 코스는 1개에서 8개 사이로 골라주세요.' }, { status: 400 });
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO member_course_preferences
      (member_id, room_id, pattern_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(member_id) DO UPDATE SET
       room_id = excluded.room_id,
       pattern_json = excluded.pattern_json,
       updated_at = excluded.updated_at`
  ).bind(member.id, member.room_id, JSON.stringify(input.pattern), now, now).run();

  return json({ coursePreferences: await coursePreferenceStatus(env, member.room_id, member.id) });
});
