import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, Heart, LockKeyhole, UserRound } from 'lucide-react';
import { signInBetaUser } from '../lib/sogonStore';
import { useSession } from '../lib/session';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useSession();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 가드에 막혀서 여기로 온 경우, 로그인 후 원래 가려던 곳으로 보낸다.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/home';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const profile = await signInBetaUser(id, password);
      setSession(profile);
      navigate(redirectTo, { replace: true });
      return;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '아이디 또는 비밀번호를 다시 확인해주세요.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[radial-gradient(circle_at_20%_12%,#ffe1e9_0%,transparent_35%),radial-gradient(circle_at_88%_4%,#ece5ff_0%,transparent_32%),linear-gradient(180deg,#fffafa_0%,#fff4f7_52%,#f8f1ff_100%)] px-7 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[color:var(--coral-deep)] shadow-sm ring-1 ring-white">
          <img src="/logo.svg" alt="Sogon.zip" className="h-6 w-auto" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--coral-deep)]">beta</span>
        </div>
      </div>

      <div className="mt-14 [@media(max-height:720px)]:mt-8">
        <p className="text-sm font-bold text-[color:var(--coral-deep)]">둘만의 소곤방</p>
        {/* break-keep이 없으면 한글이 단어 중간에서 잘려 '요' 한 글자가 다음 줄로 떨어진다. */}
        <h1 className="mt-2 text-[2.1rem] font-black leading-tight break-keep text-[color:var(--navy)]">
          로그인하고<br />우리 기록을 열어봐요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
          만든 계정으로 들어가거나, 처음이라면 계정을 만들고 내 사람과 연결해주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-4 [@media(max-height:720px)]:mt-7">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">아이디</span>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-[color:var(--border)]">
            <UserRound className="h-5 w-5 text-[color:var(--coral-deep)]" />
            <input
              value={id}
              onChange={(event) => {
                setId(event.target.value);
                setError('');
              }}
              placeholder="예: jaewon"
              className="w-full bg-transparent text-[color:var(--navy)] outline-none placeholder:text-[color:var(--gray)]/60"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[color:var(--navy)]">비밀번호</span>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-[color:var(--border)]">
            <LockKeyhole className="h-5 w-5 text-[color:var(--lavender)]" />
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder="비밀번호"
              className="w-full bg-transparent text-[color:var(--navy)] outline-none placeholder:text-[color:var(--gray)]/60"
            />
          </div>
        </label>

        {error ? (
          <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="sogon-primary-button mt-3 flex w-full items-center justify-center gap-2 font-bold"
        >
          {isSubmitting ? '확인 중...' : '들어가기'}
          <Heart className="h-5 w-5 fill-current" />
        </button>
      </form>

      <div className="mt-8 rounded-[2rem] bg-white/72 p-5 shadow-sm ring-1 ring-white">
        <p className="text-xs font-bold text-[color:var(--gray)]">처음 시작하나요?</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--navy)]">
          아이디와 비밀번호를 만들면 내 계정 코드가 생겨요. 그 코드로 서로를 찾아 연결할 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => navigate('/create-room')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[color:var(--coral-deep)] ring-1 ring-[color:var(--pink)]/60 transition-colors hover:bg-[color:var(--blush)]"
        >
          회원가입하기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
