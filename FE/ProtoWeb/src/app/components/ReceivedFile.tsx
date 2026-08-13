import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Heart, MessageCircle } from 'lucide-react';
import {
  getOpenedPartnerFiles,
  markPartnerFileSeen,
  openedMoment,
  syncRemoteData,
  type SogonFile
} from '../lib/sogonStore';
import { useSession } from '../lib/session';
import { ScreenHeader } from './shared/ScreenHeader';

function arrivedLabel(file: SogonFile) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul'
  }).format(new Date(openedMoment(file)));
}

export function ReceivedFile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useSession();
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  // 예전에는 아무도 쓰지 않는 localStorage 키를 읽어서 늘 비어 있었다.
  // 이제 서버에서 내려온 "상대가 열어준 파일"을 그대로 본다.
  const [files, setFiles] = useState<SogonFile[]>(() => getOpenedPartnerFiles());
  const requestedId = searchParams.get('file');
  const receivedFile = requestedId
    ? files.find(file => file.id === requestedId) ?? files[0]
    : files[0];

  useEffect(() => {
    syncRemoteData()
      .then(() => setFiles(getOpenedPartnerFiles()))
      .catch(() => undefined);
  }, []);

  // 이 화면까지 왔으면 본 것이다. 홈 배너가 계속 남아 있으면 안 된다.
  useEffect(() => {
    if (receivedFile && !receivedFile.partnerSeenAt) {
      void markPartnerFileSeen(receivedFile.id).catch(() => undefined);
    }
  }, [receivedFile]);

  const reactions = [
    { emoji: '🫶', label: '말해줘서 고마워' },
    { emoji: '🙂', label: '기억해둘게' },
    { emoji: '💛', label: '귀엽다' }
  ];

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      <ScreenHeader title="받은 소곤.zip" backTo="/home" backLabel="홈으로 돌아가기" />

      {/* Content */}
      {receivedFile ? (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32">
        <div className="text-center">
          <h2 className="mb-2 break-keep text-xl font-bold leading-tight text-[color:var(--navy)]">
            {profile?.partnerNickname ?? '상대'}님의 소곤.zip이 도착했어요
          </h2>
          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-[color:var(--pink)]/20 px-4 py-2">
            <Heart className="h-4 w-4 shrink-0 text-[color:var(--pink)]" fill="currentColor" />
            <p className="min-w-0 break-words text-left text-sm text-[color:var(--navy)]">
              {arrivedLabel(receivedFile)}에 열어줬어요
            </p>
          </div>
        </div>

        {/* Opened file */}
        <div className="bg-gradient-to-br from-[color:var(--yellow)]/30 to-white rounded-3xl p-6 border-2 border-[color:var(--yellow)] shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎁</span>
            <h3 className="text-lg font-bold text-[color:var(--navy)]">
              {receivedFile.tags[0] ?? '소곤'}.zip
            </h3>
          </div>

          <div className="bg-white rounded-xl p-5">
            <p className="text-[color:var(--navy)] text-lg leading-relaxed">
              "{receivedFile.content}"
            </p>
          </div>
        </div>

        {files.length > 1 ? (
          <div>
            <p className="mb-2 text-xs font-black text-[color:var(--gray)]">
              받은 소곤.zip {files.length}개
            </p>
            <div className="flex flex-wrap gap-2">
              {files.map(file => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => navigate(`/received?file=${encodeURIComponent(file.id)}`)}
                  className={`rounded-full px-3 py-2 text-xs font-black transition-colors ${
                    file.id === receivedFile.id
                      ? 'bg-[color:var(--navy)] text-white'
                      : 'bg-white text-[color:var(--navy)] ring-1 ring-[color:var(--border)]'
                  }`}
                >
                  {file.tags[0] ?? '소곤'}.zip
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
            {profile?.partnerNickname ?? '상대'}님이 소곤.zip을 열어주면 여기에 도착해요.
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
