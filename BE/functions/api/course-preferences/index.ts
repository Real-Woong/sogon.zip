import { toCourseSteps, type CourseStep } from '../../../../shared/dateCourseSkeleton';
import { isValidCoursePattern } from '../../../../shared/coursePreferences';
import { coursePreferenceStatus } from '../_coursePreferences';
import { Env, handle, json, readJson, requireMember } from '../_shared';

type SaveInput = {
  pattern?: CourseStep[];
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
    return json({ error: '기본 코스는 1개에서 8개 사이로, 칸마다 30분에서 6시간으로 정해주세요.' }, { status: 400 });
  }
  // 종류만 온 옛 클라이언트도 시간이 붙은 형태로 통일해 저장한다.
  const steps = toCourseSteps(input.pattern);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO member_course_preferences
      (member_id, room_id, pattern_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(member_id) DO UPDATE SET
       room_id = excluded.room_id,
       pattern_json = excluded.pattern_json,
       updated_at = excluded.updated_at`
  ).bind(member.id, member.room_id, JSON.stringify(steps), now, now).run();

  return json({ coursePreferences: await coursePreferenceStatus(env, member.room_id, member.id) });
});
