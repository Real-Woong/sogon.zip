/**
 * 하루짜리 데이트 코스의 **시간 골격**.
 *
 * "12:00~21:00"을 받아서 "12:00 점심 → 이동 → 활동 → 카페 → ... → 저녁 → 여유"
 * 같은 빈 칸들을 만든다. **어떤 장소를 넣을지는 여기서 정하지 않는다.** 골격을
 * 먼저 만들고, 그다음에 슬롯마다 후보를 채운다.
 *
 * 두 단계로 나눈 이유:
 *
 * 1. 골격은 **장소 데이터가 하나도 없어도** 만들 수 있고 테스트할 수 있다.
 *    영업시간이 1,364건 전부 NULL인 지금, 이 파일만 먼저 완성해둘 수 있다.
 * 2. 순수 함수라 Cron Worker와 화면이 같은 결과를 낸다. "미리 만든 코스"와
 *    "지금 다시 계산한 코스"의 시간표가 어긋나면 안 된다.
 *
 * ## 핵심 규칙: 식사는 시계에 고정된다
 *
 * 점수만 보고 배치하면 15시에 점심을 넣는 코스가 나온다. 아무리 좋은 식당이어도
 * 그건 사람이 쓰는 일정표가 아니다. 그래서 식사 슬롯은 **먼저** 자기 시간대에
 * 못 박고, 나머지 슬롯이 그 사이를 채운다.
 *
 * 저녁은 창의 시작이 아니라 **끝에서 역산한다.** 저녁을 먹고 바로 헤어지는
 * 코스보다, 저녁 뒤에 40분쯤 여유가 남는 코스가 실제 데이트에 가깝다.
 */
import type { PlaceKind } from './placeNormalize';

export type CourseSlotKind =
  | 'meal' // 식사
  | 'cafe'
  | 'activity' // 전시·팝업·체험·영화관
  | 'walk' // 산책·공원
  | 'transit' // 이동. 장소를 채우지 않는다
  | 'buffer'; // 여유·2차. 장소를 채우지 않는다

export type CourseSlot = {
  /** 0부터. 이동·여유 슬롯도 번호를 받는다. */
  index: number;
  kind: CourseSlotKind;
  /** 자정 기준 분. 240 = 04:00 */
  startMinutes: number;
  endMinutes: number;
  /** 'HH:mm' */
  startTime: string;
  endTime: string;
  /** 이 슬롯을 채울 수 있는 `places.kind`. 이동·여유는 빈 배열이다. */
  placeKinds: PlaceKind[];
  /** 식사처럼 시계에 못 박힌 슬롯인지. 후보가 없어도 시간을 옮기지 않는다. */
  anchored: boolean;
  /** 날씨 때문에 실내를 우선해야 하는 슬롯인지. 필터가 아니라 점수 힌트다. */
  preferIndoor: boolean;
  /** 화면에 보여줄 짧은 이름 */
  label: string;
  /** 날씨로 바뀐 슬롯이면 그 이유. 사용자에게 그대로 보여준다. */
  weatherNote?: string;
};

export type TransportMode = 'walk' | 'transit' | 'car';

export type CourseSkeletonInput = {
  /** 'HH:mm' */
  startTime: string;
  /** 'HH:mm'. 없으면 시작에서 기본 창만큼 잡는다. */
  endTime?: string | null;
  transport?: TransportMode;
};

/** 끝나는 시각을 안 정했을 때 잡는 창 길이. */
export const DEFAULT_WINDOW_MINUTES = 6 * 60;

/** 이 아래로 짧으면 코스라고 부르지 않는다. */
export const MIN_WINDOW_MINUTES = 90;

/** 하루에 이보다 길게는 안 짠다. 새벽까지 이어지는 일정은 다른 문제다. */
export const MAX_WINDOW_MINUTES = 14 * 60;

