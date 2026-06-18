import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Lock } from 'lucide-react';

export function UnzipConfirmation() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-6 py-6 border-b border-[color:var(--border)] bg-white">
        <button
          type="button"
          aria-label="내 소곤폴더로 돌아가기"
          onClick={() => navigate('/my-folder')}
          className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
        </button>
        <h1 className="text-center text-xl font-bold text-[color:var(--navy)]">
          내 소곤.zip 압축해제
        </h1>
        <div />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[color:var(--navy)] mb-2">
            오늘 압축해제할 소곤.zip이 있어요
          </h2>
          <p className="text-sm text-[color:var(--gray)]">
            상대에게 보여주기 전에<br />
            마지막으로 확인해주세요.
          </p>
        </div>

        {/* File preview */}
        <div className="bg-gradient-to-br from-[color:var(--lavender-light)] to-white rounded-3xl p-6 border-2 border-[color:var(--lavender)] shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📄</span>
            <h3 className="text-lg font-bold text-[color:var(--navy)]">음식취향.zip</h3>
          </div>

          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-[color:var(--navy)] italic">
              "사실 나는 매운 음식을 잘 못 먹어."
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-[color:var(--gray)]">
            <Lock className="w-4 h-4" />
            <span>열기 전까지 상대는 이 내용을 볼 수 없어요</span>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3">
            함께 보낼 메시지
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="우리 벌써 100일 만났네. 사랑해."
            className="w-full h-24 px-4 py-3 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] resize-none text-[color:var(--navy)]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[color:var(--border)] space-y-3">
        <button
          onClick={() => navigate('/record')}
          className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors"
        >
          소곤.zip 압축해제
        </button>
        <button className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all">
          수정하고 열기
        </button>
        <div className="flex gap-3">
          <button className="flex-1 text-sm text-[color:var(--gray)] py-3 rounded-xl hover:bg-[color:var(--gray-light)] transition-colors">
            다음 기념일로 미루기
          </button>
          <button className="flex-1 text-sm text-[color:var(--gray)] py-3 rounded-xl hover:bg-[color:var(--gray-light)] transition-colors">
            아직 닫아두기
          </button>
        </div>
      </div>
    </div>
  );
}
