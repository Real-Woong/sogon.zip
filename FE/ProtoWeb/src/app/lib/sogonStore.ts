import {
  DEFAULT_OPENING_LABEL,
  resolveOpening,
  type SogonFileStatus
} from '../../../../../shared/sogonOpening';
import type { DateQuestion } from '../../../../../shared/dateQuestions';
import type { CourseSlot } from '../../../../../shared/dateCourseSkeleton';
import type { CourseStep } from '../../../../../shared/dateCourseSkeleton';
import type { CorePreferenceQuestion } from '../../../../../shared/corePreferences';

export type { SogonFileStatus };

export type SogonProfile = {
  nickname: string;
  relationshipType?: 'lover' | 'friend';
  accountCode?: string;
  partnerNickname?: string;
  partnerAccountCode?: string;
  isConnected?: boolean;
  createdAt: string;
};

export type SogonPerson = {
  nickname: string;
  accountCode: string;
  alreadyConnected?: boolean;
  roomFull?: boolean;
};

export type ConnectionRequest = {
  id: string;
  status: string;
  createdAt: string;
  person: SogonPerson;
};

export type SogonFile = {
  id: string;
  tags: string[];
  content: string;
  sensitivity: string;
  openingTime: string;
  /** ISO 8601. null이면 날짜로 자동 개봉되지 않는다. */
  openingAt: string | null;
  recommendationOn: boolean;
  status: SogonFileStatus;
  createdAt: string;
  /** 내가 쓴 파일인지. 상대 파일은 열린 것만 내려온다. */
  isMine: boolean;
};

export type SogonFileDraft = {
  tags: string[];
  content: string;
  sensitivity: string;
  openingTime: string;
  openingAt?: string | null;
  recommendationOn: boolean;
};

export type ReceivedSogonFile = {
  id: string;
  sender: string;
  title: string;
  content: string;
  message: string;
  receivedAt: string;
};

export type UserPreference = {
  id: string;
  category: string;
  text: string;
  createdAt: string;
};

export type CoursePlace = {
  id: string;
  kind: string;
  name: string;
  address: string | null;
  isIndoor: boolean | null;
  startsAt: string | null;
  endsAt: string | null;
  openState: 'open' | 'closed' | 'unknown';
  caution: string | null;
  preferenceReason: string | null;
};

export type DateCourseSlot = CourseSlot & { place?: CoursePlace | null };

export type DateCourse = {
  slots: DateCourseSlot[];
  placeSlotCount: number;
  filledPlaceCount: number;
  preferenceReady: boolean;
  preferenceCompletedMembers: number;
  preferenceRequiredMembers: number;
  note?: string;
};

export type CorePreferenceStatus = {
  questions: readonly CorePreferenceQuestion[];
  answers: Record<string, string>;
  total: number;
  answeredCount: number;
  complete: boolean;
  partner: {
    nickname: string;
    answeredCount: number;
    complete: boolean;
  } | null;
  coupleReady: boolean;
};

export type CoursePreferenceMember = {
  nickname: string;
  pattern: CourseStep[];
  complete: boolean;
};

export type CoursePreferenceStatus = {
  mine: CoursePreferenceMember | null;
  partner: CoursePreferenceMember | null;
  commonPattern: CourseStep[];
  ready: boolean;
  agreed: boolean;
  needsCoordination: boolean;
};

export type DatePlan = {
  id: string;
  title: string;
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
  originArea: string | null;
  budgetPerPerson: number | null;
  coursePattern: CourseStep[] | null;
  status: string;
  createdAt: string;
  createdByNickname: string | null;
  createdByMe: boolean;
  course: DateCourse | null;
};

export type TodayDateQuestion = {
  plan: Pick<DatePlan, 'id' | 'title' | 'scheduledDate'>;
  question: DateQuestion;
  answeredOptionId: string | null;
  answeredCount: number;
};

const profileKey = 'sogonzip.profile';
const filesKey = 'sogonzip.files';
const sessionKey = 'sogonzip.session';
const tokenKey = 'sogonzip.token';
const receivedFilesKey = 'sogonzip.receivedFiles';
const preferencesKey = 'sogonzip.preferences';

const sessionKeys = [
  tokenKey,
  sessionKey,
  profileKey,
  filesKey,
  preferencesKey,
  receivedFilesKey
];

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getToken() {
  return readJson<string | null>(tokenKey, null);
}

function saveToken(token: string) {
  writeJson(tokenKey, token);
}

function clearLocalSession() {
  if (!canUseStorage()) {
    return;
  }
  sessionKeys.forEach(key => window.localStorage.removeItem(key));
}

