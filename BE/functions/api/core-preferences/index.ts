import {
  CORE_PREFERENCE_QUESTIONS,
  CORE_PREFERENCE_TOTAL,
  findCorePreference
} from '../../../../shared/corePreferences';
import { all, Env, handle, json, newId, readJson, requireMember } from '../_shared';

type AnswerRow = {
  question_id: string;
  option_id: string;
};

type MemberProgressRow = {
  member_id: string;
  nickname: string;
  answer_count: number;
};

type SubmitAnswerInput = {
  questionId?: string;
  optionId?: string;
};

async function statusFor(env: Env, roomId: string, memberId: string) {
  const [answers, progress] = await Promise.all([
    all<AnswerRow>(env.DB.prepare(
      `SELECT question_id, option_id
         FROM core_preference_answers
        WHERE room_id = ? AND member_id = ?`
    ).bind(roomId, memberId)),
    all<MemberProgressRow>(env.DB.prepare(
      `SELECT m.id AS member_id, m.nickname, COUNT(a.id) AS answer_count
         FROM members m
         LEFT JOIN core_preference_answers a ON a.member_id = m.id
        WHERE m.room_id = ?
        GROUP BY m.id, m.nickname
        ORDER BY m.created_at ASC`
    ).bind(roomId))
  ]);

  const mine = progress.find(item => item.member_id === memberId);
  const partner = progress.find(item => item.member_id !== memberId);
  const completedMembers = progress.filter(item => item.answer_count >= CORE_PREFERENCE_TOTAL).length;

  return {
    questions: CORE_PREFERENCE_QUESTIONS,
    answers: Object.fromEntries(answers.map(answer => [answer.question_id, answer.option_id])),
    total: CORE_PREFERENCE_TOTAL,
    answeredCount: mine?.answer_count ?? 0,
    complete: (mine?.answer_count ?? 0) >= CORE_PREFERENCE_TOTAL,
    partner: partner
      ? {
          nickname: partner.nickname,
          answeredCount: partner.answer_count,
          complete: partner.answer_count >= CORE_PREFERENCE_TOTAL
        }
      : null,
    coupleReady: progress.length === 2 && completedMembers === 2
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 취향을 함께 맞출 수 있어요.' }, { status: 409 });
  }
  return json({ corePreferences: await statusFor(env, member.room_id, member.id) });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 취향을 공유할 수 있어요.' }, { status: 409 });
  }

  const input = await readJson<SubmitAnswerInput>(request);
  const definition = findCorePreference(input.questionId ?? '', input.optionId ?? '');
  if (!definition) {
    return json({ error: '질문과 답변을 다시 골라주세요.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const answerId = newId('core_answer');
  const signalId = newId('signal');

  // 답변과 추천 신호가 반드시 같은 순간에 바뀌어야 화면 진행률과 추천 결과가 어긋나지 않는다.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO core_preference_answers
        (id, room_id, member_id, question_id, option_id, axis, tag, weight, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(member_id, question_id) DO UPDATE SET
         room_id = excluded.room_id,
         option_id = excluded.option_id,
         axis = excluded.axis,
         tag = excluded.tag,
         weight = excluded.weight,
         updated_at = excluded.updated_at`
    ).bind(
      answerId,
      member.room_id,
      member.id,
      definition.question.id,
      definition.option.id,
      definition.question.axis,
      definition.question.tag,
      definition.option.weight,
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO preference_signals
        (id, room_id, member_id, axis, tag, weight, is_hard_constraint, source,
         source_preference_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'core_question', NULL, ?, ?)
       ON CONFLICT(member_id, axis, tag) DO UPDATE SET
         room_id = excluded.room_id,
         weight = excluded.weight,
         is_hard_constraint = 0,
         source = 'core_question',
         source_preference_id = NULL,
         updated_at = excluded.updated_at`
    ).bind(
      signalId,
      member.room_id,
      member.id,
      definition.question.axis,
      definition.question.tag,
      definition.option.weight,
      now,
      now
    )
  ]);

  return json({ corePreferences: await statusFor(env, member.room_id, member.id) });
});
