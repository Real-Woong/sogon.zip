import { buildProfile, Env, json, requireMember } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);

  return json({
    member,
    profile: await buildProfile(env, member)
  });
};
