export const DATE_QUESTION_TIME_ZONE = 'Asia/Seoul';

export type DateQuestionOption = {
  id: string;
  label: string;
  axis: 'activity' | 'budget' | 'travel' | 'time';
  tag: string;
  weight: -1 | 1;
};

export type DateQuestion = {
  id: string;
  prompt: string;
  options: readonly [DateQuestionOption, DateQuestionOption];
};

/**
 * D-7부터 D-1까지 하루 한 문항이다. 두 선택지는 같은 axis/tag의 부호만 바꾼다.
 * 그래야 여러 약속에서 답해도 preference_signals의 한 행이 최신 선택을 나타내고,
 * 서로 반대인 태그가 둘 다 양수로 쌓이지 않는다.
 */
export const DATE_QUESTIONS: readonly DateQuestion[] = [
  {
    id: 'activity-energy',
    prompt: '이번 데이트는 어떻게 움직이고 싶어요?',
    options: [
      { id: 'active', label: '직접 해보고 움직이기', axis: 'activity', tag: 'active', weight: 1 },
      { id: 'calm', label: '천천히 보고 이야기하기', axis: 'activity', tag: 'active', weight: -1 }
    ]
  },
  {
    id: 'indoor-outdoor',
    prompt: '어느 쪽이 더 끌려요?',
    options: [
      { id: 'indoor', label: '실내에서 편안하게', axis: 'activity', tag: 'indoor', weight: 1 },
      { id: 'outdoor', label: '밖에서 바람 쐬기', axis: 'activity', tag: 'indoor', weight: -1 }
    ]
  },
  {
    id: 'exhibition-activity',
    prompt: '하나를 고른다면 어떤 하루가 좋아요?',
    options: [
      { id: 'exhibition', label: '전시와 작품 둘러보기', axis: 'activity', tag: 'exhibition', weight: 1 },
      { id: 'experience', label: '체험하고 결과물 만들기', axis: 'activity', tag: 'exhibition', weight: -1 }
    ]
  },
  {
    id: 'performance-day',
    prompt: '공연이 있는 데이트는 어때요?',
    options: [
      { id: 'performance', label: '좋아요, 무대를 보고 싶어요', axis: 'activity', tag: 'performance', weight: 1 },
      { id: 'conversation', label: '오늘은 둘이 이야기하고 싶어요', axis: 'activity', tag: 'performance', weight: -1 }
    ]
  },
  {
    id: 'free-paid',
    prompt: '비슷하게 끌리는 두 곳이라면?',
    options: [
      { id: 'free', label: '무료인 곳이 더 좋아요', axis: 'budget', tag: 'free', weight: 1 },
      { id: 'paid', label: '유료여도 특별하면 좋아요', axis: 'budget', tag: 'free', weight: -1 }
    ]
  },
  {
    id: 'area-east-west',
    prompt: '이번에는 어느 쪽 서울이 더 끌려요?',
    options: [
      { id: 'east', label: '성수·잠실 쪽', axis: 'travel', tag: 'east-seoul', weight: 1 },
      { id: 'west', label: '연남·을지로 쪽', axis: 'travel', tag: 'east-seoul', weight: -1 }
    ]
  },
  {
    id: 'slow-full',
    prompt: '데이트의 리듬은 어느 쪽이 좋아요?',
    options: [
      { id: 'slow', label: '한두 곳을 여유롭게', axis: 'time', tag: 'slow-pace', weight: 1 },
      { id: 'full', label: '여러 곳을 알차게', axis: 'time', tag: 'slow-pace', weight: -1 }
    ]
  }
] as const;

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateKeyInTimeZone(
  date = new Date(),
  timeZone = DATE_QUESTION_TIME_ZONE
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function daysBetweenDateKeys(from: string, to: string): number {
  if (!isDateKey(from) || !isDateKey(to)) {
    return Number.NaN;
  }
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/** D-7은 첫 문항, D-1은 마지막 문항이다. 약속 당일에는 새 질문을 만들지 않는다. */
export function questionForDate(planDate: string, today: string): DateQuestion | null {
  const daysUntil = daysBetweenDateKeys(today, planDate);
  if (!Number.isInteger(daysUntil) || daysUntil < 1 || daysUntil > DATE_QUESTIONS.length) {
    return null;
  }
  return DATE_QUESTIONS[DATE_QUESTIONS.length - daysUntil] ?? null;
}

export function findDateQuestion(questionId: string, optionId?: string) {
  const question = DATE_QUESTIONS.find(item => item.id === questionId);
  if (!question) {
    return null;
  }
  const option = optionId
    ? question.options.find(item => item.id === optionId) ?? null
    : null;
  return { question, option };
}