/**
 * 세션이 서버에서 거절됐을 때 알림을 받는다.
 * 화면을 보고 있는 도중에 세션이 만료되면 라우트 가드가 바로 반응해야 한다.
 */
type SessionExpiredHandler = () => void;
const sessionExpiredHandlers = new Set<SessionExpiredHandler>();

export function onSessionExpired(handler: SessionExpiredHandler) {
  sessionExpiredHandlers.add(handler);
  return () => {
    sessionExpiredHandlers.delete(handler);
  };
}

function notifySessionExpired() {
  sessionExpiredHandlers.forEach(handler => handler());
}

/** 서버가 4xx/5xx로 거절한 경우. 네트워크 장애와 구분해야 한다. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
  } catch {
    throw new Error('네트워크에 연결하지 못했어요.');
  }

  // `public/_redirects`의 `/* /index.html 200` 때문에, 라우팅되지 않은 `/api/*`는
  // 404가 아니라 **index.html을 200으로** 돌려준다. 이걸 성공으로 받아들이면
  // 로그인하지 않았는데 로그인한 것처럼 처리된다. 반드시 JSON인지 확인한다.
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  const data = isJson
    ? await response.json().catch(() => ({} as Record<string, unknown>))
    : ({} as Record<string, unknown>);

  if (!response.ok) {
    // 세션이 죽었으면 로컬에 남은 데이터도 정리하고 가드에 알린다.
    // 토큰을 실어 보낸 요청일 때만 만료로 본다. 로그인 실패의 401은 여기 해당하지 않는다.
    if (response.status === 401 && token) {
      clearLocalSession();
      notifySessionExpired();
    }
    throw new ApiError(
      (data as { error?: string })?.error ?? '요청을 처리하지 못했어요.',
      response.status
    );
  }

  if (!isJson) {
    throw new ApiError('서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.', response.status);
  }

  return data as T;
}

export function getProfile() {
  return readJson<SogonProfile | null>(profileKey, null);
}

export function saveProfile(profile: SogonProfile) {
  writeJson(profileKey, profile);
}

/** 이 기기에 토큰이 남아 있는지. 세션이 유효한지는 서버가 판단한다. */
export function hasStoredToken() {
  return Boolean(getToken());
}

/** 서버에 현재 세션이 유효한지 물어보고 최신 프로필을 받아온다. */
export async function fetchCurrentProfile() {
  const data = await apiFetch<{ profile?: SogonProfile }>('/api/auth/me');

  // 이건 인증 게이트다. 응답이 기대한 모양이 아니면 통과시키지 않는다.
  if (!data.profile?.nickname) {
    clearLocalSession();
    throw new ApiError('세션 정보를 확인하지 못했어요.', 500);
  }

  writeJson(profileKey, data.profile);
  writeJson(sessionKey, true);
  return data.profile;
}

// -- 인증 -------------------------------------------------------------------

export async function signInBetaUser(id: string, password: string) {
  const data = await apiFetch<{ token: string; profile: SogonProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: id.trim(), password })
  });

  saveToken(data.token);
  writeJson(sessionKey, true);
  writeJson(profileKey, data.profile);
  await syncRemoteData();
  return data.profile;
}

export async function signUpBetaUser(input: {
  loginId: string;
  password: string;
  nickname: string;
}) {
  const data = await apiFetch<{ token: string; accountCode: string; profile: SogonProfile }>(
    '/api/auth/signup',
    { method: 'POST', body: JSON.stringify(input) }
  );

  saveToken(data.token);
  writeJson(sessionKey, true);
  writeJson(profileKey, data.profile);
  return data;
}

/** 서버 세션을 폐기하고 이 기기에 남은 기록을 지운다. */
export async function signOutBetaUser() {
  if (getToken()) {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 서버에 못 닿아도 로컬 세션은 반드시 지운다.
    }
  }
  clearLocalSession();
}

// -- 연결 -------------------------------------------------------------------

export async function findPersonByCode(accountCode: string) {
  const params = new URLSearchParams({ code: accountCode.trim().toUpperCase() });
  return apiFetch<{ person: SogonPerson }>(`/api/people/find?${params.toString()}`);
}

export type ConnectResult =
  | { status: 'requested'; request: { id: string; target: SogonPerson } }
  | { status: 'connected'; roomId: string; partner: SogonPerson; profile: SogonProfile };

/**
 * 연결 "요청"을 보낸다. 상대가 수락해야 실제로 연결된다.
 * 상대가 이미 나에게 요청을 보내둔 상태면 서버가 바로 연결로 처리한다.
 */
