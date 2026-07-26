import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CalendarHeart, Heart, MessageCircle, Sparkles, Tags } from 'lucide-react';

const onboardingSlides = [
  {
    eyebrow: '소곤.zip',
    title: '우리 둘 취향을\n조금씩 모아요',
    description: '말하기 애매한 마음과 좋아하는 것을 저장하면, 둘에게 맞는 추천이 더 쉬워져요.',
    accent: 'coral',
  },
  {
    eyebrow: '취향 태그',
    title: '답변이 태그로\n차곡차곡 쌓여요',
    description: '짧은 답변에서 취향 키워드를 뽑아 둘만의 기준을 만들어가요.',
    accent: 'mint',
  },
  {
    eyebrow: '오늘의 질문',
    title: '하루에 하나만\n가볍게 답해요',
    description: '매일 작은 질문에 답할수록 추천이 둘의 현재 분위기에 가까워져요.',
    accent: 'yellow',
  },
  {
    eyebrow: '추천.zip',
    title: '쌓인 취향으로\n먼저 골라줘요',
    description: '데이트, 선물, 기념일 힌트를 저장된 태그와 기록에 맞춰 제안해요.',
    accent: 'lavender',
  },
] as const;

export function IntroScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToSlide = (slideIndex: number) => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) return;

    scrollContainer.scrollTo({
      left: scrollContainer.clientWidth * slideIndex,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) return;

    const nextSlide = Math.round(scrollContainer.scrollLeft / scrollContainer.clientWidth);
    setActiveSlide(Math.min(Math.max(nextSlide, 0), onboardingSlides.length - 1));
  };

  const goNext = () => {
    if (activeSlide === onboardingSlides.length - 1) {
      navigate('/relationship');
      return;
    }

    scrollToSlide(activeSlide + 1);
  };

  return (
    <div className="h-full flex flex-col px-6 pt-7 pb-6 relative overflow-hidden bg-[radial-gradient(circle_at_20%_15%,#ffe1e9_0%,transparent_34%),radial-gradient(circle_at_88%_6%,#ece5ff_0%,transparent_32%),linear-gradient(180deg,#fffafa_0%,#fff4f7_52%,#f8f1ff_100%)]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(135deg,rgba(245,138,163,0.18),rgba(169,150,232,0.16),rgba(189,235,220,0.16))]" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[color:var(--coral-deep)] shadow-sm ring-1 ring-white">
          <img src="/logo.svg" alt="Sogon.zip" className="h-6 w-auto" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--coral-deep)]">beta</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="rounded-full bg-white/75 px-4 py-2 text-xs font-bold text-[color:var(--gray)] shadow-sm ring-1 ring-white transition-colors hover:bg-white"
        >
          로그인
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 -mx-6 mt-6 flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {onboardingSlides.map((slide, index) => (
          <section key={slide.eyebrow} className="flex min-w-full snap-center flex-col px-6">
            <div className="relative mx-auto flex h-[330px] w-full items-center justify-center">
              <SlideMockup index={index} />
            </div>

            <div className="mt-auto pb-4">
              <p className="text-sm font-black text-[color:var(--coral-deep)]">{slide.eyebrow}</p>
              <h1 className="mt-2 whitespace-pre-line text-[2.25rem] font-black leading-tight text-[color:var(--navy)]">
                {slide.title}
              </h1>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-[color:var(--gray)]">
                {slide.description}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-center gap-2">
        {onboardingSlides.map((slide, index) => (
          <button
            key={slide.eyebrow}
            type="button"
            aria-label={`${index + 1}번째 소개로 이동`}
            onClick={() => scrollToSlide(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeSlide === index ? 'w-7 bg-[color:var(--coral)]' : 'w-2.5 bg-white/90 ring-1 ring-[color:var(--border)]'
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-[1fr_auto] gap-3">
        <button
          type="button"
          onClick={() => navigate('/relationship')}
          className="rounded-2xl bg-white/78 px-4 py-4 text-sm font-bold text-[color:var(--gray)] shadow-sm ring-1 ring-white transition-colors hover:bg-white"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={goNext}
          className="sogon-primary-button flex min-w-44 items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
        >
          {activeSlide === onboardingSlides.length - 1 ? '첫 질문 답하기' : '다음'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SlideMockup({ index }: { index: number }) {
  if (index === 1) {
    return (
      <div className="relative h-[292px] w-full">
        <div className="absolute inset-x-3 top-7 rounded-[2rem] bg-white/88 p-5 shadow-[0_18px_45px_rgba(93,72,140,0.14)] ring-1 ring-white">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--mint)]/65 text-[color:var(--navy)]">
              <Tags className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-[color:var(--mint)]/40 px-3 py-1 text-xs font-black text-[color:var(--navy)]">분석 중</span>
          </div>
          <div className="rounded-2xl bg-[color:var(--gray-light)] px-4 py-3 text-sm font-bold text-[color:var(--navy)]">
            "조용하고 오래 이야기할 수 있는 곳"
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['#조용한공간', '#대화중심', '#따뜻한분위기', '#오래머물기'].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[color:var(--coral-deep)] ring-1 ring-[color:var(--pink)]/70">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="relative h-[292px] w-full">
        <div className="absolute inset-x-4 top-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_45px_rgba(223,100,127,0.16)] ring-1 ring-white">
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-full bg-[color:var(--yellow)]/70 px-3 py-1 text-xs font-black text-[color:var(--navy)]">오늘의 질문</span>
            <CalendarHeart className="h-6 w-6 text-[color:var(--coral-deep)]" />
          </div>
          <p className="text-2xl font-black leading-snug text-[color:var(--navy)]">
            이번 주말엔<br />어떤 분위기가 좋아요?
          </p>
          <div className="mt-6 grid gap-2">
            {['느긋하게 쉬기', '새로운 곳 가보기', '맛있는 것 먹기'].map((answer) => (
              <div key={answer} className="rounded-2xl bg-[color:var(--cream)] px-4 py-3 text-sm font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]">
                {answer}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="relative h-[292px] w-full">
        <div className="absolute left-3 right-3 top-6 rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-[0_20px_48px_rgba(45,39,56,0.24)]">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-bold text-white/65">추천.zip</span>
            <Sparkles className="h-6 w-6 text-[color:var(--yellow)]" />
          </div>
          <p className="text-2xl font-black leading-tight">오늘은 이런 데이트</p>
          <div className="mt-5 space-y-3">
            {['작은 전시 + 조용한 카페', '산책 후 따뜻한 저녁', '기념일 선물 힌트 열기'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/12 px-4 py-3 text-sm font-bold ring-1 ring-white/10">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[292px] w-full">
      {/* 오른쪽 카드와 겹치는 폭이라 예전에는 'LOVE SIGNAL' 라벨이 잘렸다. 폭을 줄여 겹침만 남긴다. */}
      <div className="absolute left-0 top-9 w-[172px] rounded-[2rem] bg-white p-4 shadow-[0_18px_45px_rgba(223,100,127,0.18)] ring-1 ring-white">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
            <Heart className="h-6 w-6 fill-current" />
          </div>
          <div>
            <p className="text-[0.68rem] font-semibold text-[color:var(--gray)]">함께한 날</p>
            <p className="text-lg font-bold text-[color:var(--navy)]">D+87</p>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-[color:var(--gray-light)]">
          <div className="h-2 w-3/4 rounded-full bg-[color:var(--coral)]" />
        </div>
      </div>

      <div className="absolute right-0 top-0 w-[174px] rotate-3 rounded-[2rem] bg-[color:var(--lavender-light)] p-4 shadow-[0_18px_45px_rgba(93,72,140,0.16)]">
        <div className="mb-5 flex justify-between">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lavender)]">오늘의 데이트</span>
          <Sparkles className="h-5 w-5 text-[color:var(--lavender)]" />
        </div>
        <p className="text-xl font-bold leading-snug text-[color:var(--navy)]">
          오늘의 무드<br />함께 고르기
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
  );
}
