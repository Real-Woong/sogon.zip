import { all, Env, json, newId, readJson, requireMember } from '../_shared';

type FileRow = {
  id: string;
  tags_json: string;
  content: string;
  sensitivity: string;
  opening_time: string;
  recommendation_on: number;
  status: 'scheduled' | 'ready' | 'opened' | 'closed';
  created_at: string;
};

type CreateFileInput = {
  tags?: string[];
  content?: string;
  sensitivity?: string;
  openingTime?: string;
  recommendationOn?: boolean;
  status?: 'scheduled' | 'ready' | 'opened' | 'closed';
};

function toFile(row: FileRow) {
  return {
    id: row.id,
    tags: JSON.parse(row.tags_json) as string[],
    content: row.content,
    sensitivity: row.sensitivity,
    openingTime: row.opening_time,
    recommendationOn: Boolean(row.recommendation_on),
    status: row.status,
    createdAt: row.created_at
  };
}

function statusFromOpeningTime(openingTime: string) {
  if (openingTime === '지금 알려도 좋아요') {
    return 'ready';
  }
  if (openingTime === '열고 싶지 않아요') {
    return 'closed';
  }
  return 'scheduled';
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);
  const rows = await all<FileRow>(env.DB.prepare(
    `SELECT id, tags_json, content, sensitivity, opening_time, recommendation_on, status, created_at
       FROM sogon_files
      WHERE room_id = ?
      ORDER BY created_at DESC`
  ).bind(member.room_id));

  return json({ files: rows.map(toFile) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);
  const input = await readJson<CreateFileInput>(request);
  const content = input.content?.trim();
  const openingTime = input.openingTime ?? '내가 직접 열게요';

  if (!content) {
    return json({ error: '압축할 내용을 입력해주세요.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const file = {
    id: newId('file'),
    tags: input.tags?.length ? input.tags : ['기타'],
    content,
    sensitivity: input.sensitivity ?? '🙂',
    openingTime,
    recommendationOn: input.recommendationOn ?? true,
    status: input.status ?? statusFromOpeningTime(openingTime),
    createdAt: now
  };

  await env.DB.prepare(
    `INSERT INTO sogon_files
      (id, room_id, author_member_id, tags_json, content, sensitivity, opening_time, recommendation_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    file.id,
    member.room_id,
    member.id,
    JSON.stringify(file.tags),
    file.content,
    file.sensitivity,
    file.openingTime,
    file.recommendationOn ? 1 : 0,
    file.status,
    now,
    now
  ).run();

  return json({ file }, { status: 201 });
};
