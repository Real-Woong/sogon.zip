import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

type ScreenHeaderProps = {
  title: string;
  backTo?: string;
  backLabel?: string;
};

export function ScreenHeader({
  title,
  backTo,
  backLabel = '이전 화면으로 돌아가기'
}: ScreenHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="shrink-0 border-b border-[color:var(--border)] bg-white/92 px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
      <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        {backTo ? (
          <button
            type="button"
            aria-label={backLabel}
            onClick={() => navigate(backTo)}
            className="grid h-11 w-11 place-items-center rounded-2xl text-[color:var(--navy)] transition-colors hover:bg-[color:var(--gray-light)] active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <h1 className="break-keep text-center text-lg font-black leading-tight text-[color:var(--navy)]">
          {title}
        </h1>
        <span aria-hidden="true" />
      </div>
    </header>
  );
}
