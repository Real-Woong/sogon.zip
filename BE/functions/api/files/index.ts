import {
  all,
  Env,
  handle,
  json,
  newId,
  promoteReadyFiles,
  readJson,
  requireMember,
  resolveOpening
} from '../_shared';
import type { SogonFileStatus } from '../../../../shared/sogonOpening';

type FileRow = {
  id: string;
  author_member_id: string;
  tags_json: string;
  content: string;
  sensitivity: string;
  opening_time: string;
  opening_at: string | null;
  recommendation_on: number;
  status: SogonFileStatus;
  created_at: string;
  opened_at: string | null;
  partner_seen_at: string | null;
};

type CreateFileInput = {
  tags?: string[];
  content?: string;
  sensitivity?: string;
  openingTime?: string;
  /** '직접 날짜 선택'일 때의 실제 날짜 (ISO 또는 YYYY-MM-DD) */
  openingAt?: string | null;
  recommendationOn?: boolean;
};

function toFile(row: FileRow, viewerId: string) {
  return {
    id: row.id,
    tags: parseTags(row.tags_json),
    content: row.content,
    sensitivity: row.sensitivity,
    openingTime: row.opening_time,
    openingAt: row.opening_at,
    recommendationOn: Boolean(row.recommendation_on),
    status: row.status,
    createdAt: row.created_at,
    // 열린 시각을 모르는 옛 파일은 쓴 날로 물러난다. 0009 이전에 열린 것들이다.
    openedAt: row.opened_at,
    partnerSeenAt: row.partner_seen_at,
    isMine: row.author_member_id === viewerId
  };
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : ['기타'];
  } catch {
    return ['기타'];
  }
}

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ files: [] });
  }

  // 개봉 시각이 지난 파일을 먼저 ready로 올린다. (별도 스케줄러 없이 지연 승격)
  await promoteReadyFiles(env, member.room_id);

  // 상대에게는 "열린 파일"만 보인다.
  // 예전 쿼리는 room_id만으로 필터해서, 아직 열지 않은 소곤파일의 원문이
  // 상대에게 그대로 내려갔다. 제품의 첫 번째 약속을 정면으로 어기는 버그였다.
  const rows = await all<FileRow>(env.DB.prepare(
    `SELECT id, author_member_id, tags_json, content, sensitivity, opening_time, opening_at,
            recommendation_on, status, created_at, opened_at, partner_seen_at
       FROM sogon_files
      WHERE room_id = ?
        AND (author_member_id = ? OR status = 'opened')
      ORDER BY created_at DESC`
  ).bind(member.room_id, member.id));

  return json({ files: rows.map(row => toFile(row, member.id)) });
});

export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '내 사람과 연결한 뒤 소곤파일을 공유할 수 있어요.' }, { status: 409 });
  }

  const input = await readJson<CreateFileInput>(request);
  const content = input.content?.trim();

  if (!content) {
    return json({ error: '압축할 내용을 입력해주세요.' }, { status: 400 });
  }

  const opening = resolveOpening({
    openingTime: input.openingTime,
    openingAt: input.openingAt
  });

  const now = new Date().toISOString();
  const file = {
    id: newId('file'),
    tags: input.tags?.length ? input.tags : ['기타'],
    content,
    sensitivity: input.sensitivity ?? '🙂',
    openingTime: opening.openingTime,
    openingAt: opening.openingAt,
    recommendationOn: input.recommendationOn ?? true,
    // 상태는 클라이언트가 지정할 수 없다. 열림 시점 규칙에서만 결정된다.
    status: opening.status,
    createdAt: now,
    // 방금 만든 파일은 열린 적이 없다. 즉시 열림('바로 열기')이라도 여는 건 별도 행동이다.
    openedAt: null,
    partnerSeenAt: null,
    isMine: true
  };

  await env.DB.prepare(
    `INSERT INTO sogon_files
      (id, room_id, author_member_id, tags_json, content, sensitivity, opening_time, opening_at,
       recommendation_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    file.id,
    member.room_id,
    member.id,
    JSON.stringify(file.tags),
    file.content,
    file.sensitivity,
    file.openingTime,
    file.openingAt,
    file.recommendationOn ? 1 : 0,
    file.status,
    now,
    now
  ).run();

  return json({ file }, { status: 201 });
});
