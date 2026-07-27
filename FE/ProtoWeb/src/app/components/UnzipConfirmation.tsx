import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, Lock } from 'lucide-react';
import { getMySogonFiles, updateSogonFile } from '../lib/sogonStore';
import { isOpenable } from '../../../../../shared/sogonOpening';

export function UnzipConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // 내 파일 중에서만 고른다. 목록에서 고른 파일이 있으면 그 파일을, 없으면
  // 지금 열 수 있는 첫 파일을 연다.
  const myFiles = getMySogonFiles();
  const requestedId = searchParams.get('file');
  const file = requestedId
    ? myFiles.find(sogonFile => sogonFile.id === requestedId)
    : myFiles.find(sogonFile => isOpenable(sogonFile));

  const openFile = async () => {
    if (!file) {
      navigate('/my-folder');
      return;
    }

    setIsOpening(true);
    setError('');

    try {
      await updateSogonFile(file.id, { status: 'opened' });
      navigate('/record');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '열지 못했어요.');
      setIsOpening(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-[color:var(--border)] bg-white px-4 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          aria-label="내 소곤폴더로 돌아가기"
          onClick={() => navigate('/my-folder')}
          className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
        </button>
        <h1 className="break-keep text-center text-lg font-bold leading-tight text-[color:var(--navy)] sm:text-xl">
          내 소곤.zip 압축해제
        </h1>
        <div />
      </div>

      {file ? (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32">
        <div className="text-center">
          <h2 className="mb-2 break-keep text-xl font-bold leading-tight text-[color:var(--navy)]">
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
            <h3 className="text-lg font-bold text-[color:var(--navy)]">{file.tags[0] ?? '소곤'}.zip</h3>
          </div>

          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-[color:var(--navy)] italic">
              "{file.content}"
            </p>
          </div>

          <div className="flex items-start gap-2 text-sm text-[color:var(--gray)]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
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
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-5xl mb-5">📦</p>
          <h2 className="text-xl font-black text-[color:var(--navy)]">열 준비된 소곤.zip이 없어요</h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
            내 소곤폴더에서 열 수 있는 파일이 생기면 여기서 확인할 수 있어요.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 space-y-3 border-t border-[color:var(--border)] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        {error ? (
          <p className="rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
            {error}
          </p>
        ) : null}
        <button
          onClick={openFile}
          disabled={isOpening}
          className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors disabled:opacity-50"
        >
          {file ? (isOpening ? '여는 중...' : '소곤.zip 압축해제') : '내 소곤폴더로 가기'}
        </button>
        {file ? (
          <button
            onClick={() => navigate('/my-folder')}
            className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all"
          >
          수정하고 열기
          </button>
        ) : null}
      </div>
    </div>
  );
}
