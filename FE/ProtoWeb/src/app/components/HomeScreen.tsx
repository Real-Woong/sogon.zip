import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { ZipBadge } from './shared/ZipBadge';
import { ChevronRight, Sparkles, Calendar as CalendarIcon, FolderOpen, Heart, Plus, UserPlus } from 'lucide-react';
import {
  getConnectionRequests,
  getProfile,
  getSogonFiles,
  getUserPreferences,
  syncRemoteData,
  type ConnectionRequest
} from '../lib/sogonStore';

export function HomeScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getProfile());
  const [files, setFiles] = useState(() => getSogonFiles());
  const [preferences, setPreferences] = useState(() => getUserPreferences());
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const myFiles = files.filter(file => file.isMine !== false);
  const upcomingCount = myFiles.filter(file => file.status === 'scheduled').length;
  const readyCount = myFiles.filter(file => file.status === 'ready').length;
  const openedCount = files.filter(file => file.status === 'opened').length;
  const preferenceProgress = Math.min(100, preferences.length * 20);
  const coupleLabel = profile?.partnerNickname
    ? `${profile.nickname} x ${profile.partnerNickname}`
    : profile?.nickname;

  useEffect(() => {
    syncRemoteData()
      .then(() => {
        setProfile(getProfile());
        setFiles(getSogonFiles());
        setPreferences(getUserPreferences());
      })
      .catch(() => undefined);

    getConnectionRequests()
      .then(data => setIncomingRequests(data.incoming ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[linear-gradient(180deg,#fffafa_0%,#fff4f7_44%,#f4f0ff_100%)]">
      <div className="px-6 pt-7 pb-5">
        {incomingRequests.length > 0 ? (
          <button
            onClick={() => navigate('/create-room')}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-[color:var(--pink)]/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[color:var(--navy)]">
                {incomingRequests[0].person.nickname}님이 연결을 요청했어요
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--gray)]">
                수락해야 둘만의 소곤폴더가 열려요.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--gray)]" />
          </button>
        ) : null}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--coral-deep)]">D+87</p>
            <h1 className="text-2xl font-black text-[color:var(--navy)]">
              {profile?.nickname ? `${profile.nickname}의 연애.zip` : '우리의 연애.zip'}
            </h1>
            {coupleLabel ? (
              <p className="mt-1 text-xs font-bold text-[color:var(--gray)]">{coupleLabel}</p>
            ) : null}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--coral-deep)] shadow-sm">
            <Heart className="h-6 w-6 fill-current" />
          </div>
        </div>

        <div
          onClick={() => navigate('/recommendation')}
          className="mx-auto flex min-h-[176px] w-full max-w-[366px] cursor-pointer flex-col justify-between rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-[0_18px_45px_rgba(45,39,56,0.2)] transition-transform hover:-translate-y-0.5"
        >
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-white/65">데이트 코스 추천.zip</p>
              <p className="mt-1 text-3xl font-black">오늘의 추천 압축해제</p>
            </div>
            <Sparkles className="h-6 w-6 text-[color:var(--yellow)]" />
          </div>
          <div className="h-2 rounded-full bg-white/15">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,var(--pink),var(--yellow),var(--mint))]"
              style={{ width: `${preferenceProgress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[`취향 ${preferences.length}개`, '상대 취향', '오늘 코스'].map((label) => (
              <div key={label} className="rounded-2xl bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white/85">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 space-y-4 overflow-y-auto scrollbar-hide">
        <div
          onClick={() => navigate('/recommendation')}
          className="mx-auto flex min-h-[190px] w-full max-w-[366px] cursor-pointer flex-col justify-between rounded-[2rem] bg-white p-5 shadow-[0_14px_36px_rgba(223,100,127,0.13)] ring-1 ring-[color:var(--pink)]/55 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[color:var(--coral-deep)]">MATCH PICK</p>
                <h2 className="font-black text-[color:var(--navy)]">데이트 코스 추천.zip</h2>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[color:var(--gray)]" />
          </div>
          <p className="text-sm text-[color:var(--gray)] mb-4 leading-relaxed">
            저장된 취향을 바탕으로 추천 기능을 준비하고 있어요.
          </p>
          <button className="sogon-primary-button w-full font-bold transition-colors">
            오늘의 추천 압축해제
          </button>
        </div>

        <div
          onClick={() => navigate('/my-folder')}
          className="mx-auto flex min-h-[170px] w-full max-w-[366px] cursor-pointer flex-col justify-between rounded-[2rem] bg-white/82 p-5 shadow-sm ring-1 ring-white transition-all hover:bg-white hover:shadow-md"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--yellow)]/50 text-[color:var(--navy)]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[color:var(--gray)]">COMING SOON</p>
                <h2 className="font-black text-[color:var(--navy)]">다가오는 소곤.zip</h2>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[color:var(--gray)]" />
          </div>
          <p className="text-sm text-[color:var(--gray)] mb-4">
            {readyCount > 0
              ? `지금 열 수 있는 소곤.zip ${readyCount}개가 있어요.`
              : upcomingCount > 0
              ? `압축해제 예정 ${upcomingCount}개가 있어요.`
              : '아직 예정된 소곤.zip이 없어요.'}
          </p>
          <button className="sogon-soft-button w-full font-bold transition-colors hover:bg-[color:var(--lavender-light)]">
            확인하기
          </button>
        </div>

        <div
          onClick={() => navigate('/record')}
          className="mx-auto flex min-h-[170px] w-full max-w-[366px] cursor-pointer flex-col justify-between rounded-[2rem] bg-white/82 p-5 shadow-sm ring-1 ring-white transition-all hover:bg-white hover:shadow-md"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--lavender-light)] text-[color:var(--lavender)]">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[color:var(--gray)]">MEMORY</p>
                <h2 className="font-black text-[color:var(--navy)]">최근 연애 기록</h2>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[color:var(--gray)]" />
          </div>
          <p className="text-sm text-[color:var(--gray)] mb-4">
            {openedCount > 0 ? `압축해제한 소곤.zip ${openedCount}개가 기록됐어요.` : '아직 압축해제한 소곤.zip 기록이 없어요.'}
          </p>
          <button className="sogon-soft-button w-full font-bold transition-colors hover:bg-[color:var(--lavender-light)]">
            기록 보기
          </button>
        </div>

        <button
          onClick={() => navigate('/create-file')}
          className="mx-auto flex min-h-[78px] w-full max-w-[366px] items-center justify-center rounded-[2rem] border border-dashed border-[color:var(--coral)]/55 bg-[color:var(--blush)]/50 p-5 transition-colors hover:bg-[color:var(--blush)]"
        >
          <div className="flex items-center justify-center gap-2 text-[color:var(--navy)]">
            <Plus className="h-5 w-5 text-[color:var(--coral-deep)]" />
            <span className="font-bold">새 소곤.zip 만들기</span>
            <ZipBadge />
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