/**
 * 장소를 배치할 수 있는 시간대.
 *
 * ⚠️ **임시 가정이다.** `places.opening_hours_json`이 1,364건 전부 NULL이라
 * "새벽 2시에 문 연 카페"를 걸러낼 방법이 지금은 없다. 이 상수가 없으면
 * 00:00~12:45 같은 창에 02:15 카페가 들어간 시간표가 나온다.
 *
 * 실제 영업시간이 채워지면 이 상수 대신 후보 단계의 하드 필터가 판정한다.
 * 그때까지는 여기서 막는 게 거짓 시간표를 내보내는 것보다 낫다.
 */
export const SERVICE_START_MINUTES = 8 * 60;
export const SERVICE_END_MINUTES = 23 * 60;

const TRANSIT_MINUTES: Record<TransportMode, number> = {
  walk: 15,
  transit: 25,
  car: 20
};

type FillableKind = Exclude<CourseSlotKind, 'transit' | 'buffer'>;

/**
 * `max`는 자투리를 흡수할 때의 상한이다. 이게 없으면 남는 시간이 마지막 슬롯에
 * 다 붙어서 "카페 1시간 45분" 같은 칸이 생긴다. 카페에 그만큼 앉는 커플도 있지만
 * 일정표가 먼저 그렇게 제안하지는 않는다.
 */
const SLOT_SPEC: Record<
  FillableKind,
  { preferred: number; min: number; max: number; placeKinds: PlaceKind[]; label: string }
> = {
  meal: { preferred: 90, min: 60, max: 120, placeKinds: ['restaurant'], label: '식사' },
  cafe: { preferred: 60, min: 30, max: 90, placeKinds: ['cafe'], label: '카페' },
  activity: {
    preferred: 120,
    min: 60,
    max: 150,
    placeKinds: ['exhibition', 'popup', 'activity'],
    label: '활동'
  },
  walk: { preferred: 60, min: 30, max: 90, placeKinds: ['park'], label: '산책' }
};

/**
 * 구간을 무엇으로 채울지. **뒤에 오는 것**으로 정한다.
 *
 * - 점심 앞은 아침 시간대라 카페부터
 * - 저녁 앞은 하루의 본론이라 활동을 넉넉히. 목록이 짧으면 자투리가 통째로
 *   "여유 2시간"으로 남는다
 * - 저녁 뒤는 산책이나 2차. 전시·팝업은 그 시간에 대부분 닫혀 있다
 */
const ROTATIONS = {
  beforeLunch: ['cafe', 'activity'],
  beforeDinner: ['activity', 'cafe', 'activity', 'walk'],
  afterDinner: ['walk', 'cafe'],
  noMeal: ['activity', 'cafe', 'activity', 'walk']
} as const satisfies Record<string, readonly FillableKind[]>;

/**
 * 식사가 놓일 수 있는 **시작 시각** 범위. 끝 시각이 아니다.
 * 13:30에 시작하는 점심은 괜찮지만 14:30에 시작하는 점심은 점심이 아니다.
 */
const MEAL_ANCHORS = {
  lunch: { earliestStart: 11 * 60 + 30, latestStart: 13 * 60 + 30, label: '점심' },
  dinner: { earliestStart: 17 * 60, latestStart: 19 * 60 + 30, label: '저녁' }
} as const;

/** 저녁 뒤에 남겨두는 여유. 먹자마자 헤어지는 코스를 만들지 않는다. */
const DINNER_TAIL_MINUTES = 40;

/** 남는 자투리를 마지막 슬롯에 얼마까지 붙일지. 넘으면 여유 슬롯으로 뗀다. */
const MAX_ABSORB_MINUTES = 30;

/** 이동 슬롯을 자투리 흡수로 늘릴 수 있는 배수. 30분 걷는 코스를 만들지 않는다. */
const MAX_TRANSIT_STRETCH = 2;

/**
 * 식사 사이 한 구간에 넣을 장소 수 상한. 넘으면 남는 시간은 여유로 둔다.
 * 다섯 군데를 연달아 도는 건 데이트가 아니라 강행군이다.
 */
const MAX_PLACE_SLOTS_PER_SEGMENT = 4;

// -- 시각 변환 ---------------------------------------------------------------

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes));
  const hours = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

