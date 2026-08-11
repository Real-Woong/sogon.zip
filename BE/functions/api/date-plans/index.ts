import { dateKeyInTimeZone, isDateKey } from '../../../../shared/dateQuestions';
import { buildCourseSkeleton } from '../../../../shared/dateCourseSkeleton';
import { all, Env, handle, json, newId, readJson, requireMember } from '../_shared';

type DatePlanRow = {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  origin_area: string | null;
  budget_per_person: number | null;
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
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** 1인 예산 상한. 100만원을 넘기면 입력 실수로 본다. */
const MAX_BUDGET_PER_PERSON = 1_000_000;

function toDatePlan(row: DatePlanRow, viewerId: string) {
  // 시간 창이 정해진 약속은 골격을 함께 내려준다. 화면이 "이날 이렇게 흘러가요"를
  // 장소 없이도 보여줄 수 있고, 아직 후보 생성이 없는 지금은 이게 코스의 전부다.
  const skeleton = row.start_time
    ? buildCourseSkeleton({ startTime: row.start_time, endTime: row.end_time })
    : null;

  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time,
    endTime: row.end_time,
    originArea: row.origin_area,
    budgetPerPerson: row.budget_per_person,
    status: row.status,
    createdAt: row.created_at,
    createdByNickname: row.creator_nickname,
    createdByMe: row.created_by === viewerId,
    course: skeleton && !skeleton.error
      ? { slots: skeleton.slots, placeSlotCount: skeleton.placeSlotCount, note: skeleton.note }
      : null
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ datePlans: [] });
  }

  const today = dateKeyInTimeZone();
  const rows = await all<DatePlanRow>(env.DB.prepare(
    `SELECT p.id, p.title, p.scheduled_date, p.start_time, p.end_time, p.origin_area,
            p.budget_per_person, p.status, p.created_at,
            p.created_by, m.nickname AS creator_nickname
       FROM date_plans p
       LEFT JOIN members m ON m.id = p.created_by
      WHERE p.room_id = ?
        AND p.status = 'planned'
        AND p.scheduled_date >= ?
      ORDER BY p.scheduled_date ASC, p.start_time ASC, p.created_at ASC`
  ).bind(member.room_id, today));

  return json({ datePlans: rows.map(row => toDatePlan(row, member.id)) });
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

  // 시간 창을 둘 다 넣었으면 실제로 코스가 나오는 창인지 여기서 확인한다.
  // 화면에서만 막으면 저장은 되고 코스만 안 나오는 약속이 남는다.
  if (startTime && endTime) {
    const window = buildCourseSkeleton({ startTime, endTime });
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
    status: 'planned',
    created_at: now,
    created_by: member.id,
    creator_nickname: member.nickname
  };

  await env.DB.prepare(
    `INSERT INTO date_plans
      (id, room_id, created_by, title, scheduled_date, start_time, end_time,
       origin_area, budget_per_person, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
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
    now,
    now
  ).run();

  return json({ datePlan: toDatePlan(row, member.id) }, { status: 201 });
});
