import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, Share2 } from 'lucide-react';
import { saveProfile } from '../lib/sogonStore';

export function CreateJoinRoom() {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [nickname, setNickname] = useState('');

  const inviteCode = 'A7K92';

  const handleCreateRoom = () => {
    if (nickname.trim()) {
      saveProfile({
        nickname: nickname.trim(),
        roomCode: inviteCode,
        createdAt: new Date().toISOString()
      });
      setShowInvite(true);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  if (showInvite) {
    return (
      <div className="h-full flex flex-col px-6 py-12">
        <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-12 text-center">
          상대방을 초대해주세요
        </h1>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-32">
          <div className="text-center">
            <p className="text-sm text-[color:var(--gray)] mb-4">초대 코드</p>
            <div className="bg-white rounded-2xl px-12 py-6 border-2 border-dashed border-[color:var(--lavender)] shadow-sm">
              <p className="text-4xl font-bold tracking-widest text-[color:var(--lavender)]">
                {inviteCode}
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleCopyCode}
              className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              코드 복사하기
            </button>
            <button className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" />
              공유하기
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="bg-[color:var(--gray-light)] text-[color:var(--navy)] py-4 rounded-2xl hover:bg-[color:var(--gray-light)]/80 transition-colors"
        >
          나중에 초대하기
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 py-12">
      <h1 className="text-2xl font-bold text-[color:var(--navy)] mb-12 text-center">
        소곤방 만들기
      </h1>

      <div className="flex-1 flex flex-col gap-6 pb-20">
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-2">
            닉네임을 입력해주세요
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 지우"
            className="w-full px-4 py-4 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          />
        </div>

        <div className="space-y-3 mt-auto">
          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim()}
            className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            새 소곤방 만들기
          </button>
          <button className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all">
            초대코드로 들어가기
          </button>
        </div>
      </div>
    </div>
  );
}
