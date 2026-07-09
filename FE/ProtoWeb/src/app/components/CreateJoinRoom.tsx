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
        <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-12 text-center">
          상대방을 초대해주세요
        </h1>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-32">
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
          나중에 초대하기
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 py-12">
      <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-12 text-center">
        {mode === 'create' ? '소곤방 만들기' : '초대코드로 들어가기'}
      </h1>

      <div className="flex-1 flex flex-col gap-6 pb-20">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 ring-1 ring-[color:var(--border)]">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-xl py-3 text-sm font-bold ${mode === 'create' ? 'bg-[color:var(--lavender)] text-white' : 'text-[color:var(--gray)]'}`}
          >
            방 만들기
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`rounded-xl py-3 text-sm font-bold ${mode === 'join' ? 'bg-[color:var(--lavender)] text-white' : 'text-[color:var(--gray)]'}`}
          >
            초대코드
          </button>
        </div>

        {mode === 'join' ? (
          <div>
            <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
              초대코드
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="예: LOVE2"
              className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
            />
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            닉네임을 입력해주세요
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 지우"
            className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            로그인 아이디
          </label>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="예: 유재원"
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
            placeholder="친구에게 알려줄 비밀번호"
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
            {isSubmitting ? '저장 중...' : mode === 'create' ? '새 소곤방 만들기' : '소곤방 들어가기'}
          </button>
        </div>
      </div>
    </div>
  );
}
