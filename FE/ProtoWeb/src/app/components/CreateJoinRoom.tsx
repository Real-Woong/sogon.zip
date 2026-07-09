import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, Share2 } from 'lucide-react';
import { createBetaRoom, joinBetaRoom } from '../lib/sogonStore';

export function CreateJoinRoom() {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [nickname, setNickname] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = nickname.trim() && loginId.trim() && password.trim() && (mode === 'create' || inviteCode.trim());

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'create') {
        const result = await createBetaRoom({
          loginId,
          password,
          nickname,
          relationshipType: 'lover'
        });
        setCreatedInviteCode(result.inviteCode);
        setShowInvite(true);
        return;
      }

      await joinBetaRoom({
        inviteCode,
        loginId,
        password,
        nickname
      });
      navigate('/home');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '요청을 처리하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdInviteCode);
  };

  if (showInvite) {
    return (
      <div className="h-full flex flex-col px-6 py-12">
        <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-4 text-center">
          회원가입이 완료됐어요
        </h1>
        <p className="text-center text-sm leading-relaxed text-[color:var(--gray)]">
          연인에게 아래 코드를 보내면<br />
          같은 소곤방으로 연결할 수 있어요.
        </p>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-24">
          <div className="text-center">
            <p className="text-sm text-[color:var(--gray)] mb-4">초대 코드</p>
            <div className="bg-white rounded-2xl px-12 py-6 border-2 border-dashed border-[color:var(--lavender)] shadow-sm">
              <p className="text-4xl font-bold tracking-widest text-[color:var(--lavender)]">
                {createdInviteCode}
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleCopyCode}
              className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              코드 복사하기
            </button>
            <button className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" />
              공유하기
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="bg-[color:var(--gray-light)] text-[color:var(--navy)] py-4 rounded-2xl hover:bg-[color:var(--gray-light)]/80 transition-colors"
        >
          지금은 혼자 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 py-12">
      <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-3 text-center">
        회원가입
      </h1>
      <p className="mb-8 text-center text-sm leading-relaxed text-[color:var(--gray)]">
        계정을 만들고, 연인과 연결할 소곤방을 선택해주세요.
      </p>

      <div className="flex-1 flex flex-col gap-6 pb-20">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 ring-1 ring-[color:var(--border)]">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-xl py-3 text-sm font-bold ${mode === 'create' ? 'bg-[color:var(--lavender)] text-white' : 'text-[color:var(--gray)]'}`}
          >
            새 방 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`rounded-xl py-3 text-sm font-bold ${mode === 'join' ? 'bg-[color:var(--lavender)] text-white' : 'text-[color:var(--gray)]'}`}
          >
            코드로 연결
          </button>
        </div>

        <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs leading-relaxed text-[color:var(--gray)]">
          {mode === 'create'
            ? '아직 연인이 가입하지 않았어도 괜찮아요. 먼저 가입하면 초대코드가 만들어져요.'
            : '연인이 먼저 만든 초대코드를 입력하면 같은 소곤방에 연결돼요.'}
        </p>

        {mode === 'join' ? (
          <div>
            <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
              초대코드
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="연인이 보내준 코드"
              className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
            />
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 재원"
            className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            아이디
          </label>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="로그인할 때 쓸 아이디"
            className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="로그인할 때 쓸 비밀번호"
            className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          />
        </div>

        {error ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
            {error}
          </p>
        ) : null}

        <div className="space-y-3 mt-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '가입 중...' : mode === 'create' ? '가입하고 초대코드 받기' : '가입하고 연인과 연결하기'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all"
          >
            이미 계정이 있어요
          </button>
        </div>
      </div>
    </div>
  );
}
