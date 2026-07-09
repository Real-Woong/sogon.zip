import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { SogonFileCard } from './shared/SogonFileCard';
import { ChevronLeft, X } from 'lucide-react';
import { getSogonFiles, SogonFile, SogonFileStatus, syncRemoteData, updateSogonFile } from '../lib/sogonStore';

export function MySogonFolder() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('열릴 예정');
  const [files, setFiles] = useState<SogonFile[]>(() => getSogonFiles());
  const [editingFile, setEditingFile] = useState<SogonFile | null>(null);
  const [timingFile, setTimingFile] = useState<SogonFile | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftTiming, setDraftTiming] = useState('');

  useEffect(() => {
    syncRemoteData()
      .then(() => setFiles(getSogonFiles()))
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

  const openingOptions = ['지금 알려도 좋아요', 'D+100 열림 예정', '다음 기념일', '1년 후', '내가 직접 열게요', '열고 싶지 않아요'];

  const applyFilePatch = (file: SogonFile, patch: Partial<SogonFile>) => {
    const statusPatch: Partial<SogonFile> =
      patch.openingTime === '지금 알려도 좋아요' ? { status: 'ready' } :
      patch.openingTime === '열고 싶지 않아요' ? { status: 'closed' } :
      patch.openingTime ? { status: 'scheduled' } :
      {};
    const nextPatch = { ...patch, ...statusPatch };

    setFiles(currentFiles => currentFiles.map(currentFile =>
      currentFile.id === file.id ? { ...currentFile, ...nextPatch } : currentFile
    ));

    updateSogonFile(file.id, nextPatch);
  };

  const openEditModal = (file: SogonFile) => {
    setEditingFile(file);
    setDraftContent(file.content);
  };

  const openTimingModal = (file: SogonFile) => {
    setTimingFile(file);
    setDraftTiming(file.openingTime);
  };

  const renderSavedFile = (file: SogonFile) => (
    <SogonFileCard
      key={file.id}
      title={file.tags[0] ?? '기타'}
      status={file.status === 'ready' ? 'ready' : file.status === 'opened' ? 'opened' : 'locked'}
      contentPreview={file.content}
      openDate={file.openingTime}
      sensitivity={file.sensitivity}
      recommendationOn={file.recommendationOn}
    >
      {file.status === 'ready' ? (
        <button
          onClick={() => navigate('/unzip')}
          className="w-full bg-[color:var(--lavender)] text-white py-3 rounded-xl hover:bg-[color:var(--lavender)]/90 transition-colors"
        >
          소곤.zip 압축해제
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
        </div>
      )}
    </SogonFileCard>
  );

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="bg-white border-b border-[color:var(--border)]">
        <div className="grid grid-cols-[44px_1fr_44px] items-center px-6 py-6">
          <button
            type="button"
            aria-label="홈으로 돌아가기"
            onClick={() => navigate('/home')}
            className="z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--gray-light)] transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[color:var(--navy)]" />
          </button>
          <h1 className="text-center text-xl font-bold text-[color:var(--navy)]">
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

      {(editingFile || timingFile) && (
        <div className="absolute inset-0 z-20 flex items-end bg-[rgba(45,39,56,0.28)]">
          <div className="w-full rounded-t-[2rem] bg-white p-6 shadow-[0_-18px_40px_rgba(45,39,56,0.18)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-[color:var(--navy)]">
                {editingFile ? '소곤.zip 수정' : '열리는 시점 변경'}
              </h2>
              <button
                onClick={() => {
                  setEditingFile(null);
                  setTimingFile(null);
                }}
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
              <select
                value={draftTiming}
                onChange={(event) => setDraftTiming(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-4 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--lavender)]"
              >
                {openingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                if (editingFile) {
                  applyFilePatch(editingFile, { content: draftContent.trim() || editingFile.content });
                }
                if (timingFile) {
                  applyFilePatch(timingFile, { openingTime: draftTiming });
                }
                setEditingFile(null);
                setTimingFile(null);
              }}
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
