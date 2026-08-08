/**
 * 중복 병합 검토 큐. 같은 상호가 걸어갈 만한 거리에 두 번 등록되면 여기 쌓인다.
 *
 * 자동 병합을 100% 신뢰하면 "성수점"과 "성수 2호점"이 한 장소로 합쳐지거나,
 * 같은 팝업이 두 번 추천된다. 둘 다 신뢰를 잃는 방식이라 사람이 판단한다.
 */
import { all, Env, handle, json, requireAdmin } from '../../_shared';

type MergeReviewRow = {
  id: string;
  place_id: string;
  candidate_place_id: string;
  similarity: number;
  status: string;
  created_at: string;
  place_name: string;
  place_address: string | null;
  candidate_name: string;
  candidate_address: string | null;
};

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  await requireAdmin(request, env);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

  const rows = await all<MergeReviewRow>(
    env.DB.prepare(
      `SELECT r.id, r.place_id, r.candidate_place_id, r.similarity, r.status, r.created_at,
              p.name AS place_name, p.address AS place_address,
              c.name AS candidate_name, c.address AS candidate_address
         FROM place_merge_reviews r
         JOIN places p ON p.id = r.place_id
         JOIN places c ON c.id = r.candidate_place_id
        WHERE r.status = ?
        ORDER BY r.similarity DESC, r.created_at ASC
        LIMIT ?`
    ).bind(status, limit)
  );

  return json({
    reviews: rows.map(row => ({
      id: row.id,
      similarity: row.similarity,
      status: row.status,
      createdAt: row.created_at,
      place: { id: row.place_id, name: row.place_name, address: row.place_address },
      candidate: {
        id: row.candidate_place_id,
        name: row.candidate_name,
        address: row.candidate_address
      }
    }))
  });
});
