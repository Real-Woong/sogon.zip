import { useEffect, useMemo, useState } from 'react';
import { CalendarHeart, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { BottomNav } from './shared/BottomNav';
import { ScreenHeader } from './shared/ScreenHeader';
import { getDatePlans, getSogonFiles, openedMoment, type DatePlan } from '../lib/sogonStore';

type OpenedFileEvent = {
  kind: 'opened-file';
  id: string;
  title: string;
  content: string;
};

type DatePlanEvent = {
  kind: 'date-plan';
  id: string;
  plan: DatePlan;
};

type RecordEvent = OpenedFileEvent | DatePlanEvent;

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function RecordCalendar() {
  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);

  useEffect(() => {
    getDatePlans({ calendarView: true })
      .then(data => setDatePlans(data.datePlans))
      .catch(() => undefined);
  }, []);

  const events = useMemo(() => {
    const grouped: Record<string, RecordEvent[]> = {};
    const add = (dateKey: string, event: RecordEvent) => {
      grouped[dateKey] = [...(grouped[dateKey] ?? []), event];
    };

    // 열림이 명시적으로 끝난 소곤파일만 본문을 표시한다.
    getSogonFiles()
      .filter(file => file.status === 'opened')
      .forEach(file => {
        const tag = file.tags[0] ?? '소곤';
        // 쓴 날이 아니라 **연 날**에 찍는다. 8월 2일에 압축해 8월 13일에 열었으면
        // 8월 13일 칸에 들어가야 한다. 0009 이전 파일만 쓴 날로 물러난다.
        add(toDateKey(new Date(openedMoment(file))), {
          kind: 'opened-file',
          id: file.id,
          title: `${tag}.zip을 열어본 날`,
          content: file.content
        });
      });

    datePlans.forEach(plan => {
      add(plan.scheduledDate, { kind: 'date-plan', id: plan.id, plan });
    });
    return grouped;
  }, [datePlans]);

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const currentMonth = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const lastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1)
  ];
  const selectedEvents = events[selectedDate] ?? [];

  const formatDateKey = (day: number) => toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  const changeMonth = (offset: number) => {
    setCurrentDate(previous => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  return (
    <div className="flex h-full flex-col bg-[color:var(--cream)]">
      <ScreenHeader title="기록.zip" />

      <div className="shrink-0 border-b border-[color:var(--border)] bg-white px-5 py-3">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[color:var(--gray-light)]">
            <ChevronLeft className="h-5 w-5 text-[color:var(--navy)]" />
          </button>
          <h2 className="font-bold text-[color:var(--navy)]">{currentMonth}</h2>
          <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[color:var(--gray-light)]">
            <ChevronRight className="h-5 w-5 text-[color:var(--navy)]" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {daysOfWeek.map(day => <div key={day} className="py-1 text-center text-xs text-[color:var(--gray)]">{day}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateKey = day ? formatDateKey(day) : '';
            const dayEvents = dateKey ? events[dateKey] ?? [] : [];
            const hasDatePlan = dayEvents.some(event => event.kind === 'date-plan');
            const hasOpenedFile = dayEvents.some(event => event.kind === 'opened-file');
            return (
              <button
                key={`${dateKey}-${index}`}
                type="button"
                disabled={!day}
                onClick={() => day && setSelectedDate(dateKey)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg ${
                  day && dateKey === selectedDate
                    ? 'bg-[color:var(--lavender)] font-bold text-white shadow-sm'
                    : dayEvents.length > 0 ? 'bg-[color:var(--lavender)]/10' : ''
                }`}
              >
                {day ? (
                  <>
                    <span className="text-xs">{day}</span>
                    <span className="mt-0.5 flex h-2 items-center gap-0.5" aria-label={`${dayEvents.length}개 기록`}>
                      {hasDatePlan ? <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--coral-deep)]" /> : null}
                      {hasOpenedFile ? <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--yellow)]" /> : null}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6 pb-24">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[color:var(--gray)]">{toDateLabel(selectedDate)}</p>
          <h3 className="mt-1 text-lg font-black text-[color:var(--navy)]">
            {selectedEvents.length > 0 ? `둘의 기록 ${selectedEvents.length}개` : '아직 기록이 없어요'}
          </h3>
        </div>

        {selectedEvents.map(event => event.kind === 'date-plan' ? (
          <article key={`plan-${event.id}`} className="rounded-3xl bg-[linear-gradient(145deg,#fff1bd,#ffe3d6_55%,#eadfff)] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/75 text-[color:var(--coral-deep)]">
                <CalendarHeart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-[color:var(--coral-deep)]">데이트 약속</p>
                <h4 className="mt-1 break-words font-black text-[color:var(--navy)]">{event.plan.title}</h4>
                <p className="mt-1 text-xs font-bold text-[color:var(--gray)]">
                  {event.plan.startTime
                    ? `${event.plan.startTime}${event.plan.endTime ? `–${event.plan.endTime}` : ''}`
                    : '시간 미정'}
                  {event.plan.createdByNickname ? ` · ${event.plan.createdByNickname}님이 정함` : ''}
                </p>
              </div>
            </div>
          </article>
        ) : (
          <article key={`file-${event.id}`} className="rounded-3xl border-2 border-[color:var(--yellow)]/50 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--yellow)]/20 text-[color:var(--navy)]">
                <Gift className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[color:var(--gray)]">열어본 소곤파일</p>
                <h4 className="mt-1 break-keep font-black text-[color:var(--navy)]">{event.title}</h4>
                <p className="mt-2 break-words text-sm italic leading-relaxed text-[color:var(--gray)]">“{event.content}”</p>
              </div>
            </div>
          </article>
        ))}

        <div className="flex items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-xs font-bold text-[color:var(--gray)]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[color:var(--coral-deep)]" />데이트</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[color:var(--yellow)]" />열어본 소곤</span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
