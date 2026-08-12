import {
  isCourseStep,
  isCustomCourseKind,
  toCourseSteps,
  type CoursePatternInput,
  type CourseStep
} from './dateCourseSkeleton';

export const MIN_COURSE_PATTERN_LENGTH = 1;
export const MAX_COURSE_PATTERN_LENGTH = 8;

/**
 * 저장된 기본 코스. 종류만 있던 옛 형태(`['meal','cafe']`)도 그대로 받는다.
 * 시간을 정하기 전에 저장한 사람의 기본 코스가 깨지지 않게 남긴 길이다.
 */
export function isValidCoursePattern(value: unknown): value is CoursePatternInput {
  return Array.isArray(value) &&
    value.length >= MIN_COURSE_PATTERN_LENGTH &&
    value.length <= MAX_COURSE_PATTERN_LENGTH &&
    value.every(item => isCustomCourseKind(item) || isCourseStep(item));
}

/**
 * 두 사람이 모두 원하는 순서만 남긴다. 중복 장소 유형도 한 번씩 소비하며,
 * 양쪽의 상대적인 순서를 깨지 않는 최장 공통 부분 수열이다.
 *
 * 남은 칸의 시간은 두 사람이 적은 시간의 **평균**을 쓴다. 한쪽으로 맞추면
 * 늘 같은 사람이 양보하게 되고, 그건 둘이 맞춘 기본값이 아니다.
 */
export function commonCoursePattern(
  first: CoursePatternInput,
  second: CoursePatternInput
): CourseStep[] {
  const left = toCourseSteps(first);
  const right = toCourseSteps(second);
  const lengths = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0)
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      lengths[leftIndex][rightIndex] = left[leftIndex].kind === right[rightIndex].kind
        ? 1 + lengths[leftIndex + 1][rightIndex + 1]
        : Math.max(lengths[leftIndex + 1][rightIndex], lengths[leftIndex][rightIndex + 1]);
    }
  }

  const common: CourseStep[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].kind === right[rightIndex].kind) {
      common.push({
        kind: left[leftIndex].kind,
        // 홀수 합은 내림. 어느 계정에서 조회해도 같은 값이 나와야 한다.
        minutes: Math.floor((left[leftIndex].minutes + right[rightIndex].minutes) / 2)
      });
      leftIndex += 1;
      rightIndex += 1;
    } else if (lengths[leftIndex + 1][rightIndex] >= lengths[leftIndex][rightIndex + 1]) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }
  return common;
}
