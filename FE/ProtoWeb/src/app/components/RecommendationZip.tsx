import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { Sparkles, Plus } from 'lucide-react';
import { getUserPreferences } from '../lib/sogonStore';

export function RecommendationZip() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('밥');
  const preferences = getUserPreferences();
  const preferenceHint = preferences[0]?.text ?? '내 취향을 MY에서 입력하면 추천.zip이 더 정확해져요.';

  const categories = ['밥', '카페', '실내', '산책', '랜덤'];

  return (
    <div className="h-full flex flex-col bg-[color:var(--cream)]">
      {/* Header */}
      <div className="px-6 py-8 bg-white border-b border-[color:var(--border)]">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[color:var(--lavender)]" />
          <h1 className="text-xl font-bold text-[color:var(--navy)]">데이트 코스 추천.zip</h1>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-4 bg-white border-b border-[color:var(--border)]">
        <p className="mb-3 text-sm leading-relaxed text-[color:var(--gray)]">
          카테고리는 추천에 사용할 취향 방향이에요. 실제 추천 로직은 저장된 취향 데이터가 쌓인 뒤 연결할 예정이에요.
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-[color:var(--lavender)] text-white'
                  : 'bg-[color:var(--gray-light)] text-[color:var(--navy)]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-6">
        <div className="bg-gradient-to-br from-[color:var(--lavender)]/10 to-white rounded-3xl p-6 border-2 border-[color:var(--lavender)]/30 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="font-bold text-[color:var(--navy)]">{selectedCategory} 추천.zip</h3>
          </div>

          <div className="mb-4 rounded-2xl bg-white p-5 text-center shadow-sm">
            <p className="text-4xl mb-3">🧭</p>
            <p className="font-bold text-[color:var(--navy)]">추천 기능 준비 중</p>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--gray)]">
              지금은 실제 취향 데이터 저장까지 먼저 검증하고 있어요.
            </p>
          </div>

          <div className="bg-[color:var(--lavender)]/5 rounded-xl p-3 text-sm text-[color:var(--gray)] text-center">
            저장된 취향 {preferences.length}개
          </div>
        </div>

        {/* Info card */}
        <div className="bg-[color:var(--yellow)]/10 rounded-2xl p-4 border border-[color:var(--yellow)]/30">
          <p className="text-sm text-[color:var(--navy)] leading-relaxed">
            💡 추천 DB: {preferenceHint}
          </p>
          <p className="mt-2 text-xs text-[color:var(--gray)]">
            저장된 내 취향 {preferences.length}개가 추천.zip에 반영돼요.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/plus')}
            className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            취향 입력하러 가기
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
