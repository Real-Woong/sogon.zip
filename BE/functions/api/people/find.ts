import { countRoomMembers, Env, handle, json, requireMember, ROOM_CAPACITY } from '../_shared';
import { findMemberByAccountCode } from './_link';

export const onRequestGet: PagesFunction<Env> = handle(async ({ request, env }) => {
  const member = await requireMember(request, env);
  const url = new URL(request.url);
  const accountCode = url.searchParams.get('code')?.trim().toUpperCase();

  if (!accountCode) {
    return json({ error: '상대의 계정 코드를 입력해주세요.' }, { status: 400 });
  }

  const person = await findMemberByAccountCode(env, accountCode);

  if (!person) {
    return json({ error: '해당 계정 코드를 찾지 못했어요.' }, { status: 404 });
  }

  if (person.id === member.id) {
    return json({ error: '내 계정 코드는 연결 대상으로 사용할 수 없어요.' }, { status: 400 });
  }

  const alreadyConnected = Boolean(
    member.room_id && person.room_id && member.room_id === person.room_id
  );

  const roomFull = Boolean(
    person.room_id &&
    !alreadyConnected &&
    (await countRoomMembers(env, person.room_id)) >= ROOM_CAPACITY
  );

  return json({
    person: {
      // 확인용으로 닉네임만 노출한다. 방 정보나 파일은 연결 전까지 보이지 않는다.
      nickname: person.nickname,
      accountCode: person.account_code,
      alreadyConnected,
      roomFull
    }
  });
});
