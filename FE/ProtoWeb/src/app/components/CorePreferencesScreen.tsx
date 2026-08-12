import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, HeartHandshake, Sparkles } from 'lucide-react';
import { CORE_PREFERENCE_OPTIONS } from '../../../../../shared/corePreferences';
import {
  getCorePreferences,
  saveCorePreferenceAnswer,
  type CorePreferenceStatus
} from '../lib/sogonStore';
import { ScreenHeader } from './shared/ScreenHeader';

export function CorePreferencesScreen() {
  const [status, setStatus] = useState<CorePreferenceStatus | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCorePreferences()
      .then(({ corePreferences }) => {
        setStatus(corePreferences);
        const firstUnanswered = corePreferences.questions.findIndex(
          question => !corePreferences.answers[question.id]
        );
        setIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : '취향 질문을 불러오지 못했어요.'));
  }, []);

  const question = status?.questions[index] ?? null;
  const selectedOption = question ? status?.answers[question.id] : null;
  const percent = status ? Math.round((status.answeredCount / status.total) * 100) : 0;
  const isLast = status ? index === status.total - 1 : false;

  const completionText = useMemo(() => {
    if (!status?.complete) return null;
    if (status.coupleReady) return '둘의 취향 준비가 끝났어요. 이제 실제 코스에 반영돼요.';
    if (status.partner) return `${status.partner.nickname}님이 답을 마치면 둘의 코스가 열려요.`;
    return '내 사람과 연결하면 둘의 취향으로 코스를 만들 수 있어요.';
  }, [status]);

  const answer = async (optionId: string) => {
    if (!question || saving) return;
    setSaving(true);
    setError('');
    try {
      const data = await saveCorePreferenceAnswer({ questionId: question.id, optionId });
      setStatus(data.corePreferences);
      if (!isLast) setIndex(current => current + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '답변을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fffafa_0%,#fff1f4_48%,#f1edff_100%)]">
      <ScreenHeader title="나의 핵심 취향" backTo="/home" />
      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
        {status && question ? (
          <div className="mx-auto w-full max-w-[366px]">
            <div className="mb-5 rounded-[1.75rem] bg-white/85 p-4 shadow-sm ring-1 ring-white">
              <div className="flex items-center justify-between text-xs font-black text-[color:var(--gray)]">
                <span>{status.answeredCount}/{status.total} 답변</span>
                <span>{percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--gray-light)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--coral),var(--yellow),var(--mint))] transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-3 break-keep text-xs leading-relaxed text-[color:var(--gray)]">
                장소 데이터로 실제 판정할 수 있는 질문만 물어요. 언제든 답을 바꿀 수 있어요.
              </p>
            </div>

            <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_46px_rgba(92,70,116,0.14)] ring-1 ring-[color:var(--pink)]/45">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[color:var(--blush)] px-3 py-1 text-xs font-black text-[color:var(--coral-deep)]">
                  {question.group}
                </span>
                <span className="text-xs font-bold text-[color:var(--gray)]">{index + 1} / {status.total}</span>
              </div>
              <Sparkles className="mt-7 h-8 w-8 text-[color:var(--coral-deep)]" />
              <h2 className="mt-4 break-keep text-2xl font-black leading-tight text-[color:var(--navy)]">
                {question.prompt}
              </h2>
              <p className="mt-3 break-keep text-sm leading-relaxed text-[color:var(--gray)]">
                {question.description}
              </p>

              <div className="mt-7 space-y-3">
                {CORE_PREFERENCE_OPTIONS.map(option => {
                  const selected = selectedOption === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={saving}
                      onClick={() => void answer(option.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-sm font-black transition ${
                        selected
                          ? 'bg-[color:var(--navy)] text-white shadow-md'
                          : 'bg-[color:var(--gray-light)] text-[color:var(--navy)] hover:bg-[color:var(--blush)]'
                      } disabled:opacity-60`}
                    >
                      <span>{option.label}</span>
                      {selected ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 opacity-50" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={index === 0 || saving}
                onClick={() => setIndex(current => Math.max(0, current - 1))}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black text-[color:var(--gray)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> 이전
              </button>
              <button
                type="button"
                disabled={isLast || saving}
                onClick={() => setIndex(current => Math.min((status?.total ?? 1) - 1, current + 1))}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black text-[color:var(--gray)] disabled:opacity-30"
              >
                다음 <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {completionText ? (
              <div className="mt-5 flex gap-3 rounded-2xl bg-[color:var(--mint)]/65 p-4 text-[color:var(--navy)]">
                <HeartHandshake className="h-5 w-5 shrink-0" />
                <p className="break-keep text-sm font-bold leading-relaxed">{completionText}</p>
              </div>
            ) : null}
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-white p-4 text-sm font-bold text-[color:var(--coral-deep)]">{error}</p>
        ) : (
          <p className="text-center text-sm font-bold text-[color:var(--gray)]">취향 질문을 준비하고 있어요...</p>
        )}
        {error && status ? (
          <p className="mx-auto mt-4 max-w-[366px] rounded-2xl bg-white p-4 text-sm font-bold text-[color:var(--coral-deep)]">{error}</p>
        ) : null}
      </main>
    </div>
  );
}
