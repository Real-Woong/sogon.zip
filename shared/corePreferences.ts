export type CorePreferenceAxis = 'food' | 'activity' | 'budget';

export type CorePreferenceOption = {
  id: 'like' | 'neutral' | 'avoid';
  label: string;
  weight: -1 | 0 | 1;
};

export type CorePreferenceQuestion = {
  id: string;
  group: '음식' | '활동' | '조건';
  prompt: string;
  description: string;
  axis: CorePreferenceAxis;
  tag: string;
};

export const CORE_PREFERENCE_OPTIONS: readonly CorePreferenceOption[] = [
  { id: 'like', label: '좋아요', weight: 1 },
  { id: 'neutral', label: '상관없어요', weight: 0 },
  { id: 'avoid', label: '피하고 싶어요', weight: -1 }
] as const;

/** 실제 `places.kind`·`tags_json`·`is_indoor`로 판정할 수 있는 것만 묻는다. */
export const CORE_PREFERENCE_QUESTIONS: readonly CorePreferenceQuestion[] = [
  { id: 'food-korean', group: '음식', prompt: '한식이 있는 데이트', description: '국밥, 고기, 찌개처럼 익숙하고 든든한 식사', axis: 'food', tag: 'cuisine:korean' },
  { id: 'food-japanese', group: '음식', prompt: '일식이 있는 데이트', description: '초밥, 라멘, 돈카츠 같은 일본 음식', axis: 'food', tag: 'cuisine:japanese' },
  { id: 'food-chinese', group: '음식', prompt: '중식이 있는 데이트', description: '중화요리와 딤섬처럼 함께 나눠 먹는 식사', axis: 'food', tag: 'cuisine:chinese' },
  { id: 'food-western', group: '음식', prompt: '양식이 있는 데이트', description: '파스타, 스테이크, 브런치 같은 서양 음식', axis: 'food', tag: 'cuisine:western' },
  { id: 'food-unusual', group: '음식', prompt: '처음 보는 이색 음식 도전', description: '익숙한 메뉴보다 새로운 음식점을 찾아보기', axis: 'food', tag: 'cuisine:other' },
  { id: 'activity-exhibition', group: '활동', prompt: '전시 공간 둘러보기', description: '전시관과 문화시설에서 천천히 관람하기', axis: 'activity', tag: 'kind:exhibition' },
  { id: 'activity-art', group: '활동', prompt: '미술 작품 감상하기', description: '미술관, 화랑, 디자인 전시를 함께 보기', axis: 'activity', tag: 'genre:art' },
  { id: 'activity-history', group: '활동', prompt: '역사와 이야기 만나기', description: '궁, 박물관, 유적처럼 이야기가 있는 공간', axis: 'activity', tag: 'genre:history' },
  { id: 'activity-performance', group: '활동', prompt: '공연이나 무대 관람하기', description: '연극, 콘서트, 클래식, 뮤지컬 같은 공연', axis: 'activity', tag: 'genre:performance' },
  { id: 'activity-festival', group: '활동', prompt: '축제와 시즌 행사 가기', description: '그날에만 만날 수 있는 축제와 특별 행사', axis: 'activity', tag: 'genre:festival' },
  { id: 'activity-hands-on', group: '활동', prompt: '직접 만들고 체험하기', description: '공방, 클래스, 참여형 프로그램에서 손을 쓰는 활동', axis: 'activity', tag: 'genre:hands_on' },
  { id: 'activity-sports', group: '활동', prompt: '몸을 움직이는 활동하기', description: '스포츠와 레포츠처럼 에너지를 쓰는 데이트', axis: 'activity', tag: 'genre:sports' },
  { id: 'activity-shopping', group: '활동', prompt: '시장과 상점 구경하기', description: '시장, 편집숍, 전문 매장을 함께 둘러보기', axis: 'activity', tag: 'genre:shopping' },
  { id: 'activity-nature', group: '활동', prompt: '공원과 자연 속 걷기', description: '강, 공원, 자연 공간에서 바람 쐬기', axis: 'activity', tag: 'genre:nature' },
  { id: 'activity-landmark', group: '활동', prompt: '서울의 명소 찾아가기', description: '전망대, 유명 건물, 특색 있는 거리를 구경하기', axis: 'activity', tag: 'genre:landmark' },
  { id: 'activity-reading', group: '활동', prompt: '서점과 도서관에서 보내기', description: '책을 고르고 조용히 머무는 데이트', axis: 'activity', tag: 'genre:reading' },
  { id: 'activity-theme-park', group: '활동', prompt: '테마파크에서 놀기', description: '놀이공원과 테마 공간에서 오래 즐기기', axis: 'activity', tag: 'genre:theme_park' },
  { id: 'condition-indoor', group: '조건', prompt: '실내 중심으로 편안하게', description: '날씨와 상관없이 실내에서 보내는 코스', axis: 'activity', tag: 'indoor:true' },
  { id: 'condition-free', group: '조건', prompt: '무료 행사와 공간 우선하기', description: '비슷하게 끌리면 비용 없는 장소를 먼저 선택', axis: 'budget', tag: 'fee:free' },
  { id: 'condition-family', group: '조건', prompt: '가족·어린이 중심 행사도 가기', description: '가족 관람객과 어린이를 위한 프로그램도 포함하기', axis: 'activity', tag: 'audience:family_or_kids' }
] as const;

export const CORE_PREFERENCE_TOTAL = CORE_PREFERENCE_QUESTIONS.length;

export function findCorePreference(questionId: string, optionId: string) {
  const question = CORE_PREFERENCE_QUESTIONS.find(item => item.id === questionId) ?? null;
  const option = CORE_PREFERENCE_OPTIONS.find(item => item.id === optionId) ?? null;
  return question && option ? { question, option } : null;
}

export const CORE_PREFERENCE_TAG_LABELS: Readonly<Record<string, string>> = {
  'cuisine:korean': '한식',
  'cuisine:japanese': '일식',
  'cuisine:chinese': '중식',
  'cuisine:western': '양식',
  'cuisine:other': '이색 음식',
  'kind:exhibition': '전시',
  'genre:art': '미술',
  'genre:history': '역사',
  'genre:performance': '공연',
  'genre:festival': '축제',
  'genre:hands_on': '체험',
  'genre:sports': '스포츠',
  'genre:shopping': '쇼핑',
  'genre:nature': '자연',
  'genre:landmark': '명소',
  'genre:reading': '책',
  'genre:theme_park': '테마파크',
  'indoor:true': '실내',
  'fee:free': '무료',
  'audience:family_or_kids': '가족 행사'
};