// -- 골격 만들기 -------------------------------------------------------------

type Draft = Omit<CourseSlot, 'index' | 'startTime' | 'endTime'>;

function placeDraft(kind: FillableKind, start: number, end: number, label?: string): Draft {
  const spec = SLOT_SPEC[kind];
  return {
    kind,
    startMinutes: start,
    endMinutes: end,
    placeKinds: [...spec.placeKinds],
    anchored: kind === 'meal',
    preferIndoor: false,
    label: label ?? spec.label
  };
}

function gapDraft(kind: 'transit' | 'buffer', start: number, end: number): Draft {
  return {
    kind,
    startMinutes: start,
    endMinutes: end,
    placeKinds: [],
    anchored: false,
    preferIndoor: false,
    label: kind === 'transit' ? '이동' : '여유'
  };
}

/**
 * 못 박힌 슬롯 사이를 채운다.
 *
 * `hasPrev`/`hasNext`는 이 구간 바로 앞뒤에 **장소 슬롯이 붙어 있는지**다.
 * 붙어 있으면 이동 시간을 먼저 떼어놓고 시작한다. 이걸 안 하면 점심 끝나자마자
 * 0분 만에 다음 장소에 도착하는 일정이 나온다.
 */
function fillSegment(input: {
  from: number;
  to: number;
  rotation: readonly FillableKind[];
  hasPrev: boolean;
  hasNext: boolean;
  transitMinutes: number;
}): Draft[] {
  const { from, to, rotation, hasPrev, hasNext, transitMinutes } = input;
  const drafts: Draft[] = [];
  const usableEnd = to - (hasNext ? transitMinutes : 0);

  let cursor = from;
  let placedCount = 0;
  let rotationAt = 0;

  // rotation은 목록이 아니라 **순환**이다. 한 바퀴 돌고 멈추면 긴 구간에
  // 몇 시간짜리 빈칸이 남는다(창이 길수록 심해진다).
  while (placedCount < MAX_PLACE_SLOTS_PER_SEGMENT) {
    const needsTransit = placedCount > 0 || hasPrev;
    const start = cursor + (needsTransit ? transitMinutes : 0);
    const available = usableEnd - start;

    // 지금 자리에 들어갈 수 있는 첫 종류를 순환 순서대로 찾는다. 활동(최소 60분)이
    // 안 들어가는 자리에도 카페(최소 30분)는 들어간다. 첫 후보에서 포기하면
    // 60분이 통째로 빈다.
    let picked: FillableKind | null = null;
    for (let step = 0; step < rotation.length; step += 1) {
      const candidate = rotation[(rotationAt + step) % rotation.length];
      if (available >= SLOT_SPEC[candidate].min) {
        picked = candidate;
        rotationAt += step + 1;
        break;
      }
    }
    if (!picked) {
      break;
    }

    if (needsTransit) {
      drafts.push(gapDraft('transit', cursor, start));
    }
    const duration = Math.min(SLOT_SPEC[picked].preferred, available);
    drafts.push(placeDraft(picked, start, start + duration));
    cursor = start + duration;
    placedCount += 1;
  }

  // 자투리 처리. 마지막 장소 슬롯을 조금 늘려 흡수하고, 그래도 남으면 여유로 뗀다.
  // 슬롯 종류별 상한을 넘겨서까지 늘리지는 않는다.
  let leftover = usableEnd - cursor;
  if (leftover > 0 && placedCount > 0) {
    const last = drafts[drafts.length - 1];
    const spec = SLOT_SPEC[last.kind as FillableKind];
    const headroom = spec.max - (last.endMinutes - last.startMinutes);
    const absorbed = Math.max(0, Math.min(leftover, MAX_ABSORB_MINUTES, headroom));
    last.endMinutes += absorbed;
    cursor += absorbed;
    leftover -= absorbed;
  }
  // **구간은 반드시 [from, to]를 빈틈없이 덮는다.** 남은 조각이 짧다고 버리면
  // 시간표에 구멍이 생기는데, 화면에서는 그게 "그 시간에 뭘 하는지 모름"으로 보인다.
  // 이 규칙은 `scripts/test.mjs`가 모든 시간 창을 훑어서 지킨다.
  if (cursor < to) {
    const comingFromPlace = hasPrev || placedCount > 0;
    if (hasNext && comingFromPlace) {
      // 이동 시간은 이 코스에서 가장 부정확한 값이라 조금 늘어나도 거짓말이 아니다.
      // 다만 무한정 늘리면 "이동 1시간"이 되므로 상한을 둔다.
      const transitStart = Math.max(cursor, to - transitMinutes * MAX_TRANSIT_STRETCH);
      if (transitStart > cursor) {
        drafts.push(gapDraft('buffer', cursor, transitStart));
      }
      drafts.push(gapDraft('transit', transitStart, to));
    } else {
      // 아직 아무 데도 안 갔거나(하루의 시작) 더 갈 곳이 없다(하루의 끝).
      // 이동이 아니라 여유다.
      drafts.push(gapDraft('buffer', cursor, to));
    }
  }

  return drafts;
}

