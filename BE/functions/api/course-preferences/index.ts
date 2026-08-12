import type { CustomCourseKind } from '../../../../shared/dateCourseSkeleton';
import {
  commonCoursePattern,
  isValidCoursePattern
} from '../../../../shared/coursePreferences';
import { all, Env, handle, json, readJson, requireMember } from '../_shared';

type PreferenceRow = {
  member_id: string;
  nickname: string;
  pattern_json: string | null;
};

type SaveInput = {
  pattern?: CustomCourseKind[];
};

function parsePattern(value: string | null): CustomCourseKind[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return isValidCoursePattern(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function statusFor(env: Env, roomId: string, viewerId: string) {
  // 생성 순서를 고정해야 어느 계정에서 보더라도 공통 흐름의 tie-break 결과가 같다.
  const rows = await all<PreferenceRow>(env.DB.prepare(
    `SELECT m.id AS member_id, m.nickname, p.pattern_json
       FROM members m
       LEFT JOIN member_course_preferences p ON p.member_id = m.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC, m.id ASC`
  ).bind(roomId));
  const patterns = rows.map(row => parsePattern(row.pattern_json));
  const commonPattern = rows.length === 2 && patterns.every(pattern => pattern.length > 0)
    ? commonCoursePattern(patterns[0], patterns[1])
    : [];
  const ready = rows.length === 2 && patterns.every(pattern => pattern.length > 0);
  const agreed = ready && JSON.stringify(patterns[0]) === JSON.stringify(patterns[1]);
  const toMember = (row: PreferenceRow | undefined) => row ? ({
    nickname: row.nickname,
    pattern: parsePattern(row.pattern_json),
    complete: parsePattern(row.pattern_json).length > 0
  }) : null;

  return {
    mine: toMember(rows.find(row => row.member_id === viewerId)),
    partner: toMember(rows.find(row => row.member_id !== viewerId)),
    commonPattern,
    ready,
    agreed,
    needsCoordination: ready && !agreed
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 기본 코스를 맞출 수 있어요.' }, { status: 409 });
  }
  return json({ coursePreferences: await statusFor(env, member.room_id, member.id) });
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

  return json({ coursePreferences: await statusFor(env, member.room_id, member.id) });
});
