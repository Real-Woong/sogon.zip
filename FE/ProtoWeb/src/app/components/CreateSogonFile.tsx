import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { saveSogonFile } from '../lib/sogonStore';
import {
  CUSTOM_DATE_LABEL,
  DEFAULT_OPENING_LABEL,
  findOpeningOption,
  OPENING_OPTIONS
} from '../../../../../shared/sogonOpening';

function todayInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CreateSogonFile() {
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [sensitivity, setSensitivity] = useState(2);
  const [openingTime, setOpeningTime] = useState(DEFAULT_OPENING_LABEL);
  const [customDate, setCustomDate] = useState('');
  const [recommendationOn, setRecommendationOn] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tags = ['음식', '알레르기', '카페', '데이트 취향', '취미', '선물', '비밀', '직접 추가'];
  const sensitivities = ['😄', '😀', '🙂', '🙁', '😣'];
  const needsCustomDate = openingTime === CUSTOM_DATE_LABEL;
  const canSave = Boolean(content.trim()) && (!needsCustomDate || Boolean(customDate)) && !isSaving;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await saveSogonFile({
        tags: selectedTags.length > 0 ? selectedTags : ['기타'],
        content: content.trim(),
        sensitivity: sensitivities[sensitivity],
        openingTime,
        openingAt: needsCustomDate ? customDate : null,
        recommendationOn
      });
      navigate('/my-folder');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '저장하지 못했어요.');
      setIsSaving(false);
    }
  };

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
          새 소곤.zip 압축하기
        </h1>
        <div />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-28">
        <p className="text-sm text-[color:var(--gray)] text-center leading-relaxed">
          언젠가 알려주고 싶은 취향이나 마음을<br />
          조용히 저장해보세요.
        </p>

        {/* File tag */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3">
            소곤.zip 태그
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-[color:var(--lavender)] text-white'
                    : 'bg-white text-[color:var(--navy)] border border-[color:var(--border)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* File content */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3">
            압축할 내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상대에게 언젠가 열어주고 싶은 내용을 적어주세요."
            className="w-full h-32 px-4 py-3 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] resize-none text-[color:var(--navy)]"
          />
        </div>

        {/* Sensitivity */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3">
            민감도
          </label>
          <div className="flex gap-3 justify-center">
            {sensitivities.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => setSensitivity(idx)}
                className={`text-3xl transition-all ${
                  sensitivity === idx ? 'scale-125' : 'opacity-40 hover:opacity-70'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Opening timing */}
        <div>
          <label className="block text-sm font-medium text-[color:var(--navy)] mb-3">
            열리는 시점
          </label>
          <select
            value={openingTime}
            onChange={(e) => {
              setOpeningTime(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-3 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
          >
            {OPENING_OPTIONS.map(option => (
              <option key={option.label} value={option.label}>{option.label}</option>
            ))}
          </select>

          {needsCustomDate ? (
            <input
              type="date"
              value={customDate}
              min={todayInputValue()}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setError('');
              }}
              className="mt-3 w-full px-4 py-3 bg-white rounded-xl border border-[color:var(--border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lavender)] text-[color:var(--navy)]"
            />
          ) : null}

          <p className="mt-2 text-xs text-[color:var(--gray)]">
            {findOpeningOption(openingTime)?.hint}
          </p>
        </div>

        {/* Recommendation reflection */}
        <div className="bg-white rounded-xl p-4 border border-[color:var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[color:var(--navy)] mb-1">추천에 반영하기</p>
              <p className="text-xs text-[color:var(--gray)]">
                상대에게 열리기 전에도, 추천에는 조심스럽게 반영돼요.
              </p>
            </div>
            <button
              onClick={() => setRecommendationOn(!recommendationOn)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                recommendationOn ? 'bg-[color:var(--lavender)]' : 'bg-[color:var(--gray-light)]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  recommendationOn ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[color:var(--border)] space-y-3">
        {error ? (
          <p className="rounded-2xl bg-[color:var(--blush)]/60 px-4 py-3 text-sm font-semibold text-[color:var(--coral-deep)]">
            {error}
          </p>
        ) : null}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '압축하는 중...' : '소곤.zip으로 압축하기'}
        </button>
      </div>
    </div>
  );
}