export type CourseSkeleton = {
  slots: CourseSlot[];
  /** 실제로 코스가 짜인 창. 서비스 시간대 밖은 잘려 나간다. */
  startMinutes: number;
  endMinutes: number;
  /** 사용자가 넣은 창. 잘렸는지 화면에서 비교할 수 있게 그대로 돌려준다. */
  requestedStartMinutes: number;
  requestedEndMinutes: number;
  /** 장소를 채워야 하는 슬롯 수. 이동·여유는 빼고 센다. */
  placeSlotCount: number;
  /** 창이 잘렸을 때 사용자에게 그대로 보여줄 문장. */
  note?: string;
  /** 창이 너무 짧거나 형식이 틀렸을 때. slots는 빈 배열이다. */
  error?: string;
};

function failed(
  requestedStart: number,
  requestedEnd: number,
  error: string
): CourseSkeleton {
  return {
    slots: [],
    startMinutes: requestedStart,
    endMinutes: requestedEnd,
    requestedStartMinutes: requestedStart,
    requestedEndMinutes: requestedEnd,
    placeSlotCount: 0,
    error
  };
}

/**
 * 시간 창을 슬롯으로 나눈다.
 *
 * 자정을 넘는 창은 받지 않는다(끝 ≤ 시작). 새벽까지 이어지는 일정은 날짜가
 * 두 개라 `date_plans` 한 행으로 표현되지 않고, 영업시간 판정도 달라진다.
 */
