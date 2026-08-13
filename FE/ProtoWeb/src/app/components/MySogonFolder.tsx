import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { ScreenHeader } from './shared/ScreenHeader';
import { SogonFileCard } from './shared/SogonFileCard';
import { MessagesSquare, Trash2, X } from 'lucide-react';
import {
  deleteSogonFile,
  getMySogonFiles,
  getSogonLog,
  openedMoment,
  SogonFile,
  SogonFilePatch,
  SogonFileStatus,
  syncRemoteData,
  updateSogonFile
} from '../lib/sogonStore';
import { useSession } from '../lib/session';
import {
  CUSTOM_DATE_LABEL,
  describeOpening,
  OPENING_OPTIONS
} from '../../../../../shared/sogonOpening';

/** 소곤거림 로그의 날짜 머리말. 오늘/어제는 숫자보다 말이 빠르다. */
function logDayLabel(iso: string) {
  const date = new Date(iso);
  const key = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (key(date) === key(today)) return '오늘';
  if (key(date) === key(yesterday)) return '어제';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul'
  }).format(date);
}

function logTimeLabel(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  }).format(new Date(iso));
}

const SOGON_LOG_TAB = '소곤거림';

export function MySogonFolder() {
  const navigate = useNavigate();
  const { profile } = useSession();
  const [activeTab, setActiveTab] = useState('열릴 예정');
  // 내 소곤폴더에는 내가 쓴 파일만 들어온다. 상대 파일은 열린 것만, 기록 화면에서 보인다.
  const [files, setFiles] = useState<SogonFile[]>(() => getMySogonFiles());
  // 소곤거림 탭만 예외다. 여기는 **둘이** 열어본 것을 시간순으로 함께 본다.
  const [log, setLog] = useState<SogonFile[]>(() => getSogonLog());
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
      .then(() => {
        setFiles(getMySogonFiles());
        setLog(getSogonLog());
      })
      .catch(() => undefined);
  }, []);

  const tabs = ['열릴 예정', '열 준비됨', '열림', '닫아둠', SOGON_LOG_TAB];
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

  /**
   * 둘이 열어본 소곤.zip을 시간순으로 쌓는다. 다른 탭은 전부 "내 것"만 보지만
   * 여기만 둘의 기록이 한 줄로 합쳐진다 — 열린 파일은 이미 서로에게 공개된
   * 것이라 절대 규칙 1을 건드리지 않는다.
   */
  const renderSogonLog = () => {
    if (log.length === 0) {
      return (
        <div className="py-12 text-center text-[color:var(--gray)]">
          <MessagesSquare className="mx-auto h-9 w-9 text-[color:var(--lavender)]" />
          <p className="mt-4 break-keep font-black text-[color:var(--navy)]">
            아직 주고받은 소곤거림이 없어요
          </p>
          <p className="mt-2 break-keep text-sm leading-relaxed">
            소곤.zip을 열면 그 순간부터 여기에 한 줄씩 쌓여요.
          </p>
        </div>
      );
    }

    let lastDay = '';
    return (
      <div className="space-y-3">
        {log.map(file => {
          const moment = openedMoment(file);
          const day = logDayLabel(moment);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = file.isMine !== false;
          const from = mine ? profile?.nickname ?? '나' : profile?.partnerNickname ?? '상대';
          const to = mine ? profile?.partnerNickname ?? '상대' : profile?.nickname ?? '나';

          return (
            <div key={`log-${file.id}`}>
              {showDay ? (
                <div className="mb-3 mt-5 flex items-center gap-3 first:mt-0">
                  <span className="h-px flex-1 bg-[color:var(--border)]" />
                  <span className="text-[11px] font-black text-[color:var(--gray)]">{day}</span>
                  <span className="h-px flex-1 bg-[color:var(--border)]" />
                </div>
              ) : null}

              <article
                className={`rounded-3xl p-4 shadow-sm ring-1 ${
                  mine
                    ? 'ml-6 bg-[color:var(--blush)]/55 ring-[color:var(--pink)]/50'
                    : 'mr-6 bg-white ring-[color:var(--lavender)]/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-black text-[color:var(--coral-deep)]">
                    {from} → {to}
                  </p>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-[color:var(--gray)]">
                    {file.openedAt ? logTimeLabel(moment) : '시각 미상'}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[color:var(--navy)]">
                  {file.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-sm">{file.sensitivity}</span>
                  {file.tags.map(tag => (
                    <span
                      key={`${file.id}-${tag}`}
                      className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-[color:var(--gray)] ring-1 ring-[color:var(--border)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      <div className="shrink-0 bg-white/92 backdrop-blur-xl">
        <ScreenHeader title="내 소곤폴더" backTo="/home" backLabel="홈으로 돌아가기" />

        {/* Tabs */}
        <div data-tour="folder-tabs" className="grid grid-cols-5 gap-1 px-3 pb-2 pt-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-w-0 whitespace-nowrap rounded-full px-1 py-2 text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[color:var(--lavender-light)] text-[color:var(--lavender)]'
                  : 'text-[color:var(--gray)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div data-tour="folder-list" className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
        {activeTab === SOGON_LOG_TAB ? renderSogonLog() : visibleFiles.map(renderSavedFile)}

        {activeTab !== SOGON_LOG_TAB && visibleFiles.length === 0 && (
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
