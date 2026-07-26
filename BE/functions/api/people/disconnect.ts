import { buildProfile, dissolveRoom, Env, handle, json, requireMember } from '../_shared';

/**
 * 연결을 해제한다.
 *
 * 소곤폴더는 두 사람의 공유 아카이브라, 한쪽만 빠져나가면 남은 쪽은
 * 상대 없는 방에 갇힌다. 그래서 해제는 방 자체를 해체하고 그 안의
 * 소곤파일과 취향 기록을 함께 지운다. 되돌릴 수 없다.
 */
export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  if (!member.room_id) {
    return json({ error: '아직 연결된 사람이 없어요.' }, { status: 409 });
  }

  await dissolveRoom(env, member.room_id);

  const disconnected = { ...member, room_id: null };
  return json({
    ok: true,
    profile: await buildProfile(env, disconnected)
  });
});
