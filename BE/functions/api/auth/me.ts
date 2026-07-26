import { buildProfile, deleteMemberAccount, Env, handle, json, requireMember } from '../_shared';

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);

  return json({
    member: {
      id: member.id,
      nickname: member.nickname,
      accountCode: member.account_code,
      isConnected: Boolean(member.room_id)
    },
    profile: await buildProfile(env, member)
  });
});

/**
 * 회원 탈퇴. 계정, 세션, 내가 쓴 소곤파일과 취향 기록을 모두 지운다.
 * 연결된 상태였다면 소곤폴더도 함께 해체된다.
 */
export const onRequestDelete: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  await deleteMemberAccount(env, member);

  return json({ ok: true });
});
