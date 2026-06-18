import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Heart, LockKeyhole, UserRound } from 'lucide-react';
import { signInPrototypeUser } from '../lib/sogonStore';

export function LoginScreen() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (signInPrototypeUser(id, password)) {
      navigate('/home');
      return;
    }

    setError('아이디 또는 비밀번호를 다시 확인해주세요.');
  };

  return (
    <div className="h-full flex flex-col px-7 py-8 bg-[radial-gradient(circle_at_20%_12%,#ffe1e9_0%,transparent_35%),radial-gradient(circle_at_88%_4%,#ece5ff_0%,transparent_32%),linear-gradient(180deg,#fffafa_0%,#fff4f7_52%,#f8f1ff_100%)]">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[color:var(--coral-deep)] shadow-sm ring-1 ring-white">
          <Heart className="h-4 w-4 fill-current" />
          Sogon.zip prototype
        </div>
        <div className="h-11 w-11 rounded-full bg-white/80 shadow-sm ring-1 ring-white" />
      </div>

      <div className="mt-14">
        <p className="text-sm font-bold text-[color:var(--coral-deep)]">둘만의 소곤방</p>
        <h1 className="mt-2 text-[2.35rem] font-black leading-tight text-[color:var(--navy)]">
          로그인하고<br />우리 기록을 열어봐요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
          프로토타입에서는 정해진 테스트 계정으로 바로 둘러볼 수 있어요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-4">
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
              placeholder="김진웅"
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
              placeholder="1234"
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
          className="sogon-primary-button mt-3 flex w-full items-center justify-center gap-2 font-bold"
        >
          들어가기
          <Heart className="h-5 w-5 fill-current" />
        </button>
      </form>

      <div className="mt-auto rounded-[2rem] bg-white/72 p-5 shadow-sm ring-1 ring-white">
        <p className="text-xs font-bold text-[color:var(--gray)]">테스트 계정</p>
        <p className="mt-2 text-sm text-[color:var(--navy)]">ID: 김진웅</p>
        <p className="text-sm text-[color:var(--navy)]">비밀번호: 1234</p>
        <p className="mt-3 text-xs leading-relaxed text-[color:var(--gray)]">
          연인 프로필은 임시로 서연으로 연결해두었어요.
        </p>
      </div>
    </div>
  );
}
