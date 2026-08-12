import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  Footprints,
  HeartHandshake,
  MapPin,
  Plus,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Wallet
} from 'lucide-react';
import {
  answerTodayDateQuestion,
  createDatePlan,
  getDatePlans,
  getTodayDateQuestion,
  type DatePlan,
  type DateCourseSlot,
  type TodayDateQuestion
} from '../lib/sogonStore';
import { dateKeyInTimeZone } from '../../../../../shared/dateQuestions';
import {
  buildCourseSkeleton,
  type CourseSlot,
  type CourseSlotKind
} from '../../../../../shared/dateCourseSkeleton';
import { AREA_OPTIONS, findAreaLabel } from '../../../../../shared/areas';
import { ScreenHeader } from './shared/ScreenHeader';

const SLOT_ICON: Record<CourseSlotKind, typeof Coffee> = {
  meal: UtensilsCrossed,
  cafe: Coffee,
  activity: Ticket,
  walk: Footprints,
  transit: Footprints,
  buffer: Clock3
};

function CourseTimeline({ slots }: { slots: DateCourseSlot[] | CourseSlot[] }) {
  return (
    <ol className="mt-3 space-y-1.5">
      {slots.map(slot => {
        const Icon = SLOT_ICON[slot.kind];
        const isGap = slot.placeKinds.length === 0;
        return (
          <li
            key={slot.index}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs ${
              isGap
                ? 'text-[color:var(--gray)]'
                : 'bg-[color:var(--gray-light)] font-bold text-[color:var(--navy)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="w-[86px] shrink-0 tabular-nums">
              {slot.startTime}–{slot.endTime}
            </span>
            <span className="min-w-0 flex-1 break-keep">
              {'place' in slot && slot.place ? (
                <span className="block">
                  <span className="block text-sm font-black">{slot.place.name}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-[color:var(--gray)]">
                    {slot.label}
                    {slot.place.address ? ` · ${slot.place.address}` : ''}
                  </span>
                  {slot.place.preferenceReason ? (
                    <span className="mt-1 block text-[10px] font-bold text-emerald-700">
                      {slot.place.preferenceReason}
                    </span>
                  ) : null}
                  {slot.place.caution ? (
                    <span className="mt-1 block text-[10px] font-bold text-[color:var(--coral-deep)]">
                      {slot.place.caution}
                    </span>
                  ) : null}
                </span>
              ) : slot.label}
            </span>
            {slot.weatherNote ? (
              <span className="shrink-0 text-[10px] text-[color:var(--coral-deep)]">날씨</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul'
  }).format(date);
}

export function DatePlansScreen() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [todayQuestion, setTodayQuestion] = useState<TodayDateQuestion | null>(null);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [originArea, setOriginArea] = useState('');
  const [budget, setBudget] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [answeringOption, setAnsweringOption] = useState<string | null>(null);
  const [error, setError] = useState('');

  const minDate = useMemo(() => dateKeyInTimeZone(), []);

  // 저장하기 전에 시간표를 보여준다. "12시부터 9시까지"가 실제로 어떤 하루가
  // 되는지 눈으로 본 다음 저장하는 것과, 저장하고 나서 보는 것은 다르다.
  const previewCourse = useMemo(
    () => (startTime ? buildCourseSkeleton({ startTime, endTime: endTime || null }) : null),
    [startTime, endTime]
  );

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [planData, questionData] = await Promise.all([
        getDatePlans(),
        getTodayDateQuestion()
      ]);
      setPlans(planData.datePlans);
      setTodayQuestion(questionData.todayQuestion);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '약속을 불러오지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !scheduledDate || isSaving) {
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await createDatePlan({
        title: title.trim(),
        scheduledDate,
        startTime: startTime || null,
        endTime: endTime || null,
        originArea: originArea || null,
        budgetPerPerson: budget ? Number(budget) : null
      });
      setTitle('');
      setScheduledDate('');
      setStartTime('');
      setEndTime('');
      setOriginArea('');
      setBudget('');
      await load();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '약속을 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (!todayQuestion || todayQuestion.answeredOptionId || answeringOption) {
      return;
    }
    setAnsweringOption(optionId);
    setError('');
    try {
      await answerTodayDateQuestion({
        planId: todayQuestion.plan.id,
        questionId: todayQuestion.question.id,
        optionId
      });
      setTodayQuestion(current => current
        ? { ...current, answeredOptionId: optionId, answeredCount: current.answeredCount + 1 }
        : null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '답을 저장하지 못했어요.');
    } finally {
      setAnsweringOption(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fffafa_0%,#f5f0ff_100%)]">
      <ScreenHeader title="데이트 약속" backTo="/home" backLabel="홈으로 돌아가기" />

      <main className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-10 scrollbar-hide">
        {todayQuestion ? (
          <section className="rounded-[2rem] bg-[color:var(--navy)] p-5 text-white shadow-[0_16px_36px_rgba(45,39,56,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.15em] text-[color:var(--mint)]">
                  오늘의 질문
                </p>
                <p className="mt-1 text-xs font-bold text-white/60">
                  {todayQuestion.plan.title} · {dateLabel(todayQuestion.plan.scheduledDate)}
                </p>
              </div>
              <Sparkles className="h-6 w-6 shrink-0 text-[color:var(--yellow)]" />
            </div>
            <h2 className="break-keep text-xl font-black leading-snug">
              {todayQuestion.question.prompt}
            </h2>
            <div className="mt-4 grid gap-2">
              {todayQuestion.question.options.map(option => {
                const selected = todayQuestion.answeredOptionId === option.id;
                const answered = Boolean(todayQuestion.answeredOptionId);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={answered || Boolean(answeringOption)}
                    onClick={() => void handleAnswer(option.id)}
                    className={`flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition-colors ${
                      selected
                        ? 'bg-[color:var(--mint)] text-[color:var(--navy)]'
                        : 'bg-white/10 text-white disabled:opacity-55'
                    }`}
                  >
                    <span>{option.label}</span>
                    {selected ? <Check className="h-5 w-5" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-bold text-white/55">
              {todayQuestion.answeredOptionId
                ? `답을 저장했어요 · 두 사람 중 ${todayQuestion.answeredCount}명 답변`
                : '각자 고른 답이 이 약속의 취향 신호로 쌓여요.'}
            </p>
          </section>
        ) : null}

        <section className="rounded-[2rem] bg-white/90 p-5 shadow-sm ring-1 ring-white">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-[color:var(--navy)]">새 약속 정하기</h2>
              <p className="text-xs text-[color:var(--gray)]">상대의 약속 목록에도 바로 보여요.</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">약속 이름</span>
              <input
                value={title}
                maxLength={40}
                onChange={event => setTitle(event.target.value)}
                placeholder="예: 성수에서 여름 데이트"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">날짜</span>
                <input
                  type="date"
                  value={scheduledDate}
                  min={minDate}
                  onChange={event => setScheduledDate(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">시작</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={event => setStartTime(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">끝나는 시간</span>
                <input
                  type="time"
                  value={endTime}
                  disabled={!startTime}
                  onChange={event => setEndTime(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)] disabled:bg-[color:var(--gray-light)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">만나는 동네</span>
                <select
                  value={originArea}
                  onChange={event => setOriginArea(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                >
                  <option value="">아직</option>
                  {AREA_OPTIONS.map(area => (
                    <option key={area.code} value={area.code}>{area.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[color:var(--gray)]">1인 예산</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={10000}
                  value={budget}
                  onChange={event => setBudget(event.target.value)}
                  placeholder="원"
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                />
              </label>
            </div>

            {previewCourse ? (
              previewCourse.error ? (
                <p className="rounded-2xl bg-[color:var(--blush)] px-4 py-3 text-xs font-bold text-[color:var(--coral-deep)]">
                  {previewCourse.error}
                </p>
              ) : (
                <div className="rounded-2xl bg-[color:var(--cream)] p-3">
                  <p className="text-xs font-black text-[color:var(--navy)]">
                    이렇게 흘러가요 · 갈 곳 {previewCourse.placeSlotCount}군데
                  </p>
                  {previewCourse.note ? (
                    <p className="mt-1 text-[11px] text-[color:var(--coral-deep)]">{previewCourse.note}</p>
                  ) : null}
                  <CourseTimeline slots={previewCourse.slots} />
                  <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--gray)]">
                    아직 장소는 안 정해졌어요. 어떤 자리를 채울지만 잡아둔 거예요.
                  </p>
                </div>
              )
            ) : null}

            <button
              type="button"
              disabled={!title.trim() || !scheduledDate || isSaving}
              onClick={() => void handleCreate()}
              className="w-full rounded-2xl bg-[color:var(--coral-deep)] px-4 py-3.5 text-sm font-black text-white disabled:opacity-45"
            >
              {isSaving ? '약속을 저장하는 중...' : '둘의 약속으로 저장하기'}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-[color:var(--navy)]">다가오는 약속</h2>
            <span className="text-xs font-black text-[color:var(--coral-deep)]">{plans.length}개</span>
          </div>
          {isLoading ? (
            <div className="rounded-3xl bg-white/70 p-6 text-center text-sm font-bold text-[color:var(--gray)]">
              둘의 약속을 불러오는 중이에요.
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-white/55 p-7 text-center">
              <HeartHandshake className="mx-auto h-8 w-8 text-[color:var(--lavender)]" />
              <p className="mt-3 break-keep text-sm font-black text-[color:var(--navy)]">
                아직 정해둔 데이트가 없어요
              </p>
              <p className="mt-1 text-xs text-[color:var(--gray)]">날짜를 잡으면 D-7부터 질문이 열려요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <article key={plan.id} className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-white">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender)]/12 text-[color:var(--lavender)]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-black text-[color:var(--navy)]">{plan.title}</h3>
                      <p className="mt-1 text-sm font-bold text-[color:var(--coral-deep)]">
                        {dateLabel(plan.scheduledDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--gray)]">
                        {plan.startTime ? (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {plan.startTime}
                            {plan.endTime ? `–${plan.endTime}` : ''}
                          </span>
                        ) : null}
                        {findAreaLabel(plan.originArea) ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {findAreaLabel(plan.originArea)}
                          </span>
                        ) : null}
                        {plan.budgetPerPerson ? (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            1인 {plan.budgetPerPerson.toLocaleString('ko-KR')}원
                          </span>
                        ) : null}
                        <span>{plan.createdByMe ? '내가 정한 약속' : `${plan.createdByNickname ?? '상대'}님이 정한 약속`}</span>
                      </div>
                    </div>
                  </div>
                  {plan.course ? (
                    plan.course.preferenceReady ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-black text-[color:var(--coral-deep)]">
                          둘의 취향 코스 보기 · {plan.course.filledPlaceCount}/{plan.course.placeSlotCount}곳 추천
                        </summary>
                        <CourseTimeline slots={plan.course.slots} />
                        {plan.course.filledPlaceCount < plan.course.placeSlotCount ? (
                          <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--gray)]">
                            비어 있는 시간은 날짜·동네·영업시간 조건을 만족하는 장소를 찾지 못했어요.
                          </p>
                        ) : null}
                      </details>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/core-preferences')}
                        className="mt-3 w-full rounded-2xl bg-[color:var(--blush)] px-4 py-3 text-left text-xs font-black text-[color:var(--coral-deep)]"
                      >
                        핵심 취향 답변 후 코스 열기 · {plan.course.preferenceCompletedMembers}/{plan.course.preferenceRequiredMembers}명 완료
                      </button>
                    )
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        {error ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
