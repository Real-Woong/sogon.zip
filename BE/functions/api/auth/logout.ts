import { Env, getAuthToken, handle, json, revokeSession } from '../_shared';

/**
 * 세션을 서버에서 폐기한다. 토큰이 없거나 이미 만료됐어도 200을 돌려줘서
 * 클라이언트가 항상 로컬 세션을 지울 수 있게 한다.
 */
export const onRequestPost: PagesFunction<Env> = handle(async ({ request, env }) => {
  const token = getAuthToken(request);
  if (token) {
    await revokeSession(env, token);
  }

  return json({ ok: true });
});
