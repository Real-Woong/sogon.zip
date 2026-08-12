import { dateKeyInTimeZone, isDateKey } from '../../../../shared/dateQuestions';
import {
  buildCourseSkeleton,
  buildCustomCourseSkeleton,
  isCourseStep,
  isCustomCourseKind,
  resolveDefaultCoursePattern,
  toCourseSteps,
  type CourseStep
} from '../../../../shared/dateCourseSkeleton';
import { roomCommonCoursePattern } from '../_coursePreferences';
import {
  fillCourseWithPlaces,
  type CoursePlaceCandidate,
  type CoursePreferenceSignal
} from '../../../../shared/dateCoursePlaces';
import { isPlaceKind } from '../../../../shared/placeNormalize';
import { CORE_PREFERENCE_TOTAL } from '../../../../shared/corePreferences';
import { all, Env, handle, json, newId, readJson, requireMember } from '../_shared';

type DatePlanRow = {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  origin_area: string | null;
  budget_per_person: number | null;
  course_pattern_json: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  creator_nickname: string | null;
};

type CreateDatePlanInput = {
  title?: string;
  scheduledDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  originArea?: string | null;
  budgetPerPerson?: number | null;
  coursePattern?: CourseStep[] | null;
};

type PlaceRow = {
  id: string;
  kind: string;
  name: string;
  address: string | null;
  area_code: string | null;
  is_indoor: number | null;
  tags_json: string;
  opening_hours_json: string | null;
  starts_at: string | null;
  ends_at: string | null;
  popularity: number | null;
  info_confidence: number;
};

type PreferenceSignalRow = {
  member_id: string;
  tag: string;
  weight: number;
};

type PreferenceProgressRow = {
  member_id: string;
  answer_count: number;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** 1인 예산 상한. 100만원을 넘기면 입력 실수로 본다. */
const MAX_BUDGET_PER_PERSON = 1_000_000;

/** 시간을 정하기 전에 저장된 약속은 종류만 들어 있다. 읽으면서 시간을 붙인다. */
function parseCoursePattern(value: string | null): CourseStep[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.every(item => isCustomCourseKind(item) || isCourseStep(item))
      ? toCourseSteps(parsed)
      : null;
  } catch {
    return null;
  }
}

