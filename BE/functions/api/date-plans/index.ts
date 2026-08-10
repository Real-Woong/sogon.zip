import { dateKeyInTimeZone, isDateKey } from '../../../../shared/dateQuestions';
import { all, Env, handle, json, newId, readJson, requireMember } from '../_shared';

type DatePlanRow = {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  creator_nickname: string | null;
};

type CreateDatePlanInput = {
  title?: string;
  scheduledDate?: string;
  startTime?: string | null;
};

function toDatePlan(row: DatePlanRow, viewerId: string) {
  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time,
    status: row.status,
    createdAt: row.created_at,
    createdByNickname: row.creator_nickname,
    createdByMe: row.created_by === viewerId
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ datePlans: [] });
  }

  const today = dateKeyInTimeZone();
  const rows = await all<DatePlanRow>(env.DB.prepare(
    `SELECT p.id, p.title, p.scheduled_date, p.start_time, p.status, p.created_at,
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
  if (startTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return json({ error: '약속 시간을 올바르게 골라주세요.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row: DatePlanRow = {
    id: newId('plan'),
    title,
    scheduled_date: scheduledDate,
    start_time: startTime,
    status: 'planned',
    created_at: now,
    created_by: member.id,
    creator_nickname: member.nickname
  };

  await env.DB.prepare(
    `INSERT INTO date_plans
      (id, room_id, created_by, title, scheduled_date, start_time, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
  ).bind(
    row.id,
    member.room_id,
    member.id,
    row.title,
    row.scheduled_date,
    row.start_time,
    now,
    now
  ).run();

  return json({ datePlan: toDatePlan(row, member.id) }, { status: 201 });
});
