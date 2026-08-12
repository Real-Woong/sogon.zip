import {
  isCustomCourseKind,
  type CustomCourseKind
} from './dateCourseSkeleton';

export const MIN_COURSE_PATTERN_LENGTH = 1;
export const MAX_COURSE_PATTERN_LENGTH = 8;

export function isValidCoursePattern(value: unknown): value is CustomCourseKind[] {
  return Array.isArray(value) &&
    value.length >= MIN_COURSE_PATTERN_LENGTH &&
    value.length <= MAX_COURSE_PATTERN_LENGTH &&
    value.every(isCustomCourseKind);
}

/**
 * 두 사람이 모두 원하는 순서만 남긴다. 중복 장소 유형도 한 번씩 소비하며,
 * 양쪽의 상대적인 순서를 깨지 않는 최장 공통 부분 수열이다.
 */
export function commonCoursePattern(
  first: readonly CustomCourseKind[],
  second: readonly CustomCourseKind[]
): CustomCourseKind[] {
  const lengths = Array.from({ length: first.length + 1 }, () =>
    Array<number>(second.length + 1).fill(0)
  );

  for (let firstIndex = first.length - 1; firstIndex >= 0; firstIndex -= 1) {
    for (let secondIndex = second.length - 1; secondIndex >= 0; secondIndex -= 1) {
      lengths[firstIndex][secondIndex] = first[firstIndex] === second[secondIndex]
        ? 1 + lengths[firstIndex + 1][secondIndex + 1]
        : Math.max(lengths[firstIndex + 1][secondIndex], lengths[firstIndex][secondIndex + 1]);
    }
  }

  const common: CustomCourseKind[] = [];
  let firstIndex = 0;
  let secondIndex = 0;
  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] === second[secondIndex]) {
      common.push(first[firstIndex]);
      firstIndex += 1;
      secondIndex += 1;
    } else if (lengths[firstIndex + 1][secondIndex] >= lengths[firstIndex][secondIndex + 1]) {
      firstIndex += 1;
    } else {
      secondIndex += 1;
    }
  }
  return common;
}
