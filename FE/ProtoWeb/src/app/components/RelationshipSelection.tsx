import { useNavigate } from 'react-router';
import { ArrowRight, Heart, Sparkles, Users } from 'lucide-react';

export function RelationshipSelection() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col px-6 py-10 bg-[linear-gradient(180deg,#fffafa_0%,#fff3f6_58%,#f4f0ff_100%)]">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-xs font-bold text-[color:var(--coral-deep)] shadow-sm">
          <Sparkles className="h-4 w-4" />
          둘만의 소곤방
        </div>
        <h1 className="text-3xl font-black leading-tight text-[color:var(--navy)]">
          누구와 마음을<br />맞춰볼까요?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
          연인과 쓰면 취향, 데이트, 기념일 힌트가 더 부드럽게 이어져요.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 pt-8 pb-14">
        <button
          onClick={() => navigate('/create-room')}
          className="sogon-choice-card group overflow-hidden p-6 text-left ring-1 ring-[color:var(--pink)]/60 transition-all hover:-translate-y-1 hover:ring-[color:var(--coral)]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <Heart className="h-8 w-8 fill-current" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full bg-[color:var(--coral)]/10 px-3 py-1 text-xs font-bold text-[color:var(--coral-deep)]">추천</span>
                <ArrowRight className="h-5 w-5 text-[color:var(--coral-deep)] transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="text-xl font-black text-[color:var(--navy)] mb-2">
                연인과 시작하기
              </h2>
              <p className="text-sm leading-relaxed text-[color:var(--gray)]">
                서로의 취향을 저장하고, 데이트 추천과 기념일 힌트를 둘만의 타이밍에 열어요.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/create-room')}
          className="sogon-choice-card group p-6 text-left ring-1 ring-white transition-all hover:bg-white hover:ring-[color:var(--mint)]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[color:var(--mint)]/55 text-[color:var(--navy)]">
              <Users className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex justify-end">
                <ArrowRight className="h-5 w-5 text-[color:var(--gray)] transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="text-xl font-black text-[color:var(--navy)] mb-2">
                친구와 시작하기
              </h2>
              <p className="text-sm leading-relaxed text-[color:var(--gray)]">
                약속, 여행, 취향을 더 쉽게 맞춰요.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
