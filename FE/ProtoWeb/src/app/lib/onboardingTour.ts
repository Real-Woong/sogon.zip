/**
 * 온보딩 워크스루(코치마크 툴팁 투어)의 정의.
 *
 * React를 부르지 않는 순수 데이터·로직만 둔다. 그래야 `scripts/test.mjs`가
 * 이 파일만 번들해서 회귀 테스트를 돌릴 수 있다. 투어가 조용히 깨지는 방식은
 * 하나뿐이다 — 화면에서 `data-tour` 앵커가 사라졌는데 여기 정의는 그대로 남는 것.
 * 그건 타입체크로 안 잡히므로 테스트가 소스에서 앵커를 찾아 대조한다.
 */

export type TourId = 'date-course' | 'sogon-zip';

export type TourStep = {
  /** 화면에서 `data-tour` 값으로 찾을 요소. 이 요소에 구멍을 뚫어 강조한다. */
  anchor: string;
  /** 이 단계를 보려면 있어야 하는 경로. 다르면 투어가 먼저 이동시킨다. */
  route: string;
  title: string;
  body: string;
  /**
   * 앵커가 화면 상태에 따라 없을 수도 있는 단계의 대체 안내.
   * 없다고 투어를 멈추면 "시작 시간을 아직 안 넣었다" 같은 이유로 사용자가 갇힌다.
   */
  fallback?: string;
};

export type Tour = {
  id: TourId;
  /** 온보딩 화면 카드와 툴팁 머리말에 쓰는 이름. */
  title: string;
  summary: string;
  /** 카드에 적는 한 줄. 이 투어가 무엇을 끝내주는지. */
  outcome: string;
  /** 투어를 마친 뒤 남는 화면. */
  finishRoute: string;
  steps: readonly TourStep[];
};

/** 데이트 코스 추천: 취향 → 공통 흐름 → 약속 → 코스까지 한 바퀴. */
const DATE_COURSE_TOUR: Tour = {
  id: 'date-course',
  title: '데이트 코스 추천',
  summary: '둘의 취향을 모아 하루 코스가 나오기까지',
  outcome: '취향 20문항부터 약속에 붙는 시간표까지 순서대로 보여드려요.',
  finishRoute: '/recommendation',
  steps: [
    {
      anchor: 'home-date-match',
      route: '/home',
      title: '데이트 코스는 여기서 시작해요',
      body: '둘이 각자 남긴 취향을 모아 하루 코스로 엮어드려요. 이 카드를 누르면 추천 화면이 열려요.'
    },
    {
      anchor: 'rec-core-preference',
      route: '/recommendation',
      title: '1단계 · 핵심 취향 20문항',
      body: '두 사람 모두 20문항을 끝내야 실제 장소가 채워져요. 근거 없이 아무 데나 넣지 않으려고 잠가둔 거예요.'
    },
    {
      anchor: 'core-preference-question',
      route: '/core-preferences',
      title: '한 문항씩, 마음 가는 대로',
      body: '고르면 자동으로 다음 문항으로 넘어가요. 언제든 돌아와서 답을 바꿔도 괜찮아요.',
      fallback: '문항을 불러오는 중이면 잠깐 비어 보일 수 있어요. 화면이 뜨면 위에서부터 하나씩 고르면 돼요.'
    },
    {
      anchor: 'rec-course-preference',
      route: '/recommendation',
      title: '2단계 · 둘의 기본 코스 맞추기',
      body: '밥이 먼저인지 관람이 먼저인지, 각자 좋아하는 순서를 저장해요. 겹치는 부분이 새 약속의 기본 흐름이 돼요.'
    },
    {
      anchor: 'course-preference-editor',
      route: '/course-preferences',
      title: '칸을 옮기고, 시간을 정해요',
      body: '↑↓로 순서를 바꾸고 슬라이더로 얼마나 머물지 정해요. 저장하면 상대에게도 내 순서가 보여요.'
    },
    {
      anchor: 'plan-form',
      route: '/recommendation',
      title: '3단계 · 약속 정하기',
      body: '이름과 날짜만 있어도 저장돼요. 시작 시간까지 넣으면 그날 하루가 어떻게 흘러갈지 저장 전에 미리 보여드려요.'
    },
    {
      anchor: 'plan-form-window',
      route: '/recommendation',
      title: '끝나는 시간 · 동네 · 예산',
      body: '이 셋은 점수가 아니라 필터예요. 영업시간과 예산에 안 맞는 곳은 다른 조건이 아무리 좋아도 빠져요.'
    },
    {
      anchor: 'plan-form-flow',
      route: '/recommendation',
      title: '흐름은 언제든 직접 구성',
      body: '"직접 구성하기"로 칸을 더하고 시간을 나눠요. 그대로 두면 둘이 맞춘 공통 흐름을 그대로 써요.',
      fallback: '시작 시간을 넣으면 이 자리에 "데이트 흐름" 카드가 나타나요.'
    },
    {
      anchor: 'plan-list',
      route: '/recommendation',
      title: '저장한 약속은 둘 다 봐요',
      body: '내가 정한 약속도 상대가 정한 약속도 여기 모여요. 둘 다 취향을 끝내면 "둘의 취향 코스 보기"가 열려요.',
      fallback: '아직 정해둔 약속이 없으면 비어 있어요. 위에서 하나 저장하면 여기 쌓여요.'
    },
    {
      anchor: 'nav-recommendation',
      route: '/recommendation',
      title: '이제 다 봤어요',
      body: '다음부터는 아래 "추천" 탭으로 바로 오면 돼요.'
    }
  ]
};

