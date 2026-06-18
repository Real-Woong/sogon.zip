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
const receivedFilesKey = 'sogonzip.receivedFiles';
const preferencesKey = 'sogonzip.preferences';

const prototypeUser = {
  id: '김진웅',
  password: '1234',
  partnerNickname: '서연'
};

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

export function getProfile() {
  return readJson<SogonProfile | null>(profileKey, null);
}

export function saveProfile(profile: SogonProfile) {
  writeJson(profileKey, profile);
}

export function isPrototypeSignedIn() {
  return readJson<boolean>(sessionKey, false);
}

export function signInPrototypeUser(id: string, password: string) {
  if (id.trim() !== prototypeUser.id || password !== prototypeUser.password) {
    return false;
  }

  writeJson(sessionKey, true);
  writeJson<SogonProfile>(profileKey, {
    nickname: prototypeUser.id,
    relationshipType: 'lover',
    partnerNickname: prototypeUser.partnerNickname,
    roomCode: 'LOVE2',
    createdAt: new Date().toISOString()
  });

  return true;
}

export function getSogonFiles() {
  return readJson<SogonFile[]>(filesKey, []);
}

export function saveSogonFile(file: SogonFile) {
  const files = getSogonFiles();
  writeJson(filesKey, [file, ...files]);
}

export function updateSogonFile(fileId: string, patch: Partial<Omit<SogonFile, 'id' | 'createdAt'>>) {
  const files = getSogonFiles();
  const nextFiles = files.map(file => file.id === fileId ? { ...file, ...patch } : file);
  writeJson(filesKey, nextFiles);
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
  return preference;
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
