/**
 * 서비스 대상 상권. `03-decisions.md` #13에서 정한 서울 핵심 6곳.
 *
 * 전국을 넣으면 밀도가 낮아 "도보 12분" 같은 코스가 애초에 안 나온다.
 * 여기서 정한 좌표가 `places.area_code`가 된다.
 *
 * 하나의 상권이 좌표 여러 개를 가질 수 있다. 강남/신사처럼 실제로는 2.5km쯤
 * 떨어진 두 덩어리를 한 상권으로 부르는 경우가 있어서, 원 하나로 덮으려면
 * 반경을 억지로 키워야 하고 그러면 사이의 관계 없는 지역까지 딸려 들어온다.
 */

export const AREAS = [
  { code: 'seongsu', label: '성수', centers: [[37.5445, 127.0557]] },
  { code: 'hannam', label: '한남', centers: [[37.5340, 127.0016]] },
  {
    code: 'yeonnam',
    label: '연남·홍대',
    centers: [
      [37.5570, 126.9245], // 홍대입구역
      [37.5606, 126.9251] // 연남동
    ]
  },
  { code: 'euljiro', label: '을지로', centers: [[37.5663, 126.9917]] },
  { code: 'jamsil', label: '잠실', centers: [[37.5133, 127.1001]] },
  {
    code: 'gangnam',
    label: '강남·신사',
    centers: [
      [37.4979, 127.0276], // 강남역
      [37.5240, 127.0230] // 신사·압구정
    ]
  },
  // 아래 셋은 서울 문화행사 실데이터를 보고 추가했다. 원래 6곳에는 없었는데
  // 살아있는 행사 403건 중 종로가 단독 1위(반경 1.5km에서 97건)였다.
  // 광화문·삼청동·인사동·대학로·명동은 실제로 사람들이 데이트하는 곳이다.
  { code: 'jongno', label: '종로·삼청', centers: [[37.5720, 126.9769], [37.5790, 126.9830]] },
  { code: 'daehakro', label: '대학로', centers: [[37.5820, 127.0020]] },
  { code: 'myeongdong', label: '명동·충무로', centers: [[37.5636, 126.9827]] }
];

/**
 * 2000m인 이유: 1500m면 상권 6곳에 84건밖에 안 남고, 3000m면 걸어서 40분이라
 * 더 이상 "상권"이 아니다. 2000m는 도보 25분쯤이고 이 소스에서 171건이 잡힌다.
 */
export const DEFAULT_RADIUS_M = 2000;

/**
 * 좌표가 속한 상권을 찾는다. 여러 상권에 걸치면 가장 가까운 쪽으로 준다.
 * 어디에도 안 들어가면 null.
 */
export function findArea(lat, lng, radiusM, haversineMeters) {
  let best = null;

  for (const area of AREAS) {
    for (const [centerLat, centerLng] of area.centers) {
      const distance = haversineMeters({ lat, lng }, { lat: centerLat, lng: centerLng });
      if (distance <= radiusM && (best === null || distance < best.distance)) {
        best = { code: area.code, label: area.label, distance: Math.round(distance) };
      }
    }
  }

  return best;
}
