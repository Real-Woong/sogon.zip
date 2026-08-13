import { useEffect, useMemo, useState } from 'react';
import { Check, HeartHandshake, Plus, Save, Users } from 'lucide-react';
import {
  getCoursePreferences,
  saveCoursePreferences,
  type CoursePreferenceStatus
} from '../lib/sogonStore';
import {
  CUSTOM_COURSE_KIND_OPTIONS,
  MAX_STEP_MINUTES,
  MIN_STEP_MINUTES,
  type CourseStep,
  type CustomCourseKind
} from '../../../../../shared/dateCourseSkeleton';
import { ScreenHeader } from './shared/ScreenHeader';

const FALLBACK_PATTERN: CourseStep[] = [
  { kind: 'meal', minutes: 90 },
  { kind: 'cafe', minutes: 60 },
  { kind: 'activity', minutes: 120 },
  { kind: 'walk', minutes: 60 }
];

/** 슬라이더 눈금. 10분 단위면 손가락으로도 맞출 수 있다. */
const STEP_GRANULARITY = 10;

function kindLabel(kind: CustomCourseKind) {
  return CUSTOM_COURSE_KIND_OPTIONS.find(option => option.kind === kind)?.label ?? kind;
}

/** 90 → "1시간 30분". 분만 남으면 "40분", 정각이면 "2시간". */
function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

function totalMinutes(pattern: readonly CourseStep[]) {
  return pattern.reduce((sum, step) => sum + step.minutes, 0);
}

