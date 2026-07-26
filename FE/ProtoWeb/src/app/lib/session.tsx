import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { SogonMark } from '../components/SogonMark';
import {
  fetchCurrentProfile,
  getProfile,
  hasStoredToken,
  onSessionExpired,
  type SogonProfile
} from './sogonStore';

type SessionStatus = 'checking' | 'authed' | 'guest';

type SessionValue = {
  status: SessionStatus;
  profile: SogonProfile | null;
  /** 로그인/가입/연결 후 세션 상태를 갱신한다. null이면 로그아웃 상태로 만든다. */
  setSession: (profile: SogonProfile | null) => void;
  /** 서버에 현재 세션이 살아있는지 다시 물어본다. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // 토큰이 없으면 서버에 물어볼 필요도 없다.
  const [status, setStatus] = useState<SessionStatus>(() =>
    hasStoredToken() ? 'checking' : 'guest'
  );
  const [profile, setProfile] = useState<SogonProfile | null>(() => getProfile());

  const refresh = useCallback(async () => {
    if (!hasStoredToken()) {
      setStatus('guest');
      setProfile(null);
      return;
    }

    try {
      const current = await fetchCurrentProfile();
      setProfile(current);
      setStatus('authed');
    } catch {
      // 토큰이 만료됐거나 폐기됐다. apiFetch가 401에서 로컬 세션을 이미 지운다.
      setProfile(null);
      setStatus('guest');
    }
  }, []);

  useEffect(() => {
    if (status === 'checking') {
      void refresh();
    }
    // 최초 1회만 확인한다. 이후에는 setSession/refresh로 갱신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면을 보고 있는 도중 세션이 만료되면(어떤 API 호출이든 401) 바로 내보낸다.
  useEffect(
    () =>
      onSessionExpired(() => {
        setProfile(null);
        setStatus('guest');
      }),
    []
  );

  const setSession = useCallback((next: SogonProfile | null) => {
    setProfile(next);
    setStatus(next ? 'authed' : 'guest');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, profile, setSession, refresh }),
    [status, profile, setSession, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession은 SessionProvider 안에서만 쓸 수 있어요.');
  }
  return value;
}

function SessionLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[color:var(--cream)] px-8 text-center">
      <SogonMark className="h-14 w-14 animate-pulse" seam="var(--cream)" />
      <p className="mt-4 text-sm font-bold text-[color:var(--gray)]">소곤.zip을 여는 중이에요</p>
    </div>
  );
}

/** 로그인이 필요한 화면을 감싼다. */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'checking') {
    return <SessionLoading />;
  }

  if (status === 'guest') {
    // 로그인 후 원래 가려던 곳으로 돌려보내기 위해 경로를 들고 간다.
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
}

/** 이미 로그인했다면 들어갈 이유가 없는 화면(로그인 등)을 감싼다. */
export function RedirectIfAuthed() {
  const { status } = useSession();

  if (status === 'checking') {
    return <SessionLoading />;
  }

  if (status === 'authed') {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