/** 소곤.zip 압축·전송: 적는 순간부터 상대에게 열어주는 순간까지. */
const SOGON_ZIP_TOUR: Tour = {
  id: 'sogon-zip',
  title: '소곤.zip 압축과 전송',
  summary: '마음을 압축해서 정해둔 날에 열기까지',
  outcome: '무엇을 적고, 언제 열리게 하고, 어떻게 전하는지 차례로 보여드려요.',
  finishRoute: '/my-folder',
  steps: [
    {
      anchor: 'home-sogon-delivery',
      route: '/home',
      title: '마음은 날짜에 맞춰 보내요',
      body: '지금은 못 하는 말을 적어두고, 정해둔 날에 둘이 같이 열어요. 이 카드에서 시작해요.'
    },
    {
      anchor: 'create-file-tags',
      route: '/create-file',
      title: '무엇에 대한 이야기인가요',
      body: '태그는 나중에 소곤폴더에서 찾는 이름이 돼요. 여러 개 골라도 되고, 안 골라도 "기타"로 저장돼요.'
    },
    {
      anchor: 'create-file-content',
      route: '/create-file',
      title: '여기 적은 본문은 아무도 못 봐요',
      body: '열기 전까지는 상대에게도, 운영자에게도 보이지 않아요. 코스를 추천할 때도 본문은 쓰지 않아요.'
    },
    {
      anchor: 'create-file-sensitivity',
      route: '/create-file',
      title: '얼마나 조심스러운 이야기인지',
      body: '가벼운 이야기인지 꺼내기 어려운 이야기인지 표시해둬요. 열 때 서로 마음의 준비를 하는 데 써요.'
    },
    {
      anchor: 'create-file-opening',
      route: '/create-file',
      title: '언제 열 수 있게 할까요',
      body: '고른 날이 되면 "열 준비됨"으로 넘어가요. 날짜가 됐다고 저절로 공개되지는 않아요 — 여는 건 항상 내가 눌러야 해요.'
    },
    {
      anchor: 'create-file-recommendation',
      route: '/create-file',
      title: '추천에 반영하기',
      body: '켜두면 나중에 추천이 이 소곤.zip을 참고해요. 그때도 본문 자체는 추천에 들어가지 않아요.'
    },
    {
      anchor: 'create-file-save',
      route: '/create-file',
      title: '압축하면 소곤폴더로',
      body: '누르는 순간 내 소곤폴더에 들어가요. 내용도 열리는 시점도 나중에 고칠 수 있어요.'
    },
    {
      anchor: 'folder-tabs',
      route: '/my-folder',
      title: '다섯 칸으로 나뉘어요',
      body: '열릴 예정 · 열 준비됨 · 열림 · 닫아둠, 그리고 둘이 주고받은 걸 모아 보는 소곤거림. 정해둔 날이 지나면 "열 준비됨"으로 넘어와요.'
    },
    {
      anchor: 'folder-list',
      route: '/my-folder',
      title: '전하는 건 마지막 한 번의 누름',
      body: '"열 준비됨"에서 압축해제를 누르면 그때 상대에게 전해져요. 함께 보낼 메시지도 그 화면에서 적어요.',
      fallback: '아직 만든 소곤.zip이 없으면 비어 있어요. 하나 만들면 여기 쌓여요.'
    },
    {
      anchor: 'nav-folder',
      route: '/my-folder',
      title: '이제 다 봤어요',
      body: '아래 "소곤.zip" 탭이 내 소곤폴더예요. 상대가 열어준 소곤.zip은 홈 맨 위에 도착 알림으로 떠요.'
    }
  ]
};

export const TOURS: readonly Tour[] = [DATE_COURSE_TOUR, SOGON_ZIP_TOUR];

export function findTour(id: string): Tour | null {
  return TOURS.find(tour => tour.id === id) ?? null;
}

/** 온보딩 진행 상태. localStorage에 그대로 들어간다. */
export type OnboardingState = {
  /** 온보딩 화면을 한 번이라도 봤는지. 자동 안내는 딱 한 번만 뜬다. */
  offered: boolean;
  completed: TourId[];
};

export const EMPTY_ONBOARDING_STATE: OnboardingState = { offered: false, completed: [] };

/**
 * 저장된 값을 믿지 않고 읽는다. 손으로 고쳤거나 예전 형태가 남아 있어도
 * 온보딩 때문에 앱이 죽으면 안 된다.
 */
export function parseOnboardingState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_ONBOARDING_STATE;
  }

  const value = raw as { offered?: unknown; completed?: unknown };
  const completed = Array.isArray(value.completed)
    ? value.completed.filter((id): id is TourId => typeof id === 'string' && findTour(id) !== null)
    : [];

  return {
    offered: value.offered === true,
    // 같은 투어가 두 번 들어가면 진행률이 100%를 넘는다.
    completed: [...new Set(completed)]
  };
}

export function isTourComplete(state: OnboardingState, id: TourId) {
  return state.completed.includes(id);
}

export function markTourComplete(state: OnboardingState, id: TourId): OnboardingState {
  if (isTourComplete(state, id)) {
    return state;
  }
  return { ...state, completed: [...state.completed, id] };
}

export function markOnboardingOffered(state: OnboardingState): OnboardingState {
  return state.offered ? state : { ...state, offered: true };
}

/** 두 투어를 다 본 사람에게는 온보딩 화면을 다시 들이밀지 않는다. */
export function allToursComplete(state: OnboardingState) {
  return TOURS.every(tour => isTourComplete(state, tour.id));
}
