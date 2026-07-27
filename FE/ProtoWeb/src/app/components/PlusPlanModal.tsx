import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { Plus, FolderHeart, Database, LogOut, HeartCrack, Trash2 } from 'lucide-react';
import {
  deleteAccount,
  disconnectPartner,
  getProfile,
  getUserPreferences,
  saveUserPreference,
  signOutBetaUser,
  UserPreference
} from '../lib/sogonStore';
import { useSession } from '../lib/session';

type DangerAction = 'disconnect' | 'withdraw';

const dangerCopy: Record<DangerAction, { title: string; body: string; confirm: string }> = {
  disconnect: {
    title: '연결을 해제할까요?',
    body:
      '둘만의 소곤폴더가 해체돼요. 지금까지 저장한 소곤파일과 취향 기록이 두 사람 모두에게서 사라지고, 되돌릴 수 없어요.',
    confirm: '연결 해제하기'
  },
  withdraw: {
    title: '정말 탈퇴할까요?',
    body:
      '계정과 내가 쓴 소곤파일, 취향 기록이 모두 지워져요. 연결된 사람이 있다면 소곤폴더도 함께 해체돼요. 되돌릴 수 없어요.',
    confirm: '탈퇴하기'
  }
};

export function PlusPlanModal() {
  const navigate = useNavigate();
  const { profile: sessionProfile, setSession } = useSession();
  const [preferenceCategory, setPreferenceCategory] = useState('음식');
  const [preferenceText, setPreferenceText] = useState('');
  const [preferences, setPreferences] = useState<UserPreference[]>(() => getUserPreferences());
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerError, setDangerError] = useState('');
  const [isDangerBusy, setIsDangerBusy] = useState(false);
  const profile = sessionProfile ?? getProfile();

  const handleSavePreference = async () => {
    if (!preferenceText.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const savedPreference = await saveUserPreference({
        category: preferenceCategory,
        text: preferenceText.trim()
      });
      setPreferences(current => [savedPreference, ...current]);
      setPreferenceText('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOutBetaUser();
    setSession(null);
    navigate('/login', { replace: true });
  };

  const handleDangerConfirm = async () => {
    if (!dangerAction || isDangerBusy) {
      return;
    }

    setIsDangerBusy(true);
    setDangerError('');

    try {
      if (dangerAction === 'disconnect') {
        const nextProfile = await disconnectPartner();
        setSession(nextProfile);
        setDangerAction(null);
        navigate('/home', { replace: true });
      } else {
        await deleteAccount();
        // 세션을 먼저 끊어야 가드가 보호 화면 밖으로 내보낸다.
        setSession(null);
        navigate('/', { replace: true });
      }
    } catch (caughtError) {
      setDangerError(
        caughtError instanceof Error ? caughtError.message : '처리하지 못했어요.'
      );
    } finally {
      setIsDangerBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-br from-[color:var(--lavender)] to-[color:var(--pink)] text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Database className="w-6 h-6" />
          <h1 className="text-2xl font-bold">MY</h1>
        </div>
        <p className="text-center text-white/90 text-sm">
          내 취향과 소곤.zip을 관리해요.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-[color:var(--mint)]/50">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--mint)]/45 text-[color:var(--navy)]">
              <Database className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[color:var(--gray)]">DATE PREFERENCE</p>
              <h2 className="text-lg font-black text-[color:var(--navy)]">데이트 취향 프로필</h2>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-[color:var(--gray)]">
            음식부터 분위기·예산·이동까지 입력하면 둘 모두가 좋아할 코스를 찾는 데 사용해요.
          </p>
          <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {['음식', '활동', '분위기', '예산', '이동', '시간', '선물'].map(category => (
              <button
                key={category}
                onClick={() => setPreferenceCategory(category)}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  preferenceCategory === category
                    ? 'bg-[color:var(--coral)] text-white'
                    : 'bg-[color:var(--gray-light)] text-[color:var(--navy)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <textarea
            value={preferenceText}
            onChange={(event) => setPreferenceText(event.target.value)}
            placeholder="예: 조용한 분위기, 1인 3만원 안쪽, 대중교통 30분 이내가 좋아."
            className="h-24 w-full resize-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-3 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--coral)]"
          />
          <button
            onClick={handleSavePreference}
            disabled={!preferenceText.trim() || isSaving}
            className="sogon-primary-button mt-3 flex w-full items-center justify-center gap-2 font-bold disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {isSaving ? '저장하는 중...' : '취향 프로필에 저장'}
          </button>
          {error ? (
            <p className="mt-3 rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
              {error}
            </p>
          ) : null}
          {preferences.length > 0 ? (
            <div className="mt-4 space-y-2">
              {preferences.slice(0, 3).map(preference => (
                <div key={preference.id} className="rounded-2xl bg-[color:var(--gray-light)] px-4 py-3">
                  <p className="text-xs font-bold text-[color:var(--coral-deep)]">{preference.category}</p>
                  <p className="break-words text-sm text-[color:var(--navy)]">{preference.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-[color:var(--pink)]/40">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <FolderHeart className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[color:var(--coral-deep)]">MY SOGON</p>
              <h2 className="text-lg font-black text-[color:var(--navy)]">내 소곤.zip 만들기</h2>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-[color:var(--gray)]">
            상대에게 언젠가 열어줄 마음은 소곤.zip으로 따로 압축해요.
          </p>
          <button
            onClick={() => navigate('/create-file')}
            className="sogon-primary-button flex w-full items-center justify-center gap-2 font-bold"
          >
            <Plus className="h-5 w-5" />
            새 소곤.zip 압축하기
          </button>
        </div>

        <div className="mb-6 rounded-3xl bg-white/80 p-6 ring-1 ring-white">
          <p className="text-xs font-bold text-[color:var(--gray)]">계정</p>
          <p className="mt-1 font-black text-[color:var(--navy)]">
            {profile?.nickname ?? '베타 사용자'}
          </p>
          {profile?.accountCode ? (
            <p className="mt-1 break-all text-sm tracking-[0.12em] text-[color:var(--gray)]">
              {profile.accountCode}
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-[color:var(--gray)]">
            로그아웃하면 이 기기에 저장된 소곤파일과 취향 기록도 함께 지워져요.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gray-light)] py-3 font-bold text-[color:var(--navy)] transition-colors hover:bg-[color:var(--border)]"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>

          <div className="mt-5 border-t border-[color:var(--border)] pt-5">
            {profile?.isConnected ? (
              <button
                onClick={() => {
                  setDangerAction('disconnect');
                  setDangerError('');
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-[color:var(--gray)] transition-colors hover:text-[color:var(--coral-deep)]"
              >
                <HeartCrack className="h-4 w-4" />
                {profile.partnerNickname
                  ? `${profile.partnerNickname}님과 연결 해제`
                  : '연결 해제'}
              </button>
            ) : null}
            <button
              onClick={() => {
                setDangerAction('withdraw');
                setDangerError('');
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-[color:var(--gray)] transition-colors hover:text-[color:var(--coral-deep)]"
            >
              <Trash2 className="h-4 w-4" />
              회원 탈퇴
            </button>
          </div>
        </div>

      </div>

      {dangerAction ? (
        <div className="absolute inset-0 z-30 flex items-end bg-[rgba(45,39,56,0.32)]">
          <div className="max-h-[calc(100%-1rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(45,39,56,0.18)]">
            <h2 className="text-lg font-black text-[color:var(--navy)]">
              {dangerCopy[dangerAction].title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
              {dangerCopy[dangerAction].body}
            </p>

            {dangerError ? (
              <p className="mt-4 rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
                {dangerError}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <button
                onClick={handleDangerConfirm}
                disabled={isDangerBusy}
                className="w-full rounded-2xl bg-[color:var(--coral-deep)] py-4 font-bold text-white disabled:opacity-50"
              >
                {isDangerBusy ? '처리 중...' : dangerCopy[dangerAction].confirm}
              </button>
              <button
                onClick={() => {
                  setDangerAction(null);
                  setDangerError('');
                }}
                className="w-full rounded-2xl bg-[color:var(--gray-light)] py-4 font-bold text-[color:var(--navy)]"
              >
                아니요, 그대로 둘래요
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
