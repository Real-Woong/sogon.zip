import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BottomNav } from './shared/BottomNav';
import { Sparkles, RefreshCw, Check } from 'lucide-react';
import { getUserPreferences } from '../lib/sogonStore';

export function RecommendationZip() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('밥');
  const [rerollCount, setRerollCount] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(false);
  const preferences = getUserPreferences();
  const preferenceHint = preferences[0]?.text ?? '내 취향을 MY에서 입력하면 추천.zip이 더 정확해져요.';

  const categories = ['밥', '카페', '실내', '산책', '랜덤'];
  const recommendationSets: Record<string, string[][]> = {
    밥: [
      ['조용한 파스타집', '따뜻한 수프 나눠먹기', '근처 카페에서 디저트'],
      ['맵지 않은 일식집', '작은 골목 산책', '편의점 아이스크림으로 마무리']
    ],
    카페: [
      ['창가 자리 있는 카페', '서로 저장한 취향 얘기하기', '디저트 하나 나눠먹기'],
      ['조용한 북카페', '각자 좋아하는 문장 고르기', '다음 데이트 메모하기']
    ],
    실내: [
      ['작은 전시 보기', '굿즈샵 구경하기', '따뜻한 차 마시기'],
      ['보드게임 카페', '가벼운 내기하기', '포토부스에서 사진 남기기']
    ],
    산책: [
      ['강변 산책', '벤치에서 쉬기', '야경 보고 돌아오기'],
      ['동네 공원 한 바퀴', '편의점 음료 고르기', '서로 오늘 좋았던 점 말하기']
    ],
    랜덤: [
      ['즉흥 동네 탐색', '처음 보는 메뉴 고르기', '마음에 든 장소 저장하기'],
      ['서로 10분씩 코스 정하기', '랜덤 디저트 고르기', '다음 소곤.zip 만들기']
    ]
  };
  const recommendations = recommendationSets[selectedCategory][rerollCount % recommendationSets[selectedCategory].length];

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
          카테고리는 압축해제할 추천.zip의 종류예요. 고르면 내 취향 DB와 서연의 소곤.zip을 그 방향으로 다시 풀어요.
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSelectedCourse(false);
                setRerollCount(0);
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
        {/* Recommendation card */}
        <div className="bg-gradient-to-br from-[color:var(--lavender)]/10 to-white rounded-3xl p-6 border-2 border-[color:var(--lavender)]/30 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="font-bold text-[color:var(--navy)]">{selectedCategory} 추천.zip 압축해제 결과</h3>
          </div>

          <div className="space-y-3 mb-4">
            {recommendations.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-[color:var(--lavender)]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[color:var(--lavender)]">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-[color:var(--navy)]">{item}</p>
              </div>
            ))}
          </div>

          <div className="bg-[color:var(--lavender)]/5 rounded-xl p-3 text-sm text-[color:var(--gray)] text-center">
            {selectedCategory} 기준으로 취향 압축파일을 풀었어요.
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

        {/* Action buttons */}
        <div className="space-y-3">
          {selectedCourse ? (
            <div className="rounded-2xl bg-[color:var(--mint)]/35 p-4 text-center text-sm font-bold text-[color:var(--navy)]">
              이 코스를 오늘의 데이트로 저장했어요.
            </div>
          ) : null}
          <button
            onClick={() => {
              setRerollCount(count => count + 1);
              setSelectedCourse(false);
            }}
            className="w-full bg-white text-[color:var(--navy)] py-4 rounded-2xl border-2 border-[color:var(--border)] hover:border-[color:var(--lavender)] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            추천.zip 다시 압축해제
          </button>
          <button
            onClick={() => setSelectedCourse(true)}
            className="w-full bg-[color:var(--lavender)] text-white py-4 rounded-2xl shadow-sm hover:bg-[color:var(--lavender)]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            이 코스로 저장하기
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