function PatternFlow({ pattern, empty }: { pattern: readonly CourseStep[]; empty: string }) {
  if (pattern.length === 0) {
    return <p className="text-sm font-bold text-[color:var(--gray)]">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pattern.map((step, index) => (
        <span key={`${step.kind}-${index}`} className="flex items-center gap-1.5 text-xs font-black text-[color:var(--navy)]">
          {index > 0 ? <span className="text-[color:var(--gray)]">→</span> : null}
          <span className="rounded-full bg-white px-3 py-2 ring-1 ring-[color:var(--border)]">
            {kindLabel(step.kind)}
            <span className="ml-1.5 font-bold text-[color:var(--gray)]">{formatMinutes(step.minutes)}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/** 시간 배분을 눈으로 보는 띠. 어느 칸이 하루를 많이 먹는지 숫자보다 빠르다. */
function AllocationBar({ pattern }: { pattern: readonly CourseStep[] }) {
  const total = totalMinutes(pattern);
  if (total === 0) return null;
  const tones = ['var(--coral-deep)', 'var(--lavender)', 'var(--navy)', 'var(--mint)'];
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--gray-light)]">
      {pattern.map((step, index) => (
        <span
          key={`${step.kind}-${index}`}
          title={`${kindLabel(step.kind)} ${formatMinutes(step.minutes)}`}
          style={{
            width: `${(step.minutes / total) * 100}%`,
            background: tones[index % tones.length]
          }}
        />
      ))}
    </div>
  );
}

export function CoursePreferencesScreen() {
  const [status, setStatus] = useState<CoursePreferenceStatus | null>(null);
  const [pattern, setPattern] = useState<CourseStep[]>(FALLBACK_PATTERN);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => totalMinutes(pattern), [pattern]);

  useEffect(() => {
    getCoursePreferences()
      .then(data => {
        setStatus(data.coursePreferences);
        if (data.coursePreferences.mine?.pattern.length) {
          setPattern(data.coursePreferences.mine.pattern);
        }
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : '기본 코스를 불러오지 못했어요.'));
  }, []);

  const edit = (next: CourseStep[]) => {
    setPattern(next);
    setSaved(false);
  };

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= pattern.length) return;
    const next = [...pattern];
    [next[index], next[target]] = [next[target], next[index]];
    edit(next);
  };

  const setMinutes = (index: number, minutes: number) => {
    edit(pattern.map((step, stepIndex) =>
      stepIndex === index
        ? { ...step, minutes: Math.min(MAX_STEP_MINUTES, Math.max(MIN_STEP_MINUTES, minutes)) }
        : step
    ));
  };

  const handleSave = async () => {
    if (isSaving || pattern.length === 0) return;
    setIsSaving(true);
    setSaved(false);
    setError('');
    try {
      const data = await saveCoursePreferences(pattern);
      setStatus(data.coursePreferences);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '기본 코스를 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fffafa,#f3efff)]">
      <ScreenHeader title="둘의 기본 코스" backTo="/recommendation" backLabel="추천으로 돌아가기" />
      <main className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-10 scrollbar-hide">
        <section className="rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-[color:var(--mint)]">
            <HeartHandshake className="h-5 w-5" />
            <p className="text-xs font-black tracking-[0.14em]">OUR COMMON FLOW</p>
          </div>
          <h2 className="mt-3 text-xl font-black">우리 둘의 접점</h2>
          <div className="mt-4 rounded-2xl bg-white/10 p-4">
            {status?.ready ? (
              status.commonPattern.length > 0 ? (
                <PatternFlow pattern={status.commonPattern} empty="" />
              ) : (
                <p className="break-keep text-sm font-bold text-white/80">같은 순서가 아직 없어요. 둘이 흐름을 조율해 주세요.</p>
              )
            ) : (
              <p className="break-keep text-sm font-bold text-white/80">
                두 사람 모두 기본 코스를 저장하면 공통 흐름만 여기에 보여드려요.
              </p>
            )}
          </div>
          {status?.ready && status.commonPattern.length > 0 ? (
            <p className="mt-3 break-keep text-xs font-bold text-white/70">
              겹친 칸의 시간은 둘이 적은 시간의 평균이에요. 실제 약속이 더 짧으면 같은 비율로 줄어들어요.
            </p>
          ) : null}
          {status?.agreed ? (
            <p className="mt-3 break-keep text-xs font-bold text-[color:var(--mint)]">순서가 완전히 같아요. 이 흐름을 새 약속의 기본 코스로 사용해요.</p>
          ) : status?.needsCoordination && status.commonPattern.length > 0 ? (
            <p className="mt-3 break-keep text-xs font-bold text-[color:var(--yellow)]">
              겹치는 순서만 새 약속의 기본 코스로 써요. 나머지는 약속마다 직접 구성하거나, 여기서 순서를 더 맞춰 주세요.
            </p>
          ) : status?.needsCoordination ? (
            <p className="mt-3 break-keep text-xs font-bold text-[color:var(--yellow)]">겹치는 순서가 하나도 없어요. 기본 흐름을 쓰게 되니 둘이 조율해 주세요.</p>
          ) : null}
        </section>

        <section data-tour="course-preference-editor" className="rounded-[2rem] bg-white/90 p-5 shadow-sm ring-1 ring-white">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[color:var(--coral-deep)]">내 기본 코스</p>
              <h2 className="mt-1 font-black text-[color:var(--navy)]">어디에 얼마나 쓰고 싶은지</h2>
            </div>
            {saved ? <span className="flex items-center gap-1 text-xs font-black text-emerald-700"><Check className="h-4 w-4" />저장됨</span> : null}
          </div>

          <div className="mb-4 rounded-2xl bg-[color:var(--cream)] p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-black text-[color:var(--navy)]">이 흐름의 길이</p>
              <p className="text-sm font-black text-[color:var(--coral-deep)]">{formatMinutes(total)}</p>
            </div>
            <div className="mt-2"><AllocationBar pattern={pattern} /></div>
            <p className="mt-2 break-keep text-[11px] leading-relaxed text-[color:var(--gray)]">
              이동 시간은 빼고 센 거예요. 칸마다 원하는 만큼 정하면 돼요 — 밥 30분에 관람 4시간도 괜찮아요.
            </p>
          </div>

          <ol className="space-y-3">
            {pattern.map((step, index) => (
              <li key={`${step.kind}-${index}`} className="rounded-2xl bg-[color:var(--gray-light)] p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-[color:var(--coral-deep)]">{index + 1}</span>
                  <select
                    aria-label={`${index + 1}번째 기본 코스`}
                    value={step.kind}
                    onChange={event => edit(pattern.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, kind: event.target.value as CustomCourseKind }
                        : item
                    ))}
                    className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-2 text-xs font-black text-[color:var(--navy)]"
                  >
                    {CUSTOM_COURSE_KIND_OPTIONS.map(option => <option key={option.kind} value={option.kind}>{option.label}</option>)}
                  </select>
                  <button type="button" aria-label="앞으로 이동" disabled={index === 0} onClick={() => move(index, -1)} className="px-1.5 py-2 text-xs font-black disabled:opacity-25">↑</button>
                  <button type="button" aria-label="뒤로 이동" disabled={index === pattern.length - 1} onClick={() => move(index, 1)} className="px-1.5 py-2 text-xs font-black disabled:opacity-25">↓</button>
                  <button type="button" aria-label="삭제" disabled={pattern.length === 1} onClick={() => edit(pattern.filter((_, itemIndex) => itemIndex !== index))} className="px-2 py-2 text-[11px] font-black text-[color:var(--coral-deep)] disabled:opacity-25">삭제</button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    aria-label={`${kindLabel(step.kind)} 시간`}
                    min={MIN_STEP_MINUTES}
                    max={MAX_STEP_MINUTES}
                    step={STEP_GRANULARITY}
                    value={step.minutes}
                    onChange={event => setMinutes(index, Number(event.target.value))}
                    className="min-w-0 flex-1 accent-[color:var(--coral-deep)]"
                  />
                  <span className="w-20 shrink-0 text-right text-xs font-black text-[color:var(--navy)]">
                    {formatMinutes(step.minutes)}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            {CUSTOM_COURSE_KIND_OPTIONS.map(option => (
              <button
                key={option.kind}
                type="button"
                disabled={pattern.length >= 8}
                onClick={() => edit([...pattern, { kind: option.kind, minutes: 60 }])}
                className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-[color:var(--navy)] ring-1 ring-[color:var(--border)] disabled:opacity-30"
              >
                <Plus className="mr-1 inline h-3 w-3" />{option.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={isSaving} onClick={() => void handleSave()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--coral-deep)] px-4 py-3.5 text-sm font-black text-white disabled:opacity-45">
            <Save className="h-4 w-4" />{isSaving ? '저장하는 중...' : '내 기본 코스 공유하기'}
          </button>
        </section>

        <section className="rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-white">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-[color:var(--lavender)]" />
            <h2 className="font-black text-[color:var(--navy)]">{status?.partner?.nickname ?? '상대'}님의 기본 코스</h2>
          </div>
          <PatternFlow pattern={status?.partner?.pattern ?? []} empty="상대가 아직 기본 코스를 정하지 않았어요." />
        </section>

        {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      </main>
    </div>
  );
}
