import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { LoginScreen } from './components/LoginScreen';
import { IntroScreen } from './components/IntroScreen';
import { RelationshipSelection } from './components/RelationshipSelection';
import { CreateJoinRoom } from './components/CreateJoinRoom';
import { HomeScreen } from './components/HomeScreen';
import { CreateSogonFile } from './components/CreateSogonFile';
import { MySogonFolder } from './components/MySogonFolder';
import { UnzipConfirmation } from './components/UnzipConfirmation';
import { ReceivedFile } from './components/ReceivedFile';
import { RecommendationZip } from './components/RecommendationZip';
import { RecordCalendar } from './components/RecordCalendar';
import { PlusPlanModal } from './components/PlusPlanModal';
import { DatePlansScreen } from './components/DatePlansScreen';
import { CorePreferencesScreen } from './components/CorePreferencesScreen';
import { RedirectIfAuthed, RedirectIfConnected, RequireAuth, SessionProvider } from './lib/session';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <div className="flex h-dvh min-h-0 w-full items-center justify-center bg-[linear-gradient(135deg,#fff7f7_0%,#f2ecff_45%,#e7fbf3_100%)] sm:p-4">
          <div className="relative h-full min-h-0 w-full max-w-[414px] overflow-hidden bg-[color:var(--cream)] sm:h-[min(896px,calc(100dvh-2rem))] sm:min-h-[680px] sm:rounded-[2.5rem] sm:shadow-[0_30px_80px_rgba(77,61,91,0.24)] sm:ring-1 sm:ring-white/70">
            <Routes>
              {/* 계정을 만들기 전 화면. 로그인했다면 볼 이유가 없어서 홈으로 보낸다. */}
              <Route element={<RedirectIfAuthed />}>
                <Route path="/" element={<IntroScreen />} />
                <Route path="/intro" element={<IntroScreen />} />
                <Route path="/relationship" element={<RelationshipSelection />} />
                <Route path="/login" element={<LoginScreen />} />
              </Route>

              {/* 가입 화면이라 비로그인도 들어와야 한다.
                  다만 이미 연결된 사람에게는 할 일이 없다(정원 2명). */}
              <Route element={<RedirectIfConnected />}>
                <Route path="/create-room" element={<CreateJoinRoom />} />
              </Route>

              {/* 로그인이 필요한 화면 */}
              <Route element={<RequireAuth />}>
                <Route path="/home" element={<HomeScreen />} />
                <Route path="/create-file" element={<CreateSogonFile />} />
                <Route path="/my-folder" element={<MySogonFolder />} />
                <Route path="/unzip" element={<UnzipConfirmation />} />
                <Route path="/received" element={<ReceivedFile />} />
                <Route path="/recommendation" element={<RecommendationZip />} />
                <Route path="/date-plans" element={<DatePlansScreen />} />
                <Route path="/core-preferences" element={<CorePreferencesScreen />} />
                <Route path="/record" element={<RecordCalendar />} />
                <Route path="/plus" element={<PlusPlanModal />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </SessionProvider>
    </BrowserRouter>
  );
}
