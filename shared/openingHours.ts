/**
 * 영업시간. `places.opening_hours_json`에 들어가는 모양과 그걸 읽는 규칙.
 *
 * ## 왜 3-state인가
 *
 * 이 파일의 핵심은 `isOpenDuring`이 `'open' | 'closed' | 'unknown'` 셋을
 * 돌려준다는 것이다. **"모른다"를 "열려 있다"로 접으면 안 된다.**
 *
 * 지금 1,364건 전부 영업시간이 NULL이다. 모름을 열림으로 처리하면 문 닫은
 * 가게로 사람을 보내는 코스가 나오고, 모름을 닫힘으로 처리하면 후보가 0개가 된다.
 * 둘 다 틀렸다. 모름은 모름으로 두고, **코스 카드에 "영업시간을 확인하지
 * 못했어요"라고 적는 것**이 지금 할 수 있는 정직한 처리다.
 *
 * ## 파싱 실패도 데이터다
 *
 * "하절기 09:00~19:00 / 동절기 09:00~18:00" 같은 문자열은 못 읽는다. 그때
 * `parsed: false`로 두고 `raw`에 원문을 남긴다. 지어내는 것보다 낫고, 파서를
 * 고친 뒤 `place_sources`의 원본으로 다시 돌릴 수 있다.
 */

export type OpeningInterval = {
  /** 자정 기준 분 */
  openMinutes: number;
  closeMinutes: number;
};

export type OpeningHours = {
  /**
   * 요일별 영업 구간. 인덱스 0이 일요일이다.
   * `null`은 **그날을 모른다**는 뜻이고, 빈 배열이 휴무다.
   */
  weekly: Array<OpeningInterval[] | null>;
  /** 24시간 영업 */
  alwaysOpen: boolean;
  /** 파싱에 성공했는지. false면 스케줄러는 전부 unknown으로 다룬다. */
  parsed: boolean;
  /** 못 읽은 원문. 화면에 그대로 보여준다. */
  raw: string | null;
  /** 휴무일 원문. "매주 월요일" 같은 문장이라 아직 구조화하지 않는다. */
  closedRaw: string | null;
};

export type OpenState = 'open' | 'closed' | 'unknown';

const FULL_DAY: OpeningInterval = { openMinutes: 0, closeMinutes: 24 * 60 };

export function emptyOpeningHours(raw: string | null = null): OpeningHours {
  return {
    weekly: [null, null, null, null, null, null, null],
    alwaysOpen: false,
    parsed: false,
    raw,
    closedRaw: null
  };
}

/** `<br>`, `&nbsp;`, 중복 공백을 걷어낸다. TourAPI 응답에 그대로 섞여 온다. */
export function cleanHourText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \s]+/g, ' ')
    .trim();
}

/** "10:00~22:00", "11시 30분 - 21시", "09:00 – 18:00" 을 모두 받는다. */
const TIME_RANGE =
  /(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?\s*[~\-–—]\s*(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?/g;

/** 요일이 언급되면 요일마다 다른 시간표라 단순 파싱을 포기한다. */
const WEEKDAY_HINT = /(평일|주말|월요일|화요일|수요일|목요일|금요일|토요일|일요일|[월화수목금토일]\s*[~\-–—]\s*[월화수목금토일])/;

/** 계절·분기별로 갈리는 시간표도 단순 파싱 대상이 아니다. */
const SEASON_HINT = /(하절기|동절기|성수기|비수기|~\s*\d{1,2}월|\d{1,2}월\s*~)/;

/**
 * "10:00~22:00" 같은 문자열 하나를 주 7일 시간표로 바꾼다.
 *
 * 요일·계절이 섞인 문자열은 **읽지 않고** `parsed: false`로 둔다. 반쯤 읽어서
 * 평일 시간을 주말에도 적용하면, 일요일에 닫힌 가게를 열려 있다고 말하게 된다.
 */
export function parseOpeningHours(input: string | null | undefined, closedRaw?: string | null): OpeningHours {
  const text = input ? cleanHourText(input) : '';
  const closed = closedRaw ? cleanHourText(closedRaw) || null : null;

  if (text.length === 0) {
    const empty = emptyOpeningHours(null);
    empty.closedRaw = closed;
    return empty;
  }

  const base = emptyOpeningHours(text);
  base.closedRaw = closed;

  if (/24\s*시간/.test(text)) {
    return { ...base, weekly: Array.from({ length: 7 }, () => [FULL_DAY]), alwaysOpen: true, parsed: true, raw: null };
  }

  if (WEEKDAY_HINT.test(text) || SEASON_HINT.test(text)) {
    return base;
  }

  TIME_RANGE.lastIndex = 0;
  const matches = [...text.matchAll(TIME_RANGE)];
  if (matches.length !== 1) {
    // 0개면 시간 표기가 아니고, 2개 이상이면 조건이 붙은 문장이다.
    return base;
  }

  const [, openHour, openMin, closeHour, closeMin] = matches[0];
  const openMinutes = Number(openHour) * 60 + Number(openMin ?? 0);
  let closeMinutes = Number(closeHour) * 60 + Number(closeMin ?? 0);

  // "18:00~02:00" 같은 심야 영업. 다음 날로 넘어간 것으로 본다.
  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60;
  }

  if (openMinutes >= 24 * 60 || closeMinutes - openMinutes > 24 * 60) {
    return base;
  }

  const interval: OpeningInterval = { openMinutes, closeMinutes };
  return {
    ...base,
    weekly: Array.from({ length: 7 }, () => [interval]),
    parsed: true,
    raw: null
  };
}

/**
 * `weekday`(0=일)의 `[startMinutes, endMinutes)` 동안 계속 열려 있는지.
 *
 * 코스는 "이 시간에 이 장소에 있는다"라서, 슬롯이 걸친 시간 **전체**가
 * 영업시간 안에 들어와야 한다. 시작만 보면 닫기 10분 전에 들여보내게 된다.
 */
export function isOpenDuring(
  hours: OpeningHours | null | undefined,
  weekday: number,
  startMinutes: number,
  endMinutes: number
): OpenState {
  if (!hours || !hours.parsed) {
    return 'unknown';
  }
  if (hours.alwaysOpen) {
    return 'open';
  }

  const today = hours.weekly[weekday];
  if (today === null || today === undefined) {
    return 'unknown';
  }
  if (today.length === 0) {
    return 'closed';
  }

  const covered = today.some(
    interval => interval.openMinutes <= startMinutes && endMinutes <= interval.closeMinutes
  );
  if (covered) {
    return 'open';
  }

  // 전날 심야 영업이 오늘 새벽까지 이어지는 경우(예: 18:00~26:00).
  const yesterday = hours.weekly[(weekday + 6) % 7];
  if (yesterday && yesterday.length > 0) {
    const spillover = yesterday.some(
      interval =>
        interval.closeMinutes > 24 * 60 &&
        startMinutes + 24 * 60 >= interval.openMinutes &&
        endMinutes + 24 * 60 <= interval.closeMinutes
    );
    if (spillover) {
      return 'open';
    }
  }

  return 'closed';
}

/** D1에 넣을 문자열. 아무것도 못 읽었으면 NULL로 두는 게 맞다. */
export function serializeOpeningHours(hours: OpeningHours): string | null {
  if (!hours.parsed && !hours.raw && !hours.closedRaw) {
    return null;
  }
  return JSON.stringify(hours);
}

export function deserializeOpeningHours(value: string | null | undefined): OpeningHours | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as OpeningHours;
    return Array.isArray(parsed?.weekly) ? parsed : null;
  } catch {
    return null;
  }
}
