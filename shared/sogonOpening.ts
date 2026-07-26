/**
 * 소곤파일의 "열리는 시점" 도메인 규칙. FE(ProtoWeb)와 BE(Pages Functions)가 함께 import한다.
 *
 * 이 파일이 열림 상태의 단일 소스다. 화면마다 옵션 문자열을 따로 두면
 * 카피 한 글자 차이로 상태 전이가 조용히 깨지므로 라벨은 여기서만 정의한다.
 */

export type SogonFileStatus = 'scheduled' | 'ready' | 'opened' | 'closed';

export type OpeningOption = {
  /** 사용자에게 보이는 라벨이자 저장되는 값 */
  label: string;
  kind: 'now' | 'after-days' | 'custom-date' | 'manual' | 'never';
  /** kind === 'after-days'일 때만 사용 */
  days?: number;
  hint: string;
};

export const OPENING_OPTIONS: OpeningOption[] = [
  { label: '지금 알려도 좋아요', kind: 'now', hint: '바로 열 수 있어요' },
  { label: '100일 후', kind: 'after-days', days: 100, hint: '100일 뒤에 열 수 있게 돼요' },
  { label: '200일 후', kind: 'after-days', days: 200, hint: '200일 뒤에 열 수 있게 돼요' },
  { label: '1년 후', kind: 'after-days', days: 365, hint: '1년 뒤에 열 수 있게 돼요' },
  { label: '직접 날짜 선택', kind: 'custom-date', hint: '고른 날짜가 되면 열 수 있게 돼요' },
  { label: '내가 직접 열게요', kind: 'manual', hint: '날짜 없이, 내가 열고 싶을 때 열어요' },
  { label: '열고 싶지 않아요', kind: 'never', hint: '닫아둠으로 보관해요' }
];

export const OPENING_LABELS = OPENING_OPTIONS.map(option => option.label);

export const DEFAULT_OPENING_LABEL = '내가 직접 열게요';

export const CUSTOM_DATE_LABEL = '직접 날짜 선택';

export function findOpeningOption(label: string): OpeningOption | undefined {
  return OPENING_OPTIONS.find(option => option.label === label);
}

export type ResolvedOpening = {
  openingTime: string;
  /** ISO 8601. null이면 날짜로 자동 개봉되지 않는다 (수동/닫아둠). */
  openingAt: string | null;
  status: SogonFileStatus;
};

function addDays(base: Date, days: number) {
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeCustomDate(value: string, now: Date): string | null {
  // 'YYYY-MM-DD'는 그 날 00:00 로컬이 아니라 그 날이 "시작되는 순간"으로 해석한다.
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  // 과거 날짜를 고르면 즉시 열 수 있는 상태가 된다.
  return parsed.getTime() < now.getTime() ? now.toISOString() : parsed.toISOString();
}

/**
 * 라벨(+선택한 날짜)을 실제 개봉 시각과 상태로 변환한다.
 * 알 수 없는 라벨(예전 데이터)은 수동 개봉으로 취급해 그대로 보존한다.
 */
export function resolveOpening(input: {
  openingTime?: string | null;
  openingAt?: string | null;
  now?: Date;
}): ResolvedOpening {
  const now = input.now ?? new Date();
  const openingTime = input.openingTime?.trim() || DEFAULT_OPENING_LABEL;
  const option = findOpeningOption(openingTime);

  if (!option) {
    // 미지의 라벨: 날짜를 만들어내지 않고 수동 개봉으로 둔다.
    return { openingTime, openingAt: null, status: 'scheduled' };
  }

  switch (option.kind) {
    case 'now':
      return { openingTime, openingAt: now.toISOString(), status: 'ready' };

    case 'never':
      return { openingTime, openingAt: null, status: 'closed' };

    case 'manual':
      return { openingTime, openingAt: null, status: 'scheduled' };

    case 'after-days': {
      const openingAt = addDays(now, option.days ?? 0).toISOString();
      return { openingTime, openingAt, status: 'scheduled' };
    }

    case 'custom-date': {
      const openingAt = input.openingAt ? normalizeCustomDate(input.openingAt, now) : null;
      if (!openingAt) {
        // 날짜를 못 받았으면 임의 날짜를 만들지 않고 수동 개봉으로 떨어뜨린다.
        return { openingTime, openingAt: null, status: 'scheduled' };
      }
      return {
        openingTime,
        openingAt,
        status: new Date(openingAt).getTime() <= now.getTime() ? 'ready' : 'scheduled'
      };
    }
  }
}

/** scheduled 파일이 지금 열 수 있는 상태인지 */
export function isOpenable(
  file: { status: SogonFileStatus; openingAt?: string | null },
  now: Date = new Date()
) {
  if (file.status === 'ready') {
    return true;
  }
  if (file.status !== 'scheduled' || !file.openingAt) {
    return false;
  }
  return new Date(file.openingAt).getTime() <= now.getTime();
}

export function formatOpeningDate(openingAt: string | null | undefined) {
  if (!openingAt) {
    return null;
  }
  const date = new Date(openingAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** 카드에 보여줄 한 줄 설명 */
export function describeOpening(
  file: { openingTime: string; openingAt?: string | null; status: SogonFileStatus },
  now: Date = new Date()
) {
  if (file.status === 'closed') {
    return '닫아둠';
  }
  if (file.status === 'opened') {
    return '열림';
  }
  if (isOpenable(file, now)) {
    return '지금 열 수 있어요';
  }

  const dateLabel = formatOpeningDate(file.openingAt);
  if (!dateLabel) {
    return file.openingTime;
  }

  const days = Math.ceil((new Date(file.openingAt!).getTime() - now.getTime()) / 86_400_000);
  return days > 0 ? `${dateLabel} · D-${days}` : dateLabel;
}
