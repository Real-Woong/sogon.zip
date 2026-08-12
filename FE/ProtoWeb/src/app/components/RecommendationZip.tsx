import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarHeart, ChevronRight, HeartHandshake, Sparkles } from 'lucide-react';
import { BottomNav } from './shared/BottomNav';
import {
  getCorePreferences,
  getDatePlans,
  type CorePreferenceStatus,
  type DatePlan
} from '../lib/sogonStore';

export function RecommendationZip() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<CorePreferenceStatus | null>(null);
  const [plans, setPlans] = useState<DatePlan[]>([]);

  useEffect(() => {
    Promise.allSettled([getCorePreferences(), getDatePlans()]).then(([preferenceResult, planResult]) => {
      if (preferenceResult.status === 'fulfilled') {
        setPreferences(preferenceResult.value.corePreferences);
      }
      if (planResult.status === 'fulfilled') {
        setPlans(planResult.value.datePlans);
      }
    });
  }, []);

  const nextPlan = plans[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#f5f0fb_0%,#fffafa_100%)]">
      <main className="min-h-0 flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <header className="bg-[color:var(--navy)] px-6 pb-7 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
          <div className="flex items-center gap-2 text-[color:var(--mint)]">
            <Sparkles className="h-5 w-5" />
            <p className="text-xs font-black tracking-[0.16em]">DATE MATCH</p>
          </div>
          <h1 className="mt-2 text-2xl font-black">둘의 데이트 코스</h1>
          <p className="mt-2 break-keep text-sm leading-relaxed text-white/65">
            둘이 답한 핵심 취향과 정해둔 약속으로 실제 장소를 골라요.
          </p>
        </header>

        <div className="space-y-4 px-6 py-6">
          <button
            type="button"
            onClick={() => navigate('/core-preferences')}
            className="flex w-full items-center gap-4 rounded-[1.75rem] bg-white p-5 text-left shadow-sm ring-1 ring-white"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[color:var(--navy)]">
                {preferences?.coupleReady ? '둘의 핵심 취향 준비 완료' : '핵심 취향 먼저 알려주기'}
              </p>
              <p className="mt-1 text-xs font-bold text-[color:var(--gray)]">
                내 답변 {preferences?.answeredCount ?? 0}/{preferences?.total ?? 20}
                {preferences?.partner
                  ? ` · ${preferences.partner.nickname}님 ${preferences.partner.answeredCount}/${preferences.total}`
                  : ''}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--gray)]" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/date-plans')}
            className="flex w-full items-center gap-4 rounded-[1.75rem] bg-[linear-gradient(145deg,#fff1bd,#ffe3d6_48%,#eadfff)] p-5 text-left shadow-sm"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/75 text-[color:var(--coral-deep)]">
              <CalendarHeart className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[color:var(--navy)]">
                {nextPlan ? nextPlan.title : '새 데이트 약속 정하기'}
              </p>
              <p className="mt-1 break-keep text-xs font-bold text-[color:var(--gray)]">
                {nextPlan
                  ? `${nextPlan.scheduledDate}${nextPlan.startTime ? ` · ${nextPlan.startTime}` : ''} · 코스 확인하기`
                  : '날짜·시간·동네와 원하는 흐름을 정해주세요.'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--navy)]" />
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
