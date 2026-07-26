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
import { RedirectIfAuthed, RequireAuth, SessionProvider } from './lib/session';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <div className="min-h-screen w-full flex items-center justify-center bg-[linear-gradient(135deg,#fff7f7_0%,#f2ecff_45%,#e7fbf3_100%)] p-4">
          <div className="relative w-full max-w-[414px] h-[min(896px,calc(100vh-2rem))] min-h-[680px] bg-[color:var(--cream)] overflow-hidden rounded-[2.5rem] shadow-[0_30px_80px_rgba(77,61,91,0.24)] ring-1 ring-white/70">
            <Routes>
              {/* 로그인 없이 볼 수 있는 화면 */}
              <Route path="/" element={<IntroScreen />} />
              <Route path="/intro" element={<IntroScreen />} />
              <Route path="/relationship" element={<RelationshipSelection />} />
              {/* 가입 화면이라 비로그인도 들어와야 한다. 연결 단계는 컴포넌트가 직접 구분한다. */}
              <Route path="/create-room" element={<CreateJoinRoom />} />

              {/* 이미 로그인했다면 들어갈 이유가 없는 화면 */}
              <Route element={<RedirectIfAuthed />}>
                <Route path="/login" element={<LoginScreen />} />
              </Route>

              {/* 로그인이 필요한 화면 */}
              <Route element={<RequireAuth />}>
                <Route path="/home" element={<HomeScreen />} />
                <Route path="/create-file" element={<CreateSogonFile />} />
                <Route path="/my-folder" element={<MySogonFolder />} />
                <Route path="/unzip" element={<UnzipConfirmation />} />
                <Route path="/received" element={<ReceivedFile />} />
                <Route path="/recommendation" element={<RecommendationZip />} />
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
