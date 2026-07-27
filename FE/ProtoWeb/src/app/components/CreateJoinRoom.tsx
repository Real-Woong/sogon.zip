import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CheckCircle2, Clock, Copy, Link2, Search, UserPlus } from 'lucide-react';
import {
  getConnectionRequests,
  findPersonByCode,
  getProfile,
  requestConnection,
  respondToConnectionRequest,
  signUpBetaUser,
  type ConnectionRequest,
  type SogonPerson
} from '../lib/sogonStore';
import { useSession } from '../lib/session';

type Step = 'signup' | 'find' | 'confirm' | 'requested' | 'connected';

const MIN_PASSWORD_LENGTH = 8;

export function CreateJoinRoom() {
  const navigate = useNavigate();
  const { setSession, refresh } = useSession();
  const [step, setStep] = useState<Step>(() => (getProfile()?.accountCode ? 'find' : 'signup'));
  const [nickname, setNickname] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [myAccountCode, setMyAccountCode] = useState(getProfile()?.accountCode ?? '');
  const [partnerCode, setPartnerCode] = useState('');
  const [foundPerson, setFoundPerson] = useState<SogonPerson | null>(null);
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRequest[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSignUp =
    nickname.trim() && loginId.trim() && password.trim().length >= MIN_PASSWORD_LENGTH;
  const canFind = partnerCode.trim().length >= 4;

  const refreshRequests = useCallback(async () => {
    try {
      const data = await getConnectionRequests();
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch {
      // 요청 목록을 못 가져와도 나머지 화면은 그대로 쓸 수 있게 둔다.
    }
  }, []);

  useEffect(() => {
    if (step !== 'signup') {
      void refreshRequests();
    }
  }, [step, refreshRequests]);

  const handleSignUp = async () => {
    if (!canSignUp || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await signUpBetaUser({
        loginId,
        password,
        nickname
      });
      setMyAccountCode(result.accountCode);
      setSession(result.profile);
      setStep('find');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '회원가입을 처리하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindPerson = async () => {
    if (!canFind || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setFoundPerson(null);

    try {
      const result = await findPersonByCode(partnerCode);
      setFoundPerson(result.person);
      setStep('confirm');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '계정 코드를 찾지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 연결 "요청"만 보낸다. 상대가 수락해야 실제로 소곤폴더가 열린다.
   * (계정 코드를 아는 것만으로 남의 폴더에 들어갈 수 있으면 안 된다.)
   */
  const handleRequestConnection = async () => {
    if (!foundPerson || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await requestConnection(foundPerson.accountCode);
      if (result.status === 'connected') {
        setSession(result.profile);
      }
      setStep(result.status === 'connected' ? 'connected' : 'requested');
      await refreshRequests();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '연결 요청을 보내지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, action: 'accept' | 'decline' | 'cancel') => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await respondToConnectionRequest(requestId, action);
      if (result.status === 'accepted') {
        await refresh();
        setStep('connected');
      }
      await refreshRequests();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '요청을 처리하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (myAccountCode) {
      navigator.clipboard.writeText(myAccountCode);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] [@media(max-height:720px)]:pt-5">
      <div className="mb-7 shrink-0 text-center [@media(max-height:720px)]:mb-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--coral-deep)]">
          <img src="/logo.svg" alt="Sogon.zip" className="h-7 w-auto" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--coral-deep)]">beta</span>
        </p>
        <h1 className="mt-2 text-2xl font-black text-[color:var(--navy)]">
          {step === 'signup'
            ? '회원가입'
            : step === 'connected'
            ? '연결 완료'
            : step === 'requested'
            ? '요청 보냄'
            : '내 사람 찾기'}
        </h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-[color:var(--gray)]">
          {step === 'signup'
            ? '아이디와 비밀번호를 만들고, 가입 후 상대의 계정 코드로 연결해요.'
            : '연결은 상대가 수락해야 완료돼요. 수락 전까지는 서로의 소곤파일이 보이지 않아요.'}
        </p>
      </div>

      {step !== 'signup' ? (
        <div className="mb-5 shrink-0 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-white">
          <p className="text-xs font-bold text-[color:var(--gray)]">내 계정 코드</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="min-w-0 flex-1 overflow-hidden rounded-xl bg-[color:var(--cream)] px-3 py-3 text-center text-xl font-black tracking-[0.12em] text-[color:var(--lavender)] sm:px-4 sm:text-2xl sm:tracking-[0.18em]">
              {myAccountCode}
            </p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="grid h-12 w-12 place-items-center rounded-xl bg-white text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
              aria-label="내 계정 코드 복사"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {step === 'signup' ? (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">닉네임</span>
              <input
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError('');
                }}
                placeholder="예: 진웅"
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">아이디</span>
              <input
                value={loginId}
                onChange={(event) => {
                  setLoginId(event.target.value);
                  setError('');
                }}
                placeholder="로그인할 때 쓸 아이디"
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
              {password && password.length < MIN_PASSWORD_LENGTH ? (
                <span className="mt-2 block text-xs text-[color:var(--coral-deep)]">
                  {MIN_PASSWORD_LENGTH}자 이상으로 만들어주세요.
                </span>
              ) : null}
            </label>
          </div>
        ) : null}

        {step === 'find' ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white/75 p-4 text-sm leading-relaxed text-[color:var(--gray)] ring-1 ring-white">
              상대도 회원가입을 하면 자기 계정 코드를 받습니다. 그 코드를 여기에 입력해서 맞는 사람인지 확인하세요.
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">상대 계정 코드</span>
              <input
                value={partnerCode}
                onChange={(event) => {
                  setPartnerCode(event.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="상대 계정 코드"
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-4 text-center text-xl font-black tracking-[0.12em] text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
            </label>
          </div>
        ) : null}

        {/* 받은 연결 요청: 여기서 수락해야만 소곤폴더가 열린다. */}
        {step !== 'signup' && step !== 'connected' && incoming.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-[color:var(--navy)]">받은 연결 요청</p>
            {incoming.map(request => (
              <div key={request.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[color:var(--pink)]/50">
                <p className="font-black text-[color:var(--navy)]">{request.person.nickname}</p>
                <p className="mt-1 text-xs text-[color:var(--gray)]">{request.person.accountCode}</p>
                <p className="mt-2 text-xs leading-relaxed text-[color:var(--gray)]">
                  수락하면 둘만의 소곤폴더가 열리고, 앞으로 열리는 소곤파일을 함께 보게 돼요.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond(request.id, 'accept')}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[color:var(--lavender)] py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    수락하기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(request.id, 'decline')}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[color:var(--gray-light)] py-3 text-sm font-bold text-[color:var(--navy)] disabled:opacity-50"
                  >
                    거절하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* 내가 보낸 요청 */}
        {step !== 'signup' && step !== 'connected' && outgoing.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-[color:var(--navy)]">보낸 연결 요청</p>
            {outgoing.map(request => (
              <div key={request.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-white">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[color:var(--gray)]" />
                  <p className="font-bold text-[color:var(--navy)]">{request.person.nickname}</p>
                </div>
                <p className="mt-2 text-xs text-[color:var(--gray)]">
                  상대가 수락하기를 기다리고 있어요.
                </p>
                <button
                  type="button"
                  onClick={() => handleRespond(request.id, 'cancel')}
                  disabled={isSubmitting}
                  className="mt-3 w-full rounded-xl bg-[color:var(--gray-light)] py-2 text-sm font-bold text-[color:var(--navy)] disabled:opacity-50"
                >
                  요청 취소
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {step === 'confirm' && foundPerson ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-sm ring-1 ring-white">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
                <Search className="h-7 w-7" />
              </div>
              <p className="mt-5 text-sm font-bold text-[color:var(--gray)]">찾은 계정</p>
              <h2 className="mt-2 text-3xl font-black text-[color:var(--navy)]">{foundPerson.nickname}</h2>
              <p className="mt-3 text-sm text-[color:var(--gray)]">{foundPerson.accountCode}</p>
              {foundPerson.roomFull ? (
                <p className="mt-4 rounded-xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
                  이 사람은 이미 다른 사람과 연결되어 있어요.
                </p>
              ) : (
                <p className="mt-4 text-xs leading-relaxed text-[color:var(--gray)]">
                  요청을 보내면 상대에게 수락 여부를 물어봐요.<br />
                  수락 전까지는 서로의 소곤파일이 보이지 않아요.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {step === 'requested' ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-[color:var(--lavender)] shadow-sm ring-1 ring-white">
              <Clock className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-[color:var(--navy)]">연결 요청을 보냈어요</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
              상대가 수락하면 둘만의 소곤폴더가 열려요.<br />
              그때까지는 서로의 소곤파일이 보이지 않아요.
            </p>
          </div>
        ) : null}

        {step === 'connected' ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-[color:var(--lavender)] shadow-sm ring-1 ring-white">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-[color:var(--navy)]">둘만의 소곤폴더가 열렸어요</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
              이제 sogon.zip 전송 대상은 연결된 사람이고,<br />
              소곤폴더와 기록도 함께 공유됩니다.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3">
        {step === 'signup' ? (
          <button
            type="button"
            onClick={handleSignUp}
            disabled={!canSignUp || isSubmitting}
            className="w-full rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--lavender)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '가입 중...' : '가입하고 내 사람 찾기'}
          </button>
        ) : null}

        {step === 'find' ? (
          <button
            type="button"
            onClick={handleFindPerson}
            disabled={!canFind || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--lavender)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '확인 중...' : '코드로 사람 찾기'}
            <Search className="h-5 w-5" />
          </button>
        ) : null}

        {step === 'confirm' ? (
          <>
            <button
              type="button"
              onClick={handleRequestConnection}
              disabled={isSubmitting || foundPerson?.roomFull || foundPerson?.alreadyConnected}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--lavender)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '요청 보내는 중...' : '이 사람에게 연결 요청 보내기'}
              <Link2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFoundPerson(null);
                setStep('find');
                setError('');
              }}
              className="w-full rounded-2xl bg-white py-4 font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
            >
              다시 찾기
            </button>
          </>
        ) : null}

        {step === 'requested' ? (
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm"
          >
            홈으로 가기
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : null}

        {step === 'connected' ? (
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm"
          >
            홈으로 가기
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : null}

        {step === 'find' ? (
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full rounded-2xl bg-white py-4 font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
          >
            나중에 연결하기
          </button>
        ) : null}

        {step === 'signup' ? (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
          >
            이미 계정이 있어요
            <UserPlus className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