export function buildCourseSkeleton(input: CourseSkeletonInput): CourseSkeleton {
  const transitMinutes = TRANSIT_MINUTES[input.transport ?? 'walk'];
  const requestedStart = parseTimeToMinutes(input.startTime);

  if (requestedStart === null) {
    return failed(0, 0, '시작 시각이 올바르지 않아요.');
  }

  const parsedEnd = input.endTime ? parseTimeToMinutes(input.endTime) : null;
  if (input.endTime && parsedEnd === null) {
    return failed(requestedStart, requestedStart, '끝나는 시각이 올바르지 않아요.');
  }
  const requestedEnd = parsedEnd ?? Math.min(requestedStart + DEFAULT_WINDOW_MINUTES, 24 * 60);

  if (requestedEnd - requestedStart < MIN_WINDOW_MINUTES) {
    return failed(
      requestedStart,
      requestedEnd,
      '끝나는 시각을 시작보다 1시간 30분 이상 뒤로 잡아주세요.'
    );
  }
  // 문 연 곳이 없는 시간대는 잘라낸다. 자르지 않으면 새벽 2시 카페가 들어간다.
  const start = Math.max(requestedStart, SERVICE_START_MINUTES);
  const end = Math.min(requestedEnd, SERVICE_END_MINUTES);
  const clamped = start !== requestedStart || end !== requestedEnd;

  if (end - start < MIN_WINDOW_MINUTES) {
    return failed(
      requestedStart,
      requestedEnd,
      `${minutesToTime(SERVICE_START_MINUTES)}~${minutesToTime(SERVICE_END_MINUTES)} 사이로 잡아주세요. 그 밖의 시간에는 문 연 곳이 거의 없어요.`
    );
  }

  // 길이 상한은 **자른 뒤**에 본다. 06:00~21:00은 15시간이라 그대로 보면
  // 거절되지만, 실제로 코스가 짜이는 건 08:00~21:00의 13시간이다.
  if (end - start > MAX_WINDOW_MINUTES) {
    return failed(requestedStart, requestedEnd, '하루 코스는 14시간까지만 짤 수 있어요.');
  }

  const note = clamped
    ? `문 연 곳이 있는 ${minutesToTime(start)}~${minutesToTime(end)}로 코스를 짰어요.`
    : undefined;

  const mealDuration = SLOT_SPEC.meal.preferred;

  // 저녁 먼저. 창의 끝에서 역산한다.
  let dinnerStart: number | null = Math.min(
    Math.max(end - DINNER_TAIL_MINUTES - mealDuration, MEAL_ANCHORS.dinner.earliestStart),
    MEAL_ANCHORS.dinner.latestStart
  );
  if (
    dinnerStart < MEAL_ANCHORS.dinner.earliestStart ||
    dinnerStart < start ||
    dinnerStart + mealDuration > end
  ) {
    dinnerStart = null;
  }

  // 점심은 창이 열리자마자. 저녁을 침범하면 넣지 않는다.
  let lunchStart: number | null = Math.max(start, MEAL_ANCHORS.lunch.earliestStart);
  if (
    lunchStart > MEAL_ANCHORS.lunch.latestStart ||
    lunchStart + mealDuration > end ||
    (dinnerStart !== null && lunchStart + mealDuration > dinnerStart)
  ) {
    lunchStart = null;
  }

  const drafts: Draft[] = [];
  const anchors: Array<{ start: number; meal: 'lunch' | 'dinner'; label: string }> = [];
  if (lunchStart !== null) {
    anchors.push({ start: lunchStart, meal: 'lunch', label: MEAL_ANCHORS.lunch.label });
  }
  if (dinnerStart !== null) {
    anchors.push({ start: dinnerStart, meal: 'dinner', label: MEAL_ANCHORS.dinner.label });
  }

  let cursor = start;
  let hasPrevPlace = false;

  for (const anchor of anchors) {
    if (anchor.start > cursor) {
      drafts.push(
        ...fillSegment({
          from: cursor,
          to: anchor.start,
          // 무엇이 뒤에 오는지로 정한다. 점심 앞이면 아침 시간대고,
          // 저녁 앞이면 하루의 본론이다.
          rotation: anchor.meal === 'lunch' ? ROTATIONS.beforeLunch : ROTATIONS.beforeDinner,
          hasPrev: hasPrevPlace,
          hasNext: true,
          transitMinutes
        })
      );
    }
    drafts.push(placeDraft('meal', anchor.start, anchor.start + mealDuration, anchor.label));
    cursor = anchor.start + mealDuration;
    hasPrevPlace = true;
  }

  if (cursor < end) {
    const isAfterDinner = dinnerStart !== null && cursor > dinnerStart;
    drafts.push(
      ...fillSegment({
        from: cursor,
        to: end,
        rotation: isAfterDinner
          ? ROTATIONS.afterDinner
          : anchors.length > 0
            ? ROTATIONS.beforeDinner
            : ROTATIONS.noMeal,
        hasPrev: hasPrevPlace,
        hasNext: false,
        transitMinutes
      })
    );
  }

  const slots = drafts.map((draft, index) => ({
    ...draft,
    index,
    startTime: minutesToTime(draft.startMinutes),
    endTime: minutesToTime(draft.endMinutes)
  }));

  return {
    slots,
    startMinutes: start,
    endMinutes: end,
    requestedStartMinutes: requestedStart,
    requestedEndMinutes: requestedEnd,
    placeSlotCount: slots.filter(slot => slot.placeKinds.length > 0).length,
    note
  };
}

