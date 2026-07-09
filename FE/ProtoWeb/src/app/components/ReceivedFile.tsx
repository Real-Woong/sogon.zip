import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Heart, MessageCircle } from 'lucide-react';
import { getReceivedSogonFiles } from '../lib/sogonStore';

export function ReceivedFile() {
  const navigate = useNavigate();
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const receivedFile = getReceivedSogonFiles()[0];

  const reactions = [
    { emoji: '🫶', label: '말해줘서 고마워' },
    { emoji: '🙂', label: '기억해둘게' },
    { emoji: '💛', label: '귀엽다' }
  ];

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-6 py-6 border-b border-[color:var(--border)] bg-white">
        <button
          type="button"
          aria-label="홈으로 돌아가기"
          onClick={() => navigate('/home')}
          className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
        </button>
        <h1 className="text-center text-xl font-bold text-[color:var(--navy)]">
          받은 소곤.zip
        </h1>
        <div />
      </div>

      {/* Content */}
      {receivedFile ? (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[color:var(--navy)] mb-2">
            {receivedFile.sender}의 소곤.zip이 도착했어요
          </h2>
          <div className="inline-flex items-center gap-2 bg-[color:var(--pink)]/20 px-4 py-2 rounded-full">
            <Heart className="w-4 h-4 text-[color:var(--pink)]" fill="currentColor" />
            <p className="text-sm text-[color:var(--navy)]">
              {receivedFile.message}
            </p>
          </div>
        </div>

        {/* Opened file */}
        <div className="bg-gradient-to-br from-[color:var(--yellow)]/30 to-white rounded-3xl p-6 border-2 border-[color:var(--yellow)] shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎁</span>
            <h3 className="text-lg font-bold text-[color:var(--navy)]">{receivedFile.title}</h3>
          </div>

          <div className="bg-white rounded-xl p-5">
            <p className="text-[color:var(--navy)] text-lg leading-relaxed">
              "{receivedFile.content}"
            </p>
          </div>
        </div>

        {/* Reaction section */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3 text-center">
            반응 남기기
          </label>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {reactions.map((reaction) => (
              <button
                key={reaction.label}
                onClick={() => setSelectedReaction(reaction.label)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedReaction === reaction.label
                    ? 'bg-[color:var(--lavender)]/10 border-[color:var(--lavender)]'
                    : 'bg-white border-[color:var(--border)]'
                }`}
              >
                <span className="text-3xl">{reaction.emoji}</span>
                <span className="text-xs text-center text-[color:var(--navy)]">
                  {reaction.label}
                </span>
              </button>
            ))}
          </div>
          <button className="w-full bg-white border-2 border-dashed border-[color:var(--lavender)] text-[color:var(--lavender)] py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[color:var(--lavender)]/5 transition-colors">
            <MessageCircle className="w-5 h-5" />
            답장 남기기
          </button>
        </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-5xl mb-5">📭</p>
          <h2 className="text-xl font-black text-[color:var(--navy)]">받은 소곤.zip이 없어요</h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
            내 사람과 연결한 뒤 열린 소곤.zip이 생기면 여기에 표시돼요.
          </p>
        </div>
      )}

      {/* Bottom button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[color:var(--border)]">
        <button
          onClick={() => navigate('/record')}
          className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors"
        >
          기록.zip에서 보기
        </button>
      </div>
    </div>
  );
}
