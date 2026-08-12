import type { CustomCourseKind } from '../../../shared/dateCourseSkeleton';
import {
  commonCoursePattern,
  isValidCoursePattern
} from '../../../shared/coursePreferences';
import { all, Env } from './_shared';

type PreferenceRow = {
  member_id: string;
  nickname: string;
  pattern_json: string | null;
};

export function parseCoursePreferencePattern(value: string | null): CustomCourseKind[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return isValidCoursePattern(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readRoomPatterns(env: Env, roomId: string) {
  // 생성 순서를 고정해야 어느 계정에서 보더라도 공통 흐름의 tie-break 결과가 같다.
  const rows = await all<PreferenceRow>(env.DB.prepare(
    `SELECT m.id AS member_id, m.nickname, p.pattern_json
       FROM members m
       LEFT JOIN member_course_preferences p ON p.member_id = m.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC, m.id ASC`
  ).bind(roomId));
  return rows.map(row => ({
    memberId: row.member_id,
    nickname: row.nickname,
    pattern: parseCoursePreferencePattern(row.pattern_json)
  }));
}

/**
 * 두 사람이 모두 순서를 저장했을 때의 접점. 한쪽이라도 비어 있으면 빈 배열이다.
 * 약속 기본 코스와 `/api/course-preferences` 화면이 같은 값을 보게 여기 한 곳에서만 만든다.
 */
export async function roomCommonCoursePattern(env: Env, roomId: string) {
  const members = await readRoomPatterns(env, roomId);
  if (members.length !== 2 || members.some(member => member.pattern.length === 0)) {
    return [];
  }
  return commonCoursePattern(members[0].pattern, members[1].pattern);
}

export async function coursePreferenceStatus(env: Env, roomId: string, viewerId: string) {
  const members = await readRoomPatterns(env, roomId);
  const ready = members.length === 2 && members.every(member => member.pattern.length > 0);
  const commonPattern = ready
    ? commonCoursePattern(members[0].pattern, members[1].pattern)
    : [];
  const agreed = ready &&
    JSON.stringify(members[0].pattern) === JSON.stringify(members[1].pattern);
  const toMember = (member: (typeof members)[number] | undefined) => member ? ({
    nickname: member.nickname,
    pattern: member.pattern,
    complete: member.pattern.length > 0
  }) : null;

  return {
    mine: toMember(members.find(member => member.memberId === viewerId)),
    partner: toMember(members.find(member => member.memberId !== viewerId)),
    commonPattern,
    ready,
    agreed,
    needsCoordination: ready && !agreed
  };
}
