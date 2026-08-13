import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronRight, CalendarHeart, Package, Sparkles } from 'lucide-react';
import { TOURS, type Tour } from '../lib/onboardingTour';
import { useTour } from '../lib/tour';
import { useSession } from '../lib/session';
import { ScreenHeader } from './shared/ScreenHeader';

/** 투어마다 성격이 달라서 아이콘도 다르게 준다. 카드 두 장이 같아 보이면 안 고른다. */
const TOUR_ICON: Record<Tour['id'], typeof Package> = {
  'date-course': CalendarHeart,
  'sogon-zip': Package
};

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { startTour, isTourDone, markOffered } = useTour();

  // 이 화면을 본 순간 "안내를 제안했다"로 친다. 홈이 매번 여기로 보내면
  // 이미 아는 사람에게는 방해가 된다.
  useEffect(() => {
    markOffered();
  }, [markOffered]);

  const doneCount = TOURS.filter(tour => isTourDone(tour.id)).length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fffafa_0%,#fff2f6_46%,#f2eeff_100%)]">
      <ScreenHeader title="사용법 둘러보기" backTo="/home" backLabel="홈으로 돌아가기" />

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
        <div className="mx-auto w-full max-w-[366px]">
          <section className="rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-[0_16px_36px_rgba(45,39,56,0.2)]">
            <div className="flex items-center gap-2 text-[color:var(--mint)]">
              <Sparkles className="h-5 w-5" />
              <p className="text-xs font-black tracking-[0.15em]">WELCOME</p>
            </div>
            <h2 className="mt-3 break-keep text-xl font-black leading-snug">
              {profile?.nickname ? `${profile.nickname}님, 두 가지만 보여드릴게요` : '두 가지만 보여드릴게요'}
            </h2>
            <p className="mt-2 break-keep text-sm leading-relaxed text-white/70">
              화면을 직접 짚어가며 안내해요. 중간에 그만둬도 되고, 언제든 홈에서 다시 열 수 있어요.
            </p>
            <p className="mt-3 text-xs font-black text-[color:var(--mint)]">
              {doneCount}/{TOURS.length} 완료
            </p>
          </section>

          <div className="mt-5 space-y-3">
            {TOURS.map((tour, index) => {
              const Icon = TOUR_ICON[tour.id];
              const done = isTourDone(tour.id);
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => startTour(tour.id)}
                  className="flex w-full items-start gap-4 rounded-[1.75rem] bg-white p-5 text-left shadow-[0_14px_34px_rgba(223,100,127,0.14)] ring-1 ring-[color:var(--pink)]/55 transition-transform hover:-translate-y-0.5"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black tracking-[0.12em] text-[color:var(--gray)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {done ? (
                        <span className="flex items-center gap-1 rounded-full bg-[color:var(--mint)] px-2 py-0.5 text-[10px] font-black text-[color:var(--navy)]">
                          <Check className="h-3 w-3" />본 적 있어요
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-keep font-black leading-snug text-[color:var(--navy)]">
                      {tour.title}
                    </p>
                    <p className="mt-1 break-keep text-xs font-bold text-[color:var(--coral-deep)]">
                      {tour.summary}
                    </p>
                    <p className="mt-2 break-keep text-xs leading-relaxed text-[color:var(--gray)]">
                      {tour.outcome}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-[color:var(--gray)]">
                      {tour.steps.length}단계 · 중간에 그만둬도 괜찮아요
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[color:var(--gray)]" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="mt-5 w-full rounded-2xl bg-white/70 py-3.5 text-sm font-black text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
          >
            나중에 볼게요
          </button>
          <p className="mt-3 break-keep text-center text-xs leading-relaxed text-[color:var(--gray)]">
            홈 화면 "사용법 둘러보기"에서 언제든 다시 열 수 있어요.
          </p>
        </div>
      </main>
    </div>
  );
}
