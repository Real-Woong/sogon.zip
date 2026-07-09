import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CheckCircle2, Copy, Link2, Search, UserPlus } from 'lucide-react';
import {
  connectPerson,
  findPersonByCode,
  getProfile,
  signUpBetaUser,
  type SogonPerson
} from '../lib/sogonStore';

type Step = 'signup' | 'find' | 'confirm' | 'connected';

export function CreateJoinRoom() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('signup');
  const [nickname, setNickname] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [myAccountCode, setMyAccountCode] = useState(getProfile()?.accountCode ?? '');
  const [partnerCode, setPartnerCode] = useState('');
  const [foundPerson, setFoundPerson] = useState<SogonPerson | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSignUp = nickname.trim() && loginId.trim() && password.trim();
  const canFind = partnerCode.trim().length >= 4;

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

  const handleConnect = async () => {
    if (!foundPerson || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await connectPerson(foundPerson.accountCode);
      setStep('connected');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '연결을 완료하지 못했어요.');
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
    <div className="h-full flex flex-col px-6 py-10">
      <div className="mb-7 text-center">
        <p className="text-sm font-bold text-[color:var(--coral-deep)]">Sogon.zip beta</p>
        <h1 className="mt-2 text-2xl font-black text-[color:var(--navy)]">
          {step === 'signup' ? '회원가입' : step === 'connected' ? '연결 완료' : '내 사람 찾기'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
          {step === 'signup'
            ? '아이디와 비밀번호를 만들고, 가입 후 상대의 계정 코드로 연결해요.'
            : '상대 계정 코드를 확인하면 둘만의 소곤폴더와 기록이 공유돼요.'}
        </p>
      </div>

      {step !== 'signup' ? (
        <div className="mb-5 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-white">
          <p className="text-xs font-bold text-[color:var(--gray)]">내 계정 코드</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="flex-1 rounded-xl bg-[color:var(--cream)] px-4 py-3 text-center text-2xl font-black tracking-[0.18em] text-[color:var(--lavender)]">
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

      <div className="flex-1 overflow-y-auto pb-6">
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
                placeholder="4자 이상"
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
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

        {step === 'confirm' && foundPerson ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-sm ring-1 ring-white">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
                <Search className="h-7 w-7" />
              </div>
              <p className="mt-5 text-sm font-bold text-[color:var(--gray)]">찾은 계정</p>
              <h2 className="mt-2 text-3xl font-black text-[color:var(--navy)]">{foundPerson.nickname}</h2>
              <p className="mt-3 text-sm text-[color:var(--gray)]">{foundPerson.accountCode}</p>
            </div>
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

      <div className="space-y-3">
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
          <button
            type="button"
            onClick={handleConnect}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--lavender)] py-4 font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--lavender)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '연결 중...' : '이 사람과 연결하기'}
            <Link2 className="h-5 w-5" />
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
            onClick={() => navigate('/')}
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
