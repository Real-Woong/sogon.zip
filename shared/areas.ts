/**
 * 서비스 대상 상권. 화면과 서버가 함께 쓴다.
 *
 * ⚠️ **단일 소스는 `scripts/ingest/areas.mjs`다.** 수집기는 좌표로 반경 검색을
 * 돌려야 해서 순수 node(.mjs)로 남아 있고, 여기서 그 코드를 import할 수 없다.
 * 그래서 코드·라벨만 여기 다시 적고, 두 목록이 어긋나면 `scripts/test.mjs`가
 * 잡는다. 한쪽만 늘리면 고른 동네에 장소가 하나도 없거나, 수집한 동네를
 * 아무도 고를 수 없게 된다.
 *
 * 좌표는 여기 두지 않는다. 화면은 좌표가 필요 없고, 두 곳에 적으면 진짜로
 * 어긋난다.
 */
export type AreaOption = {
  /** `places.area_code`, `date_plans.origin_area`에 그대로 들어가는 값 */
  code: string;
  label: string;
};

export const AREA_OPTIONS: readonly AreaOption[] = [
  { code: 'seongsu', label: '성수' },
  { code: 'hannam', label: '한남' },
  { code: 'yeonnam', label: '연남·홍대' },
  { code: 'euljiro', label: '을지로' },
  { code: 'jamsil', label: '잠실' },
  { code: 'gangnam', label: '강남·신사' },
  { code: 'jongno', label: '종로·삼청' },
  { code: 'daehakro', label: '대학로' },
  { code: 'myeongdong', label: '명동·충무로' }
];

export function findAreaLabel(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return AREA_OPTIONS.find(area => area.code === code)?.label ?? null;
}
