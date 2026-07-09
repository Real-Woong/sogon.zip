import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { Plus, FolderHeart, Database } from 'lucide-react';
import { getUserPreferences, saveUserPreference, UserPreference } from '../lib/sogonStore';

export function PlusPlanModal() {
  const navigate = useNavigate();
  const [preferenceCategory, setPreferenceCategory] = useState('밥');
  const [preferenceText, setPreferenceText] = useState('');
  const [preferences, setPreferences] = useState<UserPreference[]>(() => getUserPreferences());

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-br from-[color:var(--lavender)] to-[color:var(--pink)] text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Database className="w-6 h-6" />
          <h1 className="text-2xl font-bold">MY</h1>
        </div>
        <p className="text-center text-white/90 text-sm">
          내 취향과 소곤.zip을 관리해요.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-[color:var(--mint)]/50">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--mint)]/45 text-[color:var(--navy)]">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--gray)]">RECOMMEND DB</p>
              <h2 className="text-lg font-black text-[color:var(--navy)]">내 취향 넣기</h2>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-[color:var(--gray)]">
            데이트 코스 추천.zip을 압축해제할 때 쓸 내 취향 데이터예요.
          </p>
          <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {['밥', '카페', '실내', '산책', '선물'].map(category => (
              <button
                key={category}
                onClick={() => setPreferenceCategory(category)}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  preferenceCategory === category
                    ? 'bg-[color:var(--coral)] text-white'
                    : 'bg-[color:var(--gray-light)] text-[color:var(--navy)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <textarea
            value={preferenceText}
            onChange={(event) => setPreferenceText(event.target.value)}
            placeholder="예: 매운 음식보다 담백한 일식이 좋아."
            className="h-24 w-full resize-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--cream)] px-4 py-3 text-[color:var(--navy)] outline-none focus:ring-2 focus:ring-[color:var(--coral)]"
          />
          <button
            onClick={() => {
              if (!preferenceText.trim()) {
                return;
              }

              const savedPreference = saveUserPreference({
                category: preferenceCategory,
                text: preferenceText.trim()
              });
              setPreferences(current => [savedPreference, ...current]);
              setPreferenceText('');
            }}
            className="sogon-primary-button mt-3 flex w-full items-center justify-center gap-2 font-bold"
          >
            <Plus className="h-5 w-5" />
            취향 DB에 압축하기
          </button>
          {preferences.length > 0 ? (
            <div className="mt-4 space-y-2">
              {preferences.slice(0, 3).map(preference => (
                <div key={preference.id} className="rounded-2xl bg-[color:var(--gray-light)] px-4 py-3">
                  <p className="text-xs font-bold text-[color:var(--coral-deep)]">{preference.category}</p>
                  <p className="text-sm text-[color:var(--navy)]">{preference.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-[color:var(--pink)]/40">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--blush)] text-[color:var(--coral-deep)]">
              <FolderHeart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--coral-deep)]">MY SOGON</p>
              <h2 className="text-lg font-black text-[color:var(--navy)]">내 소곤.zip 만들기</h2>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-[color:var(--gray)]">
            상대에게 언젠가 열어줄 마음은 소곤.zip으로 따로 압축해요.
          </p>
          <button
            onClick={() => navigate('/create-file')}
            className="sogon-primary-button flex w-full items-center justify-center gap-2 font-bold"
          >
            <Plus className="h-5 w-5" />
            새 소곤.zip 압축하기
          </button>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
