import { all, Env, handle, json, newId, readJson, requireMember } from '../_shared';

type PreferenceRow = {
  id: string;
  category: string;
  text: string;
  created_at: string;
};

type CreatePreferenceInput = {
  category?: string;
  text?: string;
};

function toPreference(row: PreferenceRow) {
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    createdAt: row.created_at
  };
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ preferences: [] });
  }

  const rows = await all<PreferenceRow>(env.DB.prepare(
    `SELECT id, category, text, created_at
       FROM preferences
      WHERE room_id = ?
      ORDER BY created_at DESC`
  ).bind(member.room_id));

  return json({ preferences: rows.map(toPreference) });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 취향 기록을 공유할 수 있어요.' }, { status: 409 });
  }

  const input = await readJson<CreatePreferenceInput>(request);
  const category = input.category?.trim() || '기타';
  const text = input.text?.trim();

  if (!text) {
    return json({ error: '취향 내용을 입력해주세요.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const preference = {
    id: newId('pref'),
    category,
    text,
    createdAt: now
  };

  await env.DB.prepare(
    'INSERT INTO preferences (id, room_id, member_id, category, text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(preference.id, member.room_id, member.id, category, text, now).run();

  return json({ preference }, { status: 201 });
});
