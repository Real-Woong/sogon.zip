import { Env, json, requireMember } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);
  const room = await env.DB.prepare(
    'SELECT invite_code, relationship_type FROM rooms WHERE id = ?'
  ).bind(member.room_id).first<{ invite_code: string; relationship_type: 'lover' | 'friend' }>();

  return json({
    member,
    profile: {
      nickname: member.nickname,
      relationshipType: room?.relationship_type ?? 'lover',
      roomCode: room?.invite_code,
      createdAt: new Date().toISOString()
    }
  });
};
