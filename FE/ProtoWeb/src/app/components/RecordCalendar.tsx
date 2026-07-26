import { useState } from 'react';
import { BottomNav } from './shared/BottomNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSogonFiles } from '../lib/sogonStore';

type RecordEvent = {
  stamp: string;
  title: string;
  file: string;
  content: string;
  dateLabel: string;
};

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function RecordCalendar() {
  const openedFiles = getSogonFiles().filter(file => file.status === 'opened');
  const events = openedFiles.reduce<Record<string, RecordEvent>>((acc, file) => {
    const date = new Date(file.createdAt);
    const dateKey = toDateKey(date);
    acc[dateKey] = {
      stamp: '🎁',
      title: `${file.tags[0] ?? '소곤.zip'}을 열어본 날`,
      file: `${file.tags[0] ?? '소곤'}.zip`,
      content: file.content,
      dateLabel: toDateLabel(date)
    };
    return acc;
  }, {});
  const firstEventDate = Object.keys(events)[0];
  const initialDate = firstEventDate ? new Date(firstEventDate) : new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(firstEventDate ?? toDateKey(new Date()));

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const currentMonth = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const lastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1)
  ];
  const selectedEvent = events[selectedDate];

  const formatDateKey = (day: number) => toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));

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
            <p className="text-sm text-[color:var(--gray)] mb-1">
              {selectedEvent ? selectedEvent.dateLabel : '기록 없음'}
            </p>
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
              <span className="text-lg">📅</span>
              <span className="text-[color:var(--gray)]">기록일</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