export async function requestConnection(accountCode: string): Promise<ConnectResult> {
  const data = await apiFetch<ConnectResult>('/api/people/connect', {
    method: 'POST',
    body: JSON.stringify({ accountCode })
  });

  if (data.status === 'connected') {
    writeJson(sessionKey, true);
    writeJson(profileKey, data.profile);
    await syncRemoteData();
  }

  return data;
}

export async function getConnectionRequests() {
  if (!getToken()) {
    return { incoming: [] as ConnectionRequest[], outgoing: [] as ConnectionRequest[] };
  }
  return apiFetch<{ incoming: ConnectionRequest[]; outgoing: ConnectionRequest[] }>(
    '/api/people/requests'
  );
}

export async function respondToConnectionRequest(
  requestId: string,
  action: 'accept' | 'decline' | 'cancel'
) {
  const data = await apiFetch<{
    status: string;
    profile?: SogonProfile;
    partner?: SogonPerson;
  }>('/api/people/requests', {
    method: 'POST',
    body: JSON.stringify({ requestId, action })
  });

  if (data.status === 'accepted' && data.profile) {
    writeJson(profileKey, data.profile);
    await syncRemoteData();
  }

  return data;
}

// -- 소곤파일 ---------------------------------------------------------------

export function getSogonFiles() {
  return readJson<SogonFile[]>(filesKey, []);
}

/** 내가 쓴 파일만. 내 소곤폴더 화면은 이걸 쓴다. */
export function getMySogonFiles() {
  return getSogonFiles().filter(file => file.isMine !== false);
}

/** 상대가 열어서 나에게 도착한 파일 */
export function getOpenedPartnerFiles() {
  return getSogonFiles().filter(file => file.isMine === false && file.status === 'opened');
}

function createLocalSogonFile(draft: SogonFileDraft): SogonFile {
  const opening = resolveOpening({
    openingTime: draft.openingTime,
    openingAt: draft.openingAt
  });

  return {
    tags: draft.tags,
    content: draft.content,
    sensitivity: draft.sensitivity,
    recommendationOn: draft.recommendationOn,
    openingTime: opening.openingTime,
    openingAt: opening.openingAt,
    status: opening.status,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    isMine: true
  };
}

/**
 * 서버에 먼저 저장하고, 서버가 만든 파일(서버 id 포함)을 로컬에 반영한다.
 *
 * 예전에는 로컬에서 만든 id로 저장한 뒤 서버가 다른 id를 새로 발급해서,
 * 만들자마자 수정하면 PATCH가 404로 조용히 실패했다.
 * 서버가 거절한 경우(연결 안 됨 등)는 로컬에도 저장하지 않고 그대로 알린다.
 */
export async function saveSogonFile(draft: SogonFileDraft): Promise<SogonFile> {
  if (getToken()) {
    try {
      const data = await apiFetch<{ file: SogonFile }>('/api/files', {
        method: 'POST',
        body: JSON.stringify(draft)
      });
      writeJson(filesKey, [data.file, ...getSogonFiles()]);
      return data.file;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // 네트워크 장애일 때만 로컬에 임시 저장한다.
    }
  }

  const local = createLocalSogonFile(draft);
  writeJson(filesKey, [local, ...getSogonFiles()]);
  return local;
}

export type SogonFilePatch = {
  content?: string;
  openingTime?: string;
  openingAt?: string | null;
  recommendationOn?: boolean;
  status?: SogonFileStatus;
};

