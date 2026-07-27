import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { SogonFileCard } from './shared/SogonFileCard';
import { ChevronLeft, Trash2, X } from 'lucide-react';
import {
  deleteSogonFile,
  getMySogonFiles,
  SogonFile,
  SogonFilePatch,
  SogonFileStatus,
  syncRemoteData,
  updateSogonFile
} from '../lib/sogonStore';
import {
  CUSTOM_DATE_LABEL,
  describeOpening,
  OPENING_OPTIONS
} from '../../../../../shared/sogonOpening';

export function MySogonFolder() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('열릴 예정');
  // 내 소곤폴더에는 내가 쓴 파일만 들어온다. 상대 파일은 열린 것만, 기록 화면에서 보인다.
  const [files, setFiles] = useState<SogonFile[]>(() => getMySogonFiles());
  const [editingFile, setEditingFile] = useState<SogonFile | null>(null);
  const [timingFile, setTimingFile] = useState<SogonFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<SogonFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftTiming, setDraftTiming] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    syncRemoteData()
      .then(() => setFiles(getMySogonFiles()))
      .catch(() => undefined);
  }, []);

  const tabs = ['열릴 예정', '열 준비됨', '열림', '닫아둠'];
  const tabStatus: Record<string, SogonFileStatus> = {
    '열릴 예정': 'scheduled',
    '열 준비됨': 'ready',
    '열림': 'opened',
    '닫아둠': 'closed'
  };
  const visibleFiles = files.filter(file => file.status === tabStatus[activeTab]);

  const applyFilePatch = async (file: SogonFile, patch: SogonFilePatch) => {
    setError('');
    try {
      // 상태와 개봉 시각의 최종 판단은 서버가 한다.
      await updateSogonFile(file.id, patch);
      setFiles(getMySogonFiles());
      return true;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '수정하지 못했어요.');
      return false;
    }
  };

  const openEditModal = (file: SogonFile) => {
    setEditingFile(file);
    setDraftContent(file.content);
    setError('');
  };

  const openTimingModal = (file: SogonFile) => {
    setTimingFile(file);
    setDraftTiming(file.openingTime);
    setDraftDate(file.openingAt ? file.openingAt.slice(0, 10) : '');
    setError('');
  };

  const closeModals = () => {
    setEditingFile(null);
    setTimingFile(null);
    setDeletingFile(null);
    setError('');
  };

  const handleDelete = async () => {
    if (!deletingFile || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await deleteSogonFile(deletingFile.id);
      setFiles(getMySogonFiles());
      closeModals();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '지우지 못했어요.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalSave = async () => {
    if (editingFile) {
      const saved = await applyFilePatch(editingFile, {
        content: draftContent.trim() || editingFile.content
      });
      if (!saved) {
        return;
      }
    }
    if (timingFile) {
      if (draftTiming === CUSTOM_DATE_LABEL && !draftDate) {
        setError('열릴 날짜를 골라주세요.');
        return;
      }
      const saved = await applyFilePatch(timingFile, {
        openingTime: draftTiming,
        openingAt: draftTiming === CUSTOM_DATE_LABEL ? draftDate : null
      });
      if (!saved) {
        return;
      }
    }
    closeModals();
  };

  const renderSavedFile = (file: SogonFile) => (
    <SogonFileCard
      key={file.id}
      title={file.tags[0] ?? '기타'}
      status={file.status === 'ready' ? 'ready' : file.status === 'opened' ? 'opened' : 'locked'}
      contentPreview={file.content}
      openDate={describeOpening(file)}
      sensitivity={file.sensitivity}
      recommendationOn={file.recommendationOn}
    >
      {file.status === 'ready' ? (
        <div className="space-y-2">
          <button
            onClick={() => navigate(`/unzip?file=${encodeURIComponent(file.id)}`)}
            className="w-full bg-[color:var(--lavender)] text-white py-3 rounded-xl hover:bg-[color:var(--lavender)]/90 transition-colors"
          >
            소곤.zip 압축해제
          </button>
          <button
            onClick={() => setDeletingFile(file)}
            className="flex w-full items-center justify-center gap-1 py-2 text-sm text-[color:var(--gray)] transition-colors hover:text-[color:var(--coral-deep)]"
          >
            <Trash2 className="h-4 w-4" />
            지우기
          </button>
        </div>
      ) : file.status === 'opened' ? (
        <button
          onClick={() => setDeletingFile(file)}
          className="flex w-full items-center justify-center gap-1 py-2 text-sm text-[color:var(--gray)] transition-colors hover:text-[color:var(--coral-deep)]"
        >
          <Trash2 className="h-4 w-4" />
          기록에서 지우기
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(file)}
            className="flex-1 bg-[color:var(--gray-light)] text-[color:var(--navy)] py-2 rounded-lg text-sm hover:bg-[color:var(--gray-light)]/80 transition-colors"
          >
            수정
          </button>
          <button
            onClick={() => openTimingModal(file)}
            className="flex-1 bg-[color:var(--gray-light)] text-[color:var(--navy)] py-2 rounded-lg text-sm hover:bg-[color:var(--gray-light)]/80 transition-colors"
          >
            시점 변경
          </button>
          <button
            onClick={() => setDeletingFile(file)}
            aria-label="소곤파일 지우기"
            className="grid w-11 place-items-center rounded-lg bg-[color:var(--gray-light)] text-[color:var(--gray)] transition-colors hover:bg-[color:var(--blush)] hover:text-[color:var(--coral-deep)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </SogonFileCard>
  );

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="bg-white border-b border-[color:var(--border)]">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center px-4 py-4 sm:px-6 sm:py-6">
          <button
            type="button"
            aria-label="홈으로 돌아가기"
            onClick={() => navigate('/home')}
            className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
          </button>
          <h1 className="break-keep text-center text-lg font-bold leading-tight text-[color:var(--navy)] sm:text-xl">
            내 소곤폴더
          </h1>
          <div />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-2 whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'text-[color:var(--lavender)] border-b-2 border-[color:var(--lavender)] font-medium'
                  : 'text-[color:var(--gray)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
        {visibleFiles.map(renderSavedFile)}

        {visibleFiles.length === 0 && (
          <div className="text-center py-12 text-[color:var(--gray)]">
            <p className="text-4xl mb-4">📦</p>
            <p>{activeTab} 소곤.zip이 없어요</p>
            <button
              onClick={() => navigate('/create-file')}
              className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[color:var(--navy)] ring-1 ring-[color:var(--border)]"
            >
              새 소곤.zip 만들기
            </button>
          </div>
        )}
      </div>

      {deletingFile && (
        <div className="absolute inset-0 z-20 flex items-end bg-[rgba(45,39,56,0.28)]">
          <div className="max-h-[calc(100%-1rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(45,39,56,0.18)]">
            <h2 className="text-lg font-black text-[color:var(--navy)]">
              이 소곤.zip을 지울까요?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--gray)]">
              {deletingFile.status === 'opened'
                ? '이미 열어서 함께 본 기록이에요. 지우면 상대의 기록.zip에서도 사라지고, 되돌릴 수 없어요.'
                : '지우면 되돌릴 수 없어요.'}
            </p>
            <div className="mt-4 rounded-2xl bg-[color:var(--cream)] px-4 py-3">
              <p className="text-xs font-bold text-[color:var(--gray)]">
                {deletingFile.tags[0] ?? '기타'}.zip
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[color:var(--navy)]">
                {deletingFile.content}
              </p>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
                {error}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full rounded-2xl bg-[color:var(--coral-deep)] py-4 font-bold text-white disabled:opacity-50"
              >
                {isDeleting ? '지우는 중...' : '지우기'}
              </button>
              <button
                onClick={closeModals}
                className="w-full rounded-2xl bg-[color:var(--gray-light)] py-4 font-bold text-[color:var(--navy)]"
              >
                그대로 둘래요
              </button>
            </div>
          </div>
        </div>
      )}

      {(editingFile || timingFile) && (
        <div className="absolute inset-0 z-20 flex items-end bg-[rgba(45,39,56,0.28)]">
          <div className="max-h-[calc(100%-1rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(45,39,56,0.18)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-[color:var(--navy)]">
                {editingFile ? '소곤.zip 수정' : '열리는 시점 변경'}
              </h2>
              <button
                onClick={closeModals}
                className="rounded-full bg-[color:var(--gray-light)] p-2 text-[color:var(--gray)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editingFile ? (
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                className="h-32 w-full resize-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-3 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              />
            ) : (
              <>
                <select
                  value={draftTiming}
                  onChange={(event) => {
                    setDraftTiming(event.target.value);
                    setError('');
                  }}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                >
                  {OPENING_OPTIONS.map(option => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>

                {draftTiming === CUSTOM_DATE_LABEL ? (
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(event) => {
                      setDraftDate(event.target.value);
                      setError('');
                    }}
                    className="mt-3 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
                  />
                ) : null}
              </>
            )}

            {error ? (
              <p className="mt-4 rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
                {error}
              </p>
            ) : null}

            <button
              onClick={handleModalSave}
              className="sogon-primary-button mt-5 w-full font-bold"
            >
              저장하기
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
