import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import {
  findTour,
  isTourComplete,
  markOnboardingOffered,
  markTourComplete,
  type OnboardingState,
  type Tour,
  type TourId
} from './onboardingTour';
import { getOnboardingState, saveOnboardingState } from './sogonStore';

type TourValue = {
  state: OnboardingState;
  activeTour: Tour | null;
  stepIndex: number;
  startTour: (id: TourId) => void;
  /** 끝까지 안 보고 나간다. 완료로 치지 않는다. */
  stopTour: () => void;
  isTourDone: (id: TourId) => boolean;
  /** 온보딩 화면을 봤다고 표시한다. 자동 안내를 한 번만 띄우려고 쓴다. */
  markOffered: () => void;
};

const TourContext = createContext<TourValue | null>(null);

/** 앵커가 이만큼 기다려도 안 나타나면 화면 상태 때문에 없는 것으로 본다. */
const ANCHOR_WAIT_MS = 1600;
/** 구멍 둘레 여백. 카드 그림자까지 덮어야 강조로 보인다. */
const SPOT_PADDING = 8;
/** 구멍과 툴팁 사이 간격. */
const PANEL_GAP = 12;
/**
 * 이만큼도 안 남으면 위아래 대신 화면 가운데에 띄운다. 툴팁이 통째로 들어가는
 * 높이여야 한다 — 아슬아슬하게 넣으면 "다음" 버튼이 잘려서 툴팁 안을 스크롤해야 한다.
 */
const PANEL_MIN_HEIGHT = 260;

type Box = { top: number; left: number; width: number; height: number };
type Frame = { width: number; height: number };

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sameBox(a: Box | null, b: Box | null) {
  if (a === null || b === null) {
    return a === b;
  }
  // 스크롤이 멈추는 동안 소수점이 계속 흔들린다. 1px 미만은 같은 위치로 본다.
  return Math.abs(a.top - b.top) < 1
    && Math.abs(a.left - b.left) < 1
    && Math.abs(a.width - b.width) < 1
    && Math.abs(a.height - b.height) < 1;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => getOnboardingState());
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const activeTour = activeTourId ? findTour(activeTourId) : null;

  // 저장은 렌더가 끝난 뒤에 한다. StrictMode는 setState 업데이터를 두 번 부르므로
  // 업데이터 안에서 쓰면 부수효과가 두 번 난다.
  const persisted = useRef(false);
  useEffect(() => {
    if (persisted.current) {
      saveOnboardingState(state);
    }
    persisted.current = true;
  }, [state]);

  const update = useCallback((next: (current: OnboardingState) => OnboardingState) => {
    setState(current => next(current));
  }, []);

  const startTour = useCallback((id: TourId) => {
    setActiveTourId(findTour(id) ? id : null);
    setStepIndex(0);
  }, []);

  const stopTour = useCallback(() => {
    setActiveTourId(null);
    setStepIndex(0);
  }, []);

  const finishTour = useCallback(() => {
    if (activeTourId) {
      update(current => markTourComplete(current, activeTourId));
    }
    setActiveTourId(null);
    setStepIndex(0);
  }, [activeTourId, update]);

  const markOffered = useCallback(() => {
    update(markOnboardingOffered);
  }, [update]);

  const isTourDone = useCallback((id: TourId) => isTourComplete(state, id), [state]);

  const value = useMemo<TourValue>(
    () => ({ state, activeTour, stepIndex, startTour, stopTour, isTourDone, markOffered }),
    [activeTour, isTourDone, markOffered, startTour, state, stepIndex, stopTour]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {activeTour ? (
        <CoachMarkOverlay
          tour={activeTour}
          stepIndex={stepIndex}
          onMove={setStepIndex}
          onSkip={stopTour}
          onFinish={finishTour}
        />
      ) : null}
    </TourContext.Provider>
  );
}

