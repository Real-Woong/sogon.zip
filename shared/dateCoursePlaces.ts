import type { CourseSlot } from './dateCourseSkeleton';
import { deserializeOpeningHours, isOpenDuring, type OpenState } from './openingHours';
import type { PlaceKind } from './placeNormalize';

export type CoursePlaceCandidate = {
  id: string;
  kind: PlaceKind;
  name: string;
  address: string | null;
  areaCode: string | null;
  isIndoor: boolean | null;
  tags: string[];
  openingHoursJson: string | null;
  startsAt: string | null;
  endsAt: string | null;
  popularity: number | null;
  infoConfidence: number;
};

export type SelectedCoursePlace = Pick<
  CoursePlaceCandidate,
  'id' | 'kind' | 'name' | 'address' | 'isIndoor' | 'startsAt' | 'endsAt'
> & {
  openState: OpenState;
  /** 영업시간을 확정하지 못한 경우 화면에 반드시 함께 보여준다. */
  caution: string | null;
};

export type FilledCourseSlot = CourseSlot & { place: SelectedCoursePlace | null };

function dateOnly(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

function isActiveOn(candidate: CoursePlaceCandidate, scheduledDate: string) {
  const starts = dateOnly(candidate.startsAt);
  const ends = dateOnly(candidate.endsAt);
  return (!starts || starts <= scheduledDate) && (!ends || ends >= scheduledDate);
}

function weekdayOf(dateKey: string) {
  // 정오를 쓰면 UTC로 바꿔도 날짜가 전날로 넘어가지 않는다.
  return new Date(`${dateKey}T12:00:00+09:00`).getUTCDay();
}

function eventPriority(candidate: CoursePlaceCandidate, slot: CourseSlot) {
  if (slot.kind !== 'activity') return 0;
  if (candidate.kind === 'popup') return 4;
  if (candidate.startsAt || candidate.endsAt) return 3;
  if (candidate.kind === 'exhibition') return 2;
  return 0;
}

/**
 * 시간 골격의 빈 칸에 실제 장소를 넣는다.
 *
 * 날짜·종류·영업시간은 점수가 아니라 먼저 적용하는 필터다. 영업시간이 미상이면
 * 후보를 숨겨 전부 빈 코스로 만들지 않고, `caution`을 붙여 모른다는 사실을 보인다.
 */
export function fillCourseWithPlaces(input: {
  slots: readonly CourseSlot[];
  candidates: readonly CoursePlaceCandidate[];
  scheduledDate: string;
}): FilledCourseSlot[] {
  const weekday = weekdayOf(input.scheduledDate);
  const used = new Set<string>();

  return input.slots.map(slot => {
    if (slot.placeKinds.length === 0) return { ...slot, place: null };

    const ranked = input.candidates
      .filter(candidate =>
        !used.has(candidate.id) &&
        slot.placeKinds.includes(candidate.kind) &&
        isActiveOn(candidate, input.scheduledDate)
      )
      .map(candidate => ({
        candidate,
        openState: isOpenDuring(
          deserializeOpeningHours(candidate.openingHoursJson),
          weekday,
          slot.startMinutes,
          slot.endMinutes
        )
      }))
      // 닫힌 장소는 아무리 좋아도 들어가지 않는다.
      .filter(item => item.openState !== 'closed')
      .sort((left, right) =>
        eventPriority(right.candidate, slot) - eventPriority(left.candidate, slot) ||
        Number(right.openState === 'open') - Number(left.openState === 'open') ||
        Number(slot.preferIndoor && right.candidate.isIndoor === true) -
          Number(slot.preferIndoor && left.candidate.isIndoor === true) ||
        right.candidate.infoConfidence - left.candidate.infoConfidence ||
        (right.candidate.popularity ?? 0) - (left.candidate.popularity ?? 0) ||
        left.candidate.name.localeCompare(right.candidate.name, 'ko')
      );

    const selected = ranked[0];
    if (!selected) return { ...slot, place: null };
    used.add(selected.candidate.id);

    return {
      ...slot,
      place: {
        id: selected.candidate.id,
        kind: selected.candidate.kind,
        name: selected.candidate.name,
        address: selected.candidate.address,
        isIndoor: selected.candidate.isIndoor,
        startsAt: selected.candidate.startsAt,
        endsAt: selected.candidate.endsAt,
        openState: selected.openState,
        caution: selected.openState === 'unknown'
          ? '영업시간을 확인하지 못했어요. 방문 전에 확인해주세요.'
          : null
      }
    };
  });
}
