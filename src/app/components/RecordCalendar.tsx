import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function RecordCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState('2026-05-28');

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const events: Record<string, { stamp: string; dday: string; title: string; file: string; content: string; reaction: string; dateLabel: string }> = {
    '2026-05-05': {
      stamp: '📅',
      dday: 'D+77',
      title: '어린이날 데이트를 기록한 날',
      file: '데이트코스.zip',
      content: '사람 많은 곳보다 조용히 걷는 데이트가 좋아.',
      reaction: '다음엔 강변 산책하자.',
      dateLabel: '2026년 5월 5일'
    },
    '2026-05-12': {
      stamp: '🍽',
      dday: 'D+84',
      title: '음식 취향을 알게 된 날',
      file: '음식취향.zip',
      content: '사실 나는 매운 음식을 잘 못 먹어.',
      reaction: '말해줘서 고마워.',
      dateLabel: '2026년 5월 12일'
    },
    '2026-05-20': {
      stamp: '☕',
      dday: 'D+92',
      title: '카페 취향이 맞았던 날',
      file: '카페취향.zip',
      content: '창가 자리와 따뜻한 라떼가 있는 곳이 좋아.',
      reaction: '이 분위기 기억해둘게.',
      dateLabel: '2026년 5월 20일'
    },
    '2026-05-28': {
      stamp: '🎁',
      dday: 'D+100',
      title: '우리가 하나 더 가까워진 날',
      file: '음식취향.zip',
      content: '사실 나는 매운 음식을 잘 못 먹어.',
      reaction: '말해줘서 고마워.',
      dateLabel: '2026년 5월 28일'
    },
    '2026-06-12': {
      stamp: '💬',
      dday: 'D+115',
      title: '서연의 소곤.zip이 도착한 날',
      file: '카페취향.zip',
      content: '다음 데이트는 조용한 창가 자리 있는 카페였으면 좋겠어.',
      reaction: '이번 주말에 같이 가자.',
      dateLabel: '2026년 6월 12일'
    }
  };
  const currentMonth = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const lastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1)
  ];
  const selectedEvent = events[selectedDate];

  const formatDateKey = (day: number) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + offset, 1));
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="px-6 py-8 bg-white border-b border-[color:var(--border)]">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-xl">📅</span>
          <h1 className="text-xl font-bold text-[color:var(--navy)]">기록.zip</h1>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white px-6 py-4 border-b border-[color:var(--border)]">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-[color:var(--gray-light)] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[color:var(--navy)]" />
          </button>
          <h2 className="font-bold text-[color:var(--navy)]">{currentMonth}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-[color:var(--gray-light)] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[color:var(--navy)]" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-xs text-[color:var(--gray)] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => (
            <button
              key={idx}
              disabled={!day}
              onClick={() => day && setSelectedDate(formatDateKey(day))}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg ${
                day && formatDateKey(day) === selectedDate
                  ? 'bg-[color:var(--lavender)] text-white'
                  : day && events[formatDateKey(day)]
                  ? 'bg-[color:var(--lavender)]/10'
                  : ''
              }`}
            >
              {day && (
                <>
                  <span className="text-xs">{day}</span>
                  {events[formatDateKey(day)] && <span className="text-sm">{events[formatDateKey(day)].stamp}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
        {/* Selected event */}
        <div className="bg-gradient-to-br from-[color:var(--yellow)]/20 to-white rounded-3xl p-6 border-2 border-[color:var(--yellow)]/50 shadow-lg">
          <div className="text-center mb-4">
            <p className="text-sm text-[color:var(--gray)] mb-1">{selectedEvent?.dday ?? '기록 없음'}</p>
            <h3 className="text-lg font-bold text-[color:var(--navy)]">
              {selectedEvent?.title ?? '이 날짜에는 열린 소곤.zip이 없어요'}
            </h3>
          </div>

          {selectedEvent ? (
            <div className="bg-white rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{selectedEvent.stamp}</span>
                <p className="font-medium text-[color:var(--navy)]">{selectedEvent.file}이 열렸어요.</p>
              </div>
              <p className="text-sm text-[color:var(--gray)] ml-7 mb-3 italic">
                "{selectedEvent.content}"
              </p>
              <div className="ml-7 bg-[color:var(--lavender)]/10 rounded-xl p-3 inline-flex items-center gap-2">
                <span className="text-lg">🫶</span>
                <p className="text-sm text-[color:var(--navy)]">"{selectedEvent.reaction}"</p>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-center text-[color:var(--gray)]">
            {selectedEvent?.dateLabel ?? selectedDate}
          </p>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl p-4 border border-[color:var(--border)]">
          <p className="text-sm font-medium text-[color:var(--navy)] mb-3">기록 아이콘</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <span className="text-[color:var(--gray)]">열림</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <span className="text-[color:var(--gray)]">닫힘</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍽</span>
              <span className="text-[color:var(--gray)]">음식</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">☕</span>
              <span className="text-[color:var(--gray)]">카페</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span className="text-[color:var(--gray)]">기념일</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="text-[color:var(--gray)]">답장</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