export function useTour() {
  const value = useContext(TourContext);
  if (!value) {
    throw new Error('useTour는 TourProvider 안에서만 쓸 수 있어요.');
  }
  return value;
}

type CoachMarkOverlayProps = {
  tour: Tour;
  stepIndex: number;
  onMove: (index: number) => void;
  onSkip: () => void;
  onFinish: () => void;
};

function CoachMarkOverlay({ tour, stepIndex, onMove, onSkip, onFinish }: CoachMarkOverlayProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [frame, setFrame] = useState<Frame>({ width: 0, height: 0 });
  const [anchorMissing, setAnchorMissing] = useState(false);

  const step = tour.steps[stepIndex] ?? null;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tour.steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish();
      navigate(tour.finishRoute);
      return;
    }
    onMove(stepIndex + 1);
  }, [isLast, navigate, onFinish, onMove, stepIndex, tour.finishRoute]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      onMove(stepIndex - 1);
    }
  }, [isFirst, onMove, stepIndex]);

  // 단계가 원하는 화면으로 먼저 이동한다. 앵커 탐색은 그다음 문제다.
  useEffect(() => {
    if (step && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [location.pathname, navigate, step]);

  // 앵커를 계속 따라간다. 스크롤이 부드럽게 흐르는 동안에도 구멍이 붙어 있어야
  // 하고, 화면이 늦게 그려지는 단계에서는 나타날 때까지 기다려야 한다.
  useEffect(() => {
    if (!step) {
      return;
    }

    let raf = 0;
    let found = false;
    let scrolledAt = 0;
    let scrollTries = 0;
    const startedAt = Date.now();
    setBox(null);
    setAnchorMissing(false);

    const tick = () => {
      const overlay = overlayRef.current;
      const target = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);

      if (overlay) {
        const base = overlay.getBoundingClientRect();
        setFrame(current =>
          Math.abs(current.width - base.width) < 1 && Math.abs(current.height - base.height) < 1
            ? current
            : { width: base.width, height: base.height }
        );

        if (target) {
          found = true;
          const rect = target.getBoundingClientRect();
          const next: Box = {
            top: rect.top - base.top,
            left: rect.left - base.left,
            width: rect.width,
            height: rect.height
          };

          // 한 번만 부르면 부족하다. 화면에 들어온 직후에는 아직 안 그려진 카드가
          // 위에 있어서, 스크롤이 끝난 뒤 앵커가 다시 화면 밖으로 밀려난다.
          // 하단 탭이 있는 화면에서는 그 아래로 들어간 부분도 안 보이는 것으로 센다 —
          // 좌표상 화면 안이어도 사용자 눈에는 탭바만 보인다.
          const nav = overlay.parentElement?.querySelector('nav');
          const safeBottom = nav
            ? nav.getBoundingClientRect().top - base.top
            : base.height;
          const visible = Math.max(0, Math.min(next.top + next.height, safeBottom) - Math.max(next.top, 0));
          const wanted = Math.min(next.height, safeBottom);
          // 더 스크롤할 여지가 없는 앵커(고정 하단 버튼 같은 것)에서 영원히
          // 다시 부르지 않도록 횟수를 막는다.
          if (visible < wanted * 0.9 && scrollTries < 6 && Date.now() - scrolledAt > 400) {
            scrolledAt = Date.now();
            scrollTries += 1;
            target.scrollIntoView({
              block: 'center',
              behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });
          }

          setBox(current => (sameBox(current, next) ? current : next));
          setAnchorMissing(false);
        } else if (!found && Date.now() - startedAt > ANCHOR_WAIT_MS) {
          // 조건부로만 그려지는 앵커가 있다. 투어를 멈추는 대신 설명만 띄운다.
          setAnchorMissing(true);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // 단계가 바뀌면 툴팁으로 초점을 옮긴다. 스크린리더가 새 설명을 읽어야 한다.
  useEffect(() => {
    panelRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // 아래 화면의 입력칸에 초점이 남아 있으면 좌우 키는 커서를 옮기는 키다.
      const typing = target
        ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
        : false;

      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      } else if (typing) {
        return;
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, onSkip]);

  if (!step) {
    return null;
  }

  const spot: Box | null = box
    ? {
        top: Math.max(0, box.top - SPOT_PADDING),
        left: Math.max(0, box.left - SPOT_PADDING),
        width: Math.min(frame.width, box.width + SPOT_PADDING * 2),
        height: Math.min(frame.height, box.height + SPOT_PADDING * 2)
      }
    : null;

  // 스크롤이 따라잡는 동안 구멍이 화면 밖에 있을 수 있다. 자르지 않고 계산하면
  // `bottom`이 음수가 되어 툴팁이 화면 아래로 사라진다.
  const spotTop = spot ? Math.min(Math.max(spot.top, 0), frame.height) : 0;
  const spotBottom = spot ? Math.min(Math.max(spot.top + spot.height, 0), frame.height) : 0;
  const spaceBelow = spot ? frame.height - spotBottom - PANEL_GAP * 2 : 0;
  const spaceAbove = spot ? spotTop - PANEL_GAP * 2 : 0;
  const placement = !spot
    ? 'center'
    : spaceBelow >= PANEL_MIN_HEIGHT
    ? 'below'
    : spaceAbove >= PANEL_MIN_HEIGHT
    ? 'above'
    : 'center';

  const panelStyle: CSSProperties =
    placement === 'below'
      ? { top: spotBottom + PANEL_GAP, maxHeight: spaceBelow }
      : placement === 'above'
      ? { bottom: frame.height - spotTop + PANEL_GAP, maxHeight: spaceAbove }
      : { top: '50%', transform: 'translateY(-50%)', maxHeight: Math.max(0, frame.height - 32) };

  const progress = Math.round(((stepIndex + 1) / tour.steps.length) * 100);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 overflow-hidden"
      role="presentation"
    >
      {spot ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[1.25rem] ring-2 ring-[color:var(--yellow)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            // 구멍 하나로 나머지를 전부 덮는다. 요소 4개로 나눠 그리면
            // 스크롤 중에 이음매가 1px씩 벌어져 깜빡인다.
            boxShadow: '0 0 0 9999px rgba(45, 39, 56, 0.66)'
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(45,39,56,0.66)]" />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${tour.title} 안내 ${stepIndex + 1}단계`}
        tabIndex={-1}
        style={panelStyle}
        className="absolute inset-x-4 overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-[0_20px_50px_rgba(45,39,56,0.35)] outline-none scrollbar-hide"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-[0.14em] text-[color:var(--coral-deep)]">
              {tour.title}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[color:var(--gray)]">
              {stepIndex + 1} / {tour.steps.length}단계
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="안내 그만 보기"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--gray-light)] text-[color:var(--gray)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--gray-light)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--coral),var(--yellow),var(--mint))] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h2 className="mt-4 break-keep text-lg font-black leading-snug text-[color:var(--navy)]">
          {step.title}
        </h2>
        <p className="mt-2 break-keep text-sm leading-relaxed text-[color:var(--gray)]">
          {step.body}
        </p>

        {anchorMissing && step.fallback ? (
          <p className="mt-3 break-keep rounded-2xl bg-[color:var(--blush)]/60 px-3 py-2 text-xs font-bold leading-relaxed text-[color:var(--coral-deep)]">
            {step.fallback}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-2xl bg-[color:var(--gray-light)] px-3.5 py-3 text-sm font-black text-[color:var(--navy)] disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[color:var(--coral-deep)] px-4 py-3 text-sm font-black text-white"
          >
            {isLast ? '안내 끝내기' : '다음'}
            {isLast ? null : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 w-full py-2 text-xs font-bold text-[color:var(--gray)]"
        >
          나중에 볼게요
        </button>
      </div>
    </div>
  );
}