function buildPlanSkeleton(row: Pick<DatePlanRow, 'start_time' | 'end_time' | 'course_pattern_json'>) {
  if (!row.start_time) return null;
  const pattern = parseCoursePattern(row.course_pattern_json);
  return pattern
    ? buildCustomCourseSkeleton({ startTime: row.start_time, endTime: row.end_time, pattern })
    : buildCourseSkeleton({ startTime: row.start_time, endTime: row.end_time });
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toCandidate(row: PlaceRow): CoursePlaceCandidate | null {
  if (!isPlaceKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    address: row.address,
    areaCode: row.area_code,
    isIndoor: row.is_indoor === null ? null : row.is_indoor === 1,
    tags: parseTags(row.tags_json),
    openingHoursJson: row.opening_hours_json,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    popularity: row.popularity,
    infoConfidence: row.info_confidence
  };
}

function toDatePlan(
  row: DatePlanRow,
  viewerId: string,
  candidates: readonly CoursePlaceCandidate[] = [],
  preferenceSignals: readonly CoursePreferenceSignal[] = [],
  preferenceReady = false,
  preferenceCompletedMembers = 0
) {
  // 시간 창과 동네가 정해졌을 때만 실제 장소를 넣는다. 동네가 없는데 서울 전체에서
  // 하나를 고르면 이동시간 15분이라는 골격과 모순된다.
  const skeleton = buildPlanSkeleton(row);
  const slots = skeleton && !skeleton.error
    ? fillCourseWithPlaces({
        slots: skeleton.slots,
        candidates: row.origin_area
          ? preferenceReady
            ? candidates.filter(candidate => candidate.areaCode === row.origin_area)
            : []
          : [],
        scheduledDate: row.scheduled_date,
        preferenceSignals
      })
    : [];

  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time,
    endTime: row.end_time,
    originArea: row.origin_area,
    budgetPerPerson: row.budget_per_person,
    coursePattern: parseCoursePattern(row.course_pattern_json),
    status: row.status,
    createdAt: row.created_at,
    createdByNickname: row.creator_nickname,
    createdByMe: row.created_by === viewerId,
    course: skeleton && !skeleton.error
      ? {
          slots,
          placeSlotCount: skeleton.placeSlotCount,
          filledPlaceCount: slots.filter(slot => slot.place).length,
          preferenceReady,
          preferenceCompletedMembers,
          preferenceRequiredMembers: 2,
          note: 'note' in skeleton ? skeleton.note : undefined
        }
      : null
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ datePlans: [] });
  }

  const calendarView = new URL(request.url).searchParams.get('view') === 'calendar';
  const today = dateKeyInTimeZone();
  const rows = await all<DatePlanRow>(env.DB.prepare(
    `SELECT p.id, p.title, p.scheduled_date, p.start_time, p.end_time, p.origin_area,
            p.budget_per_person, p.course_pattern_json, p.status, p.created_at,
            p.created_by, m.nickname AS creator_nickname
       FROM date_plans p
       LEFT JOIN members m ON m.id = p.created_by
      WHERE p.room_id = ?
        ${calendarView
          ? "AND p.status IN ('planned', 'completed')"
          : "AND p.status = 'planned' AND p.scheduled_date >= ?"}
      ORDER BY p.scheduled_date ASC, p.start_time ASC, p.created_at ASC`
  ).bind(...(calendarView ? [member.room_id] : [member.room_id, today])));

  // 캘린더는 날짜·제목만 쓰므로 취향 집계와 장소 후보 조회를 하지 않는다.
  if (calendarView) {
    return json({ datePlans: rows.map(row => toDatePlan(row, member.id)) });
  }

  const [progress, signalRows] = await Promise.all([
    all<PreferenceProgressRow>(env.DB.prepare(
      `SELECT m.id AS member_id, COUNT(a.id) AS answer_count
         FROM members m
         LEFT JOIN core_preference_answers a ON a.member_id = m.id
        WHERE m.room_id = ?
        GROUP BY m.id`
    ).bind(member.room_id)),
    all<PreferenceSignalRow>(env.DB.prepare(
      `SELECT member_id, tag, weight
         FROM preference_signals
        WHERE room_id = ? AND is_hard_constraint = 0`
    ).bind(member.room_id))
  ]);
  const preferenceCompletedMembers = progress.filter(
    item => item.answer_count >= CORE_PREFERENCE_TOTAL
  ).length;
  const preferenceReady = progress.length === 2 && preferenceCompletedMembers === 2;
  const preferenceSignals: CoursePreferenceSignal[] = signalRows.map(row => ({
    memberId: row.member_id,
    tag: row.tag,
    weight: row.weight
  }));

  const areas = preferenceReady
    ? [...new Set(rows.map(row => row.origin_area).filter((area): area is string => Boolean(area)))]
    : [];
  let candidates: CoursePlaceCandidate[] = [];
  if (areas.length > 0) {
    const placeholders = areas.map(() => '?').join(', ');
    const placeRows = await all<PlaceRow>(env.DB.prepare(
      `SELECT id, kind, name, address, area_code, is_indoor, tags_json,
              opening_hours_json, starts_at, ends_at, popularity, info_confidence
         FROM places
        WHERE status = 'active'
          AND area_code IN (${placeholders})
          AND kind IN ('restaurant', 'cafe', 'exhibition', 'popup', 'activity', 'park')
        ORDER BY info_confidence DESC, name ASC
        LIMIT 600`
    ).bind(...areas));
    candidates = placeRows.map(toCandidate).filter((item): item is CoursePlaceCandidate => Boolean(item));
  }

  return json({
    datePlans: rows.map(row => toDatePlan(
      row,
      member.id,
      candidates,
      preferenceSignals,
      preferenceReady,
      preferenceCompletedMembers
    ))
  });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 데이트 약속을 정할 수 있어요.' }, { status: 409 });
  }

  const input = await readJson<CreateDatePlanInput>(request);
  const title = input.title?.trim();
  const scheduledDate = input.scheduledDate?.trim() ?? '';
  const startTime = input.startTime?.trim() || null;
  const endTime = input.endTime?.trim() || null;
  const originArea = input.originArea?.trim() || null;
  const budgetPerPerson =
    typeof input.budgetPerPerson === 'number' && Number.isFinite(input.budgetPerPerson)
      ? Math.round(input.budgetPerPerson)
      : null;
  // 사용자가 직접 구성한 흐름. 비어 있으면 둘이 맞춘 기본 코스를 아래에서 채운다.
  const explicitPattern = input.coursePattern ?? null;

  if (!title) {
    return json({ error: '어떤 약속인지 이름을 적어주세요.' }, { status: 400 });
  }
  if (title.length > 40) {
    return json({ error: '약속 이름은 40자까지 적을 수 있어요.' }, { status: 400 });
  }
  if (!isDateKey(scheduledDate)) {
    return json({ error: '약속 날짜를 올바르게 골라주세요.' }, { status: 400 });
  }
  if (scheduledDate < dateKeyInTimeZone()) {
    return json({ error: '오늘보다 이전 날짜에는 새 약속을 만들 수 없어요.' }, { status: 400 });
  }
  if (startTime && !TIME_PATTERN.test(startTime)) {
    return json({ error: '약속 시간을 올바르게 골라주세요.' }, { status: 400 });
  }
  if (endTime && !TIME_PATTERN.test(endTime)) {
    return json({ error: '끝나는 시간을 올바르게 골라주세요.' }, { status: 400 });
  }
  if (endTime && !startTime) {
    return json({ error: '시작 시간을 먼저 정해주세요.' }, { status: 400 });
  }
  if (explicitPattern !== null && (
    !Array.isArray(explicitPattern) ||
    explicitPattern.length < 1 ||
    explicitPattern.length > 8 ||
    !explicitPattern.every(item => isCustomCourseKind(item) || isCourseStep(item))
  )) {
    return json({ error: '데이트 흐름을 다시 골라주세요.' }, { status: 400 });
  }
  // 직접 구성한 흐름에만 걸리는 조건이다. 둘의 기본 코스는 창을 못 채우면
  // 규칙 기본 코스로 물러나므로 끝나는 시간을 강요하지 않는다.
  if (explicitPattern && (!startTime || !endTime)) {
    return json({ error: '직접 구성한 흐름을 저장하려면 시작과 끝 시간을 모두 정해주세요.' }, { status: 400 });
  }

  // 흐름을 직접 짜지 않았으면 둘이 맞춘 접점을 기본값으로 쓴다. 접점이 짧아
  // 시간 창을 못 채우면 `resolveDefaultCoursePattern`이 null을 주고 규칙 기본
  // 코스로 돌아간다. 화면과 서버가 같은 판정을 쓰도록 shared에 한 벌만 둔다.
  const coursePattern = (explicitPattern && toCourseSteps(explicitPattern)) ?? (startTime
    ? resolveDefaultCoursePattern({
        startTime,
        endTime,
        pattern: await roomCommonCoursePattern(env, member.room_id)
      })
    : null);

  // 시간 창을 둘 다 넣었으면 실제로 코스가 나오는 창인지 여기서 확인한다.
  // 화면에서만 막으면 저장은 되고 코스만 안 나오는 약속이 남는다.
  if (startTime && endTime) {
    const window = coursePattern
      ? buildCustomCourseSkeleton({ startTime, endTime, pattern: coursePattern })
      : buildCourseSkeleton({ startTime, endTime });
    if (window.error) {
      return json({ error: window.error }, { status: 400 });
    }
  }

  if (budgetPerPerson !== null && (budgetPerPerson < 0 || budgetPerPerson > MAX_BUDGET_PER_PERSON)) {
    return json({ error: '1인 예산은 0원에서 100만원 사이로 적어주세요.' }, { status: 400 });
  }
  if (originArea && originArea.length > 20) {
    return json({ error: '만나는 동네 이름이 너무 길어요.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row: DatePlanRow = {
    id: newId('plan'),
    title,
    scheduled_date: scheduledDate,
    start_time: startTime,
    end_time: endTime,
    origin_area: originArea,
    budget_per_person: budgetPerPerson,
    course_pattern_json: coursePattern ? JSON.stringify(coursePattern) : null,
    status: 'planned',
    created_at: now,
    created_by: member.id,
    creator_nickname: member.nickname
  };

  await env.DB.prepare(
    `INSERT INTO date_plans
      (id, room_id, created_by, title, scheduled_date, start_time, end_time,
       origin_area, budget_per_person, course_pattern_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
  ).bind(
    row.id,
    member.room_id,
    member.id,
    row.title,
    row.scheduled_date,
    row.start_time,
    row.end_time,
    row.origin_area,
    row.budget_per_person,
    row.course_pattern_json,
    now,
    now
  ).run();

  return json({ datePlan: toDatePlan(row, member.id) }, { status: 201 });
});
