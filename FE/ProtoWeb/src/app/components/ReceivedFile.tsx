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
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-[color:var(--border)] bg-white px-4 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          aria-label="홈으로 돌아가기"
          onClick={() => navigate('/home')}
          className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
        </button>
        <h1 className="break-keep text-center text-lg font-bold leading-tight text-[color:var(--navy)] sm:text-xl">
          받은 소곤.zip
        </h1>
        <div />
      </div>

      {/* Content */}
      {receivedFile ? (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32">
        <div className="text-center">
          <h2 className="mb-2 break-keep text-xl font-bold leading-tight text-[color:var(--navy)]">
            {receivedFile.sender}의 소곤.zip이 도착했어요
          </h2>
          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-[color:var(--pink)]/20 px-4 py-2">
            <Heart className="h-4 w-4 shrink-0 text-[color:var(--pink)]" fill="currentColor" />
            <p className="min-w-0 break-words text-left text-sm text-[color:var(--navy)]">
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
              className={`flex min-w-0 flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all sm:p-4 ${
                  selectedReaction === reaction.label
                    ? 'bg-[color:var(--lavender)]/10 border-[color:var(--lavender)]'
                    : 'bg-white border-[color:var(--border)]'
                }`}
              >
                <span className="text-3xl">{reaction.emoji}</span>
                <span className="break-keep text-center text-xs leading-snug text-[color:var(--navy)]">
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
      <div className="absolute bottom-0 left-0 right-0 border-t border-[color:var(--border)] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
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
