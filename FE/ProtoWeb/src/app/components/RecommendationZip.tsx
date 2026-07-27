import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import {
  CheckCircle2,
  ChevronRight,
  Database,
  Plus,
  Route,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users
} from 'lucide-react';
import { getProfile, getUserPreferences } from '../lib/sogonStore';

export function RecommendationZip() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('밥');
  const preferences = getUserPreferences();
  const profile = getProfile();
  const isConnected = Boolean(profile?.isConnected);
  const preferenceProgress = Math.min(100, preferences.length * 20);
  const preferenceHint = preferences[0]?.text ?? '내 취향을 MY에서 입력하면 추천.zip이 더 정확해져요.';

  const categories = ['밥', '카페', '실내', '산책', '하루 코스'];
  const readinessLabel = !isConnected
    ? '상대 연결이 필요해요'
    : preferences.length < 3
    ? '내 취향을 조금 더 알려주세요'
    : '둘의 취향을 비교할 준비가 됐어요';

  const recommendationSteps = [
    {
      icon: Database,
      title: '각자의 취향 모으기',
      body: '음식, 활동, 분위기, 예산, 이동 범위를 구조화해요.'
    },
    {
      icon: SlidersHorizontal,
      title: '불가능한 조건 먼저 제외',
      body: '알레르기, 싫어하는 것, 예산·시간 제한을 우선 지켜요.'
    },
    {
      icon: Route,
      title: '둘 다 만족할 코스 조합',
      body: '한쪽에 치우치지 않게 장소를 잇고 추천 이유도 함께 보여줘요.'
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#2d2738_0%,#4a405b_35%,#f8f4ff_35%,#fffafa_100%)]">
      <main className="min-h-0 flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <div className="px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[color:var(--yellow)]" />
            <p className="text-xs font-black tracking-[0.16em] text-[color:var(--mint)]">DATE MATCH</p>
          </div>
          <h1 className="break-keep text-2xl font-black leading-tight">우리 취향 데이트 추천</h1>
          <p className="mt-2 break-keep text-sm leading-relaxed text-white/70">
            각자의 취향과 오늘의 조건을 함께 만족하는 코스를 찾아요.
          </p>
        </div>

        <div className="px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  selectedCategory === category
                    ? 'bg-white text-[color:var(--navy)]'
                    : 'bg-white/10 text-white/70'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-5">
        <section className="rounded-[2rem] bg-white p-5 shadow-[0_14px_36px_rgba(45,39,56,0.12)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.12em] text-[color:var(--lavender)]">MATCH READINESS</p>
              <h2 className="mt-1 break-keep text-lg font-black leading-snug text-[color:var(--navy)]">
                {readinessLabel}
              </h2>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender-light)] text-[color:var(--lavender)]">
              {isConnected ? <Users className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-bold text-[color:var(--gray)]">
            <span>내 취향 {preferences.length}개</span>
            <span>{preferenceProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--gray-light)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--lavender),var(--pink),var(--mint))]"
              style={{ width: `${preferenceProgress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[color:var(--gray-light)] px-3 py-3">
              <p className="text-xs text-[color:var(--gray)]">선택한 방향</p>
              <p className="mt-1 break-words text-sm font-black text-[color:var(--navy)]">{selectedCategory}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--gray-light)] px-3 py-3">
              <p className="text-xs text-[color:var(--gray)]">상대 상태</p>
              <p className="mt-1 break-words text-sm font-black text-[color:var(--navy)]">
                {isConnected ? profile?.partnerNickname ?? '연결됨' : '연결 전'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white/90 p-5 ring-1 ring-white">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[color:var(--coral-deep)]" />
            <h2 className="font-black text-[color:var(--navy)]">추천은 이렇게 만들어요</h2>
          </div>
          <div className="space-y-4">
            {recommendationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender-light)] text-[color:var(--lavender)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[color:var(--coral-deep)]">0{index + 1}</p>
                    <h3 className="break-keep text-sm font-black text-[color:var(--navy)]">{step.title}</h3>
                    <p className="mt-1 break-keep text-xs leading-relaxed text-[color:var(--gray)]">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--yellow)]/45 bg-[color:var(--yellow)]/14 p-4">
          <p className="break-keep text-sm leading-relaxed text-[color:var(--navy)]">
            <span className="font-black">최근 취향 힌트</span> · {preferenceHint}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--gray)]">
            추천 결과에는 왜 두 사람에게 잘 맞는지도 함께 표시할 예정이에요.
          </p>
        </section>

        <div className="space-y-2">
          <button
            onClick={() => navigate('/plus')}
            className="flex w-full items-center justify-between rounded-2xl bg-[color:var(--lavender)] px-5 py-4 font-bold text-white shadow-sm transition-colors hover:bg-[color:var(--lavender)]/90"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              내 취향 더 입력하기
            </span>
            <ChevronRight className="h-5 w-5" />
          </button>
          {!isConnected ? (
            <button
              onClick={() => navigate('/create-room')}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[color:var(--coral-deep)]" />
                상대 연결하기
              </span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
