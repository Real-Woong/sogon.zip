import { Env, json, requireMember } from '../_shared';

type PersonRow = {
  id: string;
  room_id: string | null;
  nickname: string;
  account_code: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const member = await requireMember(request, env);
  const url = new URL(request.url);
  const accountCode = url.searchParams.get('code')?.trim().toUpperCase();

  if (!accountCode) {
    return json({ error: '상대의 계정 코드를 입력해주세요.' }, { status: 400 });
  }

  const person = await env.DB.prepare(
    'SELECT id, room_id, nickname, account_code FROM members WHERE account_code = ?'
  ).bind(accountCode).first<PersonRow>();

  if (!person) {
    return json({ error: '해당 계정 코드를 찾지 못했어요.' }, { status: 404 });
  }

  if (person.id === member.id) {
    return json({ error: '내 계정 코드는 연결 대상으로 사용할 수 없어요.' }, { status: 400 });
  }

  const alreadyConnected = Boolean(member.room_id && person.room_id && member.room_id === person.room_id);

  return json({
    person: {
      nickname: person.nickname,
      accountCode: person.account_code,
      alreadyConnected
    }
  });
};