export async function updateSogonFile(fileId: string, patch: SogonFilePatch) {
  const applyLocal = (extra: Partial<SogonFile>) => {
    const next = getSogonFiles().map(file =>
      file.id === fileId ? { ...file, ...patch, ...extra } : file
    );
    writeJson(filesKey, next);
    return next;
  };

  // 서버가 안 만든 로컬 임시 파일이면 로컬만 갱신한다.
  if (!getToken() || fileId.startsWith('local-')) {
    const opening =
      patch.openingTime !== undefined || patch.openingAt !== undefined
        ? resolveOpening({ openingTime: patch.openingTime, openingAt: patch.openingAt })
        : null;
    return applyLocal(opening && patch.status === undefined
      ? { openingAt: opening.openingAt, status: opening.status }
      : {});
  }

  const data = await apiFetch<{
    file: { openingTime: string; openingAt: string | null; status: SogonFileStatus } | null;
  }>(`/api/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });

  // 상태/개봉시각의 최종 판단은 서버가 한다.
  return applyLocal(data.file ?? {});
}

/** 내가 쓴 소곤파일을 지운다. 되돌릴 수 없다. */
export async function deleteSogonFile(fileId: string) {
  const removeLocally = () => {
    writeJson(filesKey, getSogonFiles().filter(file => file.id !== fileId));
  };

  if (!getToken() || fileId.startsWith('local-')) {
    removeLocally();
    return;
  }

  await apiFetch(`/api/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  removeLocally();
}

/**
 * 연결을 해제한다. 소곤폴더가 해체되고 그 안의 소곤파일과 취향 기록이 사라진다.
 * 이 기기에 남은 사본도 함께 지운다.
 */
export async function disconnectPartner() {
  const data = await apiFetch<{ profile: SogonProfile }>('/api/people/disconnect', {
    method: 'POST'
  });

  writeJson(profileKey, data.profile);
  writeJson(filesKey, []);
  writeJson(preferencesKey, []);
  writeJson(receivedFilesKey, []);
  return data.profile;
}

/** 회원 탈퇴. 서버 계정과 이 기기의 기록을 모두 지운다. */
export async function deleteAccount() {
  await apiFetch('/api/auth/me', { method: 'DELETE' });
  clearLocalSession();
}

export function getReceivedSogonFiles() {
  return readJson<ReceivedSogonFile[]>(receivedFilesKey, []);
}

export function saveReceivedSogonFiles(files: ReceivedSogonFile[]) {
  writeJson(receivedFilesKey, files);
}

// -- 취향 -------------------------------------------------------------------

export function getUserPreferences() {
  return readJson<UserPreference[]>(preferencesKey, []);
}

export async function saveUserPreference(input: Omit<UserPreference, 'id' | 'createdAt'>) {
  if (getToken()) {
    try {
      const data = await apiFetch<{ preference: UserPreference }>('/api/preferences', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      writeJson(preferencesKey, [data.preference, ...getUserPreferences()]);
      return data.preference;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
    }
  }

  const preference: UserPreference = {
    ...input,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };
  writeJson(preferencesKey, [preference, ...getUserPreferences()]);
  return preference;
}

// -- 핵심 취향 질문 ---------------------------------------------------------

export async function getCorePreferences() {
  return apiFetch<{ corePreferences: CorePreferenceStatus }>('/api/core-preferences');
}

export async function saveCorePreferenceAnswer(input: {
  questionId: string;
  optionId: string;
}) {
  return apiFetch<{ corePreferences: CorePreferenceStatus }>('/api/core-preferences', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

// -- 둘의 기본 데이트 흐름 --------------------------------------------------

export async function getCoursePreferences() {
  return apiFetch<{ coursePreferences: CoursePreferenceStatus }>('/api/course-preferences');
}

export async function saveCoursePreferences(pattern: CourseStep[]) {
  return apiFetch<{ coursePreferences: CoursePreferenceStatus }>('/api/course-preferences', {
    method: 'PUT',
    body: JSON.stringify({ pattern })
  });
}

// -- 데이트 약속 / 오늘의 질문 ---------------------------------------------

export async function getDatePlans(options?: { calendarView?: boolean }) {
  return apiFetch<{ datePlans: DatePlan[] }>(
    options?.calendarView ? '/api/date-plans?view=calendar' : '/api/date-plans'
  );
}

export async function createDatePlan(input: {
  title: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  originArea?: string | null;
  budgetPerPerson?: number | null;
  coursePattern?: CourseStep[] | null;
}) {
  return apiFetch<{ datePlan: DatePlan }>('/api/date-plans', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function getTodayDateQuestion() {
  return apiFetch<{ todayQuestion: TodayDateQuestion | null }>(
    '/api/date-plans/questions/today'
  );
}

export async function answerTodayDateQuestion(input: {
  planId: string;
  questionId: string;
  optionId: string;
}) {
  const data = await apiFetch<{
    answer: { optionId: string; optionLabel: string };
    preference: UserPreference;
  }>('/api/date-plans/questions/today', {
    method: 'POST',
    body: JSON.stringify(input)
  });

  // 홈의 취향 개수도 다음 동기화 전부터 맞게 보인다.
  writeJson(preferencesKey, [data.preference, ...getUserPreferences()]);
  return data;
}

export async function syncRemoteData() {
  if (!getToken()) {
    return;
  }

  const [filesData, preferencesData] = await Promise.all([
    apiFetch<{ files: SogonFile[] }>('/api/files'),
    apiFetch<{ preferences: UserPreference[] }>('/api/preferences')
  ]);

  // 아직 서버로 올라가지 못한 로컬 임시 항목은 덮어쓰지 않고 남겨둔다.
  const pendingFiles = getSogonFiles().filter(file => file.id.startsWith('local-'));
  const pendingPreferences = getUserPreferences().filter(item => item.id.startsWith('local-'));

  writeJson(filesKey, [...pendingFiles, ...filesData.files]);
  writeJson(preferencesKey, [...pendingPreferences, ...preferencesData.preferences]);
}

export { DEFAULT_OPENING_LABEL };
