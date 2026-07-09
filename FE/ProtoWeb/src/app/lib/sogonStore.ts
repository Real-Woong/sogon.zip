export type SogonProfile = {
  nickname: string;
  relationshipType?: 'lover' | 'friend';
  partnerNickname?: string;
  roomCode?: string;
  createdAt: string;
};

export type SogonFileStatus = 'scheduled' | 'ready' | 'opened' | 'closed';

export type SogonFile = {
  id: string;
  tags: string[];
  content: string;
  sensitivity: string;
  openingTime: string;
  recommendationOn: boolean;
  status: SogonFileStatus;
  createdAt: string;
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

const profileKey = 'sogonzip.profile';
const filesKey = 'sogonzip.files';
const sessionKey = 'sogonzip.session';
const tokenKey = 'sogonzip.token';
const receivedFilesKey = 'sogonzip.receivedFiles';
const preferencesKey = 'sogonzip.preferences';

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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error ?? '요청을 처리하지 못했어요.');
  }

  return data as T;
}

function fireAndForget(task: Promise<unknown>) {
  task.catch(() => undefined);
}

export function getProfile() {
  return readJson<SogonProfile | null>(profileKey, null);
}

export function saveProfile(profile: SogonProfile) {
  writeJson(profileKey, profile);
}

export function isPrototypeSignedIn() {
  return readJson<boolean>(sessionKey, false);
}

export async function signInBetaUser(id: string, password: string) {
  const data = await apiFetch<{ token: string; profile: SogonProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: id.trim(), password })
  });

  saveToken(data.token);
  writeJson(sessionKey, true);
  writeJson(profileKey, data.profile);
  await syncRemoteData();
  return true;
}

export async function createBetaRoom(input: {
  loginId: string;
  password: string;
  nickname: string;
  relationshipType?: 'lover' | 'friend';
}) {
  const data = await apiFetch<{ token: string; inviteCode: string; profile: SogonProfile }>('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify(input)
  });

  saveToken(data.token);
  writeJson(sessionKey, true);
  writeJson(profileKey, data.profile);
  return data;
}

export async function joinBetaRoom(input: {
  inviteCode: string;
  loginId: string;
  password: string;
  nickname: string;
}) {
  const data = await apiFetch<{ token: string; profile: SogonProfile }>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify(input)
  });

  saveToken(data.token);
  writeJson(sessionKey, true);
  writeJson(profileKey, data.profile);
  return data;
}

export function getSogonFiles() {
  return readJson<SogonFile[]>(filesKey, []);
}

export function saveSogonFile(file: SogonFile) {
  const files = getSogonFiles();
  writeJson(filesKey, [file, ...files]);
  if (getToken()) {
    fireAndForget(apiFetch('/api/files', {
      method: 'POST',
      body: JSON.stringify(file)
    }));
  }
}

export function updateSogonFile(fileId: string, patch: Partial<Omit<SogonFile, 'id' | 'createdAt'>>) {
  const files = getSogonFiles();
  const nextFiles = files.map(file => file.id === fileId ? { ...file, ...patch } : file);
  writeJson(filesKey, nextFiles);
  if (getToken()) {
    fireAndForget(apiFetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }));
  }
  return nextFiles;
}

export function getReceivedSogonFiles() {
  return readJson<ReceivedSogonFile[]>(receivedFilesKey, []);
}

export function saveReceivedSogonFiles(files: ReceivedSogonFile[]) {
  writeJson(receivedFilesKey, files);
}

export function getUserPreferences() {
  return readJson<UserPreference[]>(preferencesKey, []);
}

export function saveUserPreference(input: Omit<UserPreference, 'id' | 'createdAt'>) {
  const preferences = getUserPreferences();
  const preference: UserPreference = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };
  writeJson(preferencesKey, [preference, ...preferences]);
  if (getToken()) {
    fireAndForget(apiFetch('/api/preferences', {
      method: 'POST',
      body: JSON.stringify(input)
    }));
  }
  return preference;
}

export async function syncRemoteData() {
  if (!getToken()) {
    return;
  }

  const [filesData, preferencesData] = await Promise.all([
    apiFetch<{ files: SogonFile[] }>('/api/files'),
    apiFetch<{ preferences: UserPreference[] }>('/api/preferences')
  ]);

  writeJson(filesKey, filesData.files);
  writeJson(preferencesKey, preferencesData.preferences);
}

export function createSogonFile(input: Omit<SogonFile, 'id' | 'createdAt' | 'status'>): SogonFile {
  const status: SogonFileStatus =
    input.openingTime === '지금 알려도 좋아요' ? 'ready' :
    input.openingTime === '열고 싶지 않아요' ? 'closed' :
    'scheduled';

  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status,
    createdAt: new Date().toISOString()
  };
}