// -- 날씨 --------------------------------------------------------------------

/**
 * 날씨 예보 한 시간치.
 *
 * **어떤 API를 쓰든 이 모양으로 바꿔서 넣는다.** 여기서 특정 제공자의 응답
 * 형식을 알면, 제공자를 바꿀 때 골격 로직까지 같이 고쳐야 한다.
 */
export type HourlyWeather = {
  /** 0~23. Asia/Seoul 기준 시각 */
  hour: number;
  /** 강수 확률 0~100 */
  precipitationProbability: number;
  /** 섭씨 */
  temperature: number;
};

export type WeatherThresholds = {
  /** 이 확률 이상이면 실내를 우선한다 */
  rainPercent: number;
  /** 이 온도 미만이면 실내를 우선한다 */
  minTemperature: number;
  /** 이 온도 초과면 실내를 우선한다 */
  maxTemperature: number;
};

export const DEFAULT_WEATHER_THRESHOLDS: WeatherThresholds = {
  rainPercent: 60,
  minTemperature: -5,
  maxTemperature: 33
};

/** 슬롯이 걸쳐 있는 시간대 중 가장 나쁜 값을 고른다. 평균을 쓰면 소나기가 묻힌다. */
function worstWeatherInSlot(slot: CourseSlot, forecast: readonly HourlyWeather[]) {
  const fromHour = Math.floor(slot.startMinutes / 60);
  const toHour = Math.ceil(slot.endMinutes / 60) - 1;
  const inRange = forecast.filter(hour => hour.hour >= fromHour && hour.hour <= toHour);

  if (inRange.length === 0) {
    return null;
  }

  return {
    rain: Math.max(...inRange.map(hour => hour.precipitationProbability)),
    minTemp: Math.min(...inRange.map(hour => hour.temperature)),
    maxTemp: Math.max(...inRange.map(hour => hour.temperature))
  };
}

/**
 * 예보를 보고 야외 슬롯을 실내로 돌린다.
 *
 * 하루 단위가 아니라 **시간별**로 판정한다. 오후에만 비가 오는 날에 오전 산책까지
 * 죽이면 안 된다.
 *
 * 산책 슬롯은 종류 자체를 바꾸고(`walk` → `activity`), 나머지 슬롯은
 * `preferIndoor`만 세운다. 카페·식당은 어차피 실내라 종류를 바꿀 이유가 없고,
 * 활동 슬롯은 실내 후보가 점수에서 앞서면 그만이다. **필터가 아니라 힌트다** —
 * 비 온다고 후보를 0개로 만들면 코스 자체가 안 나온다.
 */
export function applyWeatherToSkeleton(
  slots: readonly CourseSlot[],
  forecast: readonly HourlyWeather[],
  thresholds: WeatherThresholds = DEFAULT_WEATHER_THRESHOLDS
): CourseSlot[] {
  if (forecast.length === 0) {
    return slots.map(slot => ({ ...slot }));
  }

  return slots.map(slot => {
    if (slot.placeKinds.length === 0) {
      return { ...slot };
    }

    const weather = worstWeatherInSlot(slot, forecast);
    if (!weather) {
      return { ...slot };
    }

    const rainy = weather.rain >= thresholds.rainPercent;
    const cold = weather.minTemp < thresholds.minTemperature;
    const hot = weather.maxTemp > thresholds.maxTemperature;

    if (!rainy && !cold && !hot) {
      return { ...slot };
    }

    const note = rainy
      ? `비 올 확률 ${weather.rain}%라 실내로 바꿨어요`
      : cold
        ? `${weather.minTemp}도까지 떨어져서 실내로 바꿨어요`
        : `${weather.maxTemp}도까지 올라서 실내로 바꿨어요`;

    if (slot.kind === 'walk') {
      return {
        ...slot,
        kind: 'activity' as const,
        placeKinds: [...SLOT_SPEC.activity.placeKinds],
        label: '실내 활동',
        preferIndoor: true,
        weatherNote: note
      };
    }

    return { ...slot, preferIndoor: true, weatherNote: note };
  });
}
