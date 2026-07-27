import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import {
  CalendarHeart,
  ChevronRight,
  Clock3,
  FolderOpen,
  Heart,
  Link2,
  Package,
  Sparkles,
  UserPlus
} from 'lucide-react';
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
  const isConnected = Boolean(profile?.isConnected);
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
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fffafa_0%,#fff4f7_44%,#f4f0ff_100%)]">
      <main className="min-h-0 flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <div className="px-6 pb-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
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

        {!isConnected ? (
          <button
            type="button"
            onClick={() => navigate('/create-room')}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[color:var(--mint)]/55 p-4 text-left shadow-sm ring-1 ring-[color:var(--mint)]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[color:var(--navy)]">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-keep font-black leading-snug text-[color:var(--navy)]">
                아직 누구와도 연결되지 않았어요
              </p>
              <p className="mt-1 text-sm font-bold text-[color:var(--coral-deep)]">
                연결 코드 입력하기
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--navy)]" />
          </button>
        ) : null}

        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color:var(--coral-deep)]">
              {isConnected ? '둘만의 소곤폴더' : '나의 소곤폴더'}
            </p>
            <h1 className="break-words text-2xl font-black leading-tight text-[color:var(--navy)]">
              {profile?.nickname
                ? `${profile.nickname}의 ${isConnected ? '연애' : '소곤'}.zip`
                : '우리의 소곤.zip'}
            </h1>
            {coupleLabel ? (
              <p className="mt-1 text-xs font-bold text-[color:var(--gray)]">{coupleLabel}</p>
            ) : null}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--coral-deep)] shadow-sm">
            <Heart className="h-6 w-6 fill-current" />
          </div>
        </div>

        <p className="mb-3 text-xs font-black tracking-[0.14em] text-[color:var(--gray)]">
          TWO WAYS TO GET CLOSER
        </p>
        </div>

        <div className="space-y-5 px-6 pb-6">
          <section aria-labelledby="sogon-delivery-title">
          <button
            type="button"
            onClick={() => navigate('/create-file')}
            className="mx-auto flex min-h-[230px] w-full max-w-[366px] flex-col justify-between rounded-[2rem] bg-[linear-gradient(145deg,var(--coral-deep),var(--coral))] p-5 text-left text-white shadow-[0_16px_36px_rgba(223,100,127,0.25)] transition-transform hover:-translate-y-0.5"
          >
            <div>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-[0.16em] text-white/75">SOGON DELIVERY</p>
                  <h2 id="sogon-delivery-title" className="mt-1 break-keep text-xl font-black leading-tight">
                    날짜에 맞춰 마음 보내기
                  </h2>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/18">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <p className="break-keep text-sm leading-relaxed text-white/85">
                기념일이나 특별한 날짜를 정해 메시지와 사진을 소곤.zip으로 예약해요.
              </p>
            </div>
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-bold">
                  예약 {upcomingCount}
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-bold">
                  열기 가능 {readyCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-black text-[color:var(--coral-deep)]">
                <span>새 소곤.zip 만들기</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </button>
          </section>

          <section aria-labelledby="date-match-title">
          <button
            type="button"
            onClick={() => navigate('/recommendation')}
            className="mx-auto flex min-h-[230px] w-full max-w-[366px] flex-col justify-between rounded-[2rem] bg-[color:var(--navy)] p-5 text-left text-white shadow-[0_18px_45px_rgba(45,39,56,0.2)] transition-transform hover:-translate-y-0.5"
        >
            <div>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-[0.16em] text-[color:var(--mint)]">DATE MATCH</p>
                  <h2 id="date-match-title" className="mt-1 break-keep text-xl font-black leading-tight">
                    둘의 취향으로 데이트 고르기
                  </h2>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
                  <Sparkles className="h-6 w-6 text-[color:var(--yellow)]" />
                </div>
              </div>
              <p className="break-keep text-sm leading-relaxed text-white/75">
                각자 저장한 음식·활동·분위기 취향을 함께 만족하는 코스로 조합해요.
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/65">
                <span>내 취향 {preferences.length}개</span>
                <span>{isConnected ? '상대 연결됨' : '상대 연결 필요'}</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--pink),var(--yellow),var(--mint))]"
                  style={{ width: `${preferenceProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 font-black">
                <span>데이트 추천 열기</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </button>
          </section>

          <section aria-labelledby="archive-title" className="mx-auto w-full max-w-[366px]">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-[color:var(--gray)]">MY ARCHIVE</p>
              <h2 id="archive-title" className="mt-1 font-black text-[color:var(--navy)]">보관함</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/my-folder')}
              className="min-w-0 rounded-3xl bg-white/85 p-4 text-left shadow-sm ring-1 ring-white"
            >
              <CalendarHeart className="mb-4 h-6 w-6 text-[color:var(--coral-deep)]" />
              <p className="break-keep text-sm font-black leading-snug text-[color:var(--navy)]">다가오는 소곤</p>
              <p className="mt-1 text-xs text-[color:var(--gray)]">
                {readyCount + upcomingCount}개
              </p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/record')}
              className="min-w-0 rounded-3xl bg-white/85 p-4 text-left shadow-sm ring-1 ring-white"
            >
              <FolderOpen className="mb-4 h-6 w-6 text-[color:var(--lavender)]" />
              <p className="break-keep text-sm font-black leading-snug text-[color:var(--navy)]">지난 기록</p>
              <p className="mt-1 text-xs text-[color:var(--gray)]">{openedCount}개</p>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/55 px-4 py-3 text-xs text-[color:var(--gray)]">
            <Clock3 className="h-4 w-4 shrink-0" />
            <span className="break-keep">예약한 마음은 지정한 날짜가 되면 열 수 있어요.</span>
          </div>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
