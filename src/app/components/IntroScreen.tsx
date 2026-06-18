import { useNavigate } from 'react-router';
import { ArrowRight, Heart, MessageCircle, Sparkles } from 'lucide-react';

export function IntroScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col px-7 pt-7 pb-6 relative overflow-hidden bg-[radial-gradient(circle_at_20%_15%,#ffe1e9_0%,transparent_34%),radial-gradient(circle_at_88%_6%,#ece5ff_0%,transparent_32%),linear-gradient(180deg,#fffafa_0%,#fff4f7_52%,#f8f1ff_100%)]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(135deg,rgba(245,138,163,0.18),rgba(169,150,232,0.16),rgba(189,235,220,0.16))]" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[color:var(--coral-deep)] shadow-sm ring-1 ring-white">
          <Heart className="h-4 w-4 fill-current" />
          Couple taste app
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/75 text-[color:var(--lavender)] shadow-sm ring-1 ring-white">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="relative z-10 mt-8">
        <div className="relative mx-auto h-[270px] w-full">
          <div className="absolute left-0 top-7 w-[198px] rounded-[2rem] bg-white p-4 shadow-[0_18px_45px_rgba(223,100,127,0.18)] ring-1 ring-white">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
                <Heart className="h-6 w-6 fill-current" />
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold text-[color:var(--gray)]">LOVE SIGNAL</p>
                <p className="text-lg font-bold text-[color:var(--navy)]">D+87</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-[color:var(--gray-light)]">
                <div className="h-2 w-3/4 rounded-full bg-[color:var(--coral)]" />
              </div>
              <p className="text-xs leading-relaxed text-[color:var(--gray)]">
                서로의 취향이 74% 더 가까워졌어요.
              </p>
            </div>
          </div>

          <div className="absolute right-0 top-0 w-[174px] rotate-3 rounded-[2rem] bg-[color:var(--lavender-light)] p-4 shadow-[0_18px_45px_rgba(93,72,140,0.16)]">
            <div className="mb-5 flex justify-between">
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lavender)]">오늘의 데이트</span>
              <Sparkles className="h-5 w-5 text-[color:var(--lavender)]" />
            </div>
            <p className="text-xl font-bold leading-snug text-[color:var(--navy)]">
              조용한 카페<br />창가 자리
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--gray)]">
              둘 다 저장한 무드로 추천했어요.
            </p>
          </div>

          <div className="absolute bottom-4 left-8 right-3 rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-[0_20px_45px_rgba(45,39,56,0.22)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex -space-x-3">
                <div className="h-11 w-11 rounded-full bg-[color:var(--pink)] ring-4 ring-[color:var(--navy)]" />
                <div className="h-11 w-11 rounded-full bg-[color:var(--mint)] ring-4 ring-[color:var(--navy)]" />
              </div>
              <MessageCircle className="h-6 w-6 text-[color:var(--yellow)]" />
            </div>
            <p className="text-sm text-white/70">다음에 열릴 소곤</p>
            <p className="text-xl font-bold">기념일 선물 힌트</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-auto space-y-4">
        <div>
          <h1 className="text-[2.35rem] font-black leading-tight text-[color:var(--navy)]">
            소곤.zip
          </h1>
          <p className="mt-2 text-lg font-bold leading-relaxed text-[color:var(--navy)]">
            우리 둘 취향을 모아<br />
            데이트가 더 쉬워지는 곳
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--gray)]">
            말하기 애매한 마음, 좋아하는 것, 기념일 힌트를 부드럽게 저장하고 필요한 순간에 열어요.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['취향 매칭', '데이트 추천', '기념일 힌트'].map((item) => (
            <div key={item} className="rounded-2xl bg-white/75 px-3 py-2 text-center text-xs font-semibold text-[color:var(--navy)] shadow-sm ring-1 ring-white/80">
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate('/relationship')}
        className="sogon-primary-button relative z-10 mt-5 flex w-full items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
      >
        시작하기
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
