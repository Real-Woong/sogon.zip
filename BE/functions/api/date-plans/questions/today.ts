import {
  dateKeyInTimeZone,
  findDateQuestion,
  questionForDate
} from '../../../../../shared/dateQuestions';
import { all, Env, handle, json, newId, readJson, requireMember } from '../../_shared';

type PlanRow = {
  id: string;
  title: string;
  scheduled_date: string;
};

type AnswerRow = {
  option_id: string;
};

type SubmitAnswerInput = {
  planId?: string;
  questionId?: string;
  optionId?: string;
};

async function findActiveQuestion(env: Env, roomId: string, today: string) {
  const plans = await all<PlanRow>(env.DB.prepare(
    `SELECT id, title, scheduled_date
       FROM date_plans
      WHERE room_id = ? AND status = 'planned' AND scheduled_date > ?
      ORDER BY scheduled_date ASC, created_at ASC`
  ).bind(roomId, today));

  for (const plan of plans) {
    const question = questionForDate(plan.scheduled_date, today);
    if (question) {
      return { plan, question };
    }
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ todayQuestion: null });
  }

  const today = dateKeyInTimeZone();
  const active = await findActiveQuestion(env, member.room_id, today);
  if (!active) {
    return json({ todayQuestion: null });
  }

  const [answer, count] = await Promise.all([
    env.DB.prepare(
      `SELECT option_id
         FROM date_question_answers
        WHERE plan_id = ? AND member_id = ? AND question_id = ?`
    ).bind(active.plan.id, member.id, active.question.id).first<AnswerRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count
         FROM date_question_answers
        WHERE plan_id = ? AND question_id = ?`
    ).bind(active.plan.id, active.question.id).first<{ count: number }>()
  ]);

  return json({
    todayQuestion: {
      plan: {
        id: active.plan.id,
        title: active.plan.title,
        scheduledDate: active.plan.scheduled_date
      },
      question: active.question,
      answeredOptionId: answer?.option_id ?? null,
      answeredCount: count?.count ?? 0
    }
  });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 오늘의 질문에 답할 수 있어요.' }, { status: 409 });
  }

  const input = await readJson<SubmitAnswerInput>(request);
  const today = dateKeyInTimeZone();
  const active = await findActiveQuestion(env, member.room_id, today);

  if (!active || input.planId !== active.plan.id || input.questionId !== active.question.id) {
    return json({ error: '오늘 답할 수 있는 질문이 아니에요.' }, { status: 409 });
  }

  const definition = findDateQuestion(active.question.id, input.optionId);
  const option = definition?.option;
  if (!option) {
    return json({ error: '답변 선택지를 다시 골라주세요.' }, { status: 400 });
  }

  const existing = await env.DB.prepare(
    `SELECT option_id
       FROM date_question_answers
      WHERE plan_id = ? AND member_id = ? AND question_id = ?`
  ).bind(active.plan.id, member.id, active.question.id).first<AnswerRow>();

  if (existing) {
    return json({ error: '오늘의 질문에는 이미 답했어요.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const preferenceId = newId('pref');
  const answerId = newId('answer');
  const signalId = newId('signal');
  const preferenceText = `${active.question.prompt} — ${option.label}`;

  // D1 batch는 전부 성공하거나 전부 되돌아간다. 답만 있고 취향 신호가 없는
  // 중간 상태가 생기면 사용자는 재답변도 못 하고 추천에도 반영되지 않는다.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO preferences (id, room_id, member_id, category, text, created_at)
       VALUES (?, ?, ?, '오늘의 질문', ?, ?)`
    ).bind(preferenceId, member.room_id, member.id, preferenceText, now),
    env.DB.prepare(
      `INSERT INTO preference_signals
        (id, room_id, member_id, axis, tag, weight, is_hard_constraint, source,
         source_preference_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'question', ?, ?, ?)
       ON CONFLICT(member_id, axis, tag) DO UPDATE SET
         room_id = excluded.room_id,
         weight = excluded.weight,
         is_hard_constraint = 0,
         source = 'question',
         source_preference_id = excluded.source_preference_id,
         updated_at = excluded.updated_at`
    ).bind(
      signalId,
      member.room_id,
      member.id,
      option.axis,
      option.tag,
      option.weight,
      preferenceId,
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO date_question_answers
        (id, plan_id, room_id, member_id, question_id, option_id, axis, tag, weight,
         preference_id, answered_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      answerId,
      active.plan.id,
      member.room_id,
      member.id,
      active.question.id,
      option.id,
      option.axis,
      option.tag,
      option.weight,
      preferenceId,
      today,
      now
    )
  ]);

  return json({
    answer: { optionId: option.id, optionLabel: option.label },
    preference: {
      id: preferenceId,
      category: '오늘의 질문',
      text: preferenceText,
      createdAt: now
    }
  }, { status: 201 });
});
