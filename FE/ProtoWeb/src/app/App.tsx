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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full flex items-center justify-center bg-[linear-gradient(135deg,#fff7f7_0%,#f2ecff_45%,#e7fbf3_100%)] p-4">
        <div className="relative w-full max-w-[414px] h-[min(896px,calc(100vh-2rem))] min-h-[680px] bg-[color:var(--cream)] overflow-hidden rounded-[2.5rem] shadow-[0_30px_80px_rgba(77,61,91,0.24)] ring-1 ring-white/70">
          <Routes>
            <Route path="/" element={<IntroScreen />} />
            <Route path="/intro" element={<IntroScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/relationship" element={<RelationshipSelection />} />
            <Route path="/create-room" element={<CreateJoinRoom />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/create-file" element={<CreateSogonFile />} />
            <Route path="/my-folder" element={<MySogonFolder />} />
            <Route path="/unzip" element={<UnzipConfirmation />} />
            <Route path="/received" element={<ReceivedFile />} />
            <Route path="/recommendation" element={<RecommendationZip />} />
            <Route path="/record" element={<RecordCalendar />} />
            <Route path="/plus" element={<PlusPlanModal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
