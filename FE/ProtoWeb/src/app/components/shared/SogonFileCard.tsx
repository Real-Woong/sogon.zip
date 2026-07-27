import { Lock, Gift } from 'lucide-react';
import { ZipBadge } from './ZipBadge';

interface SogonFileCardProps {
  title: string;
  status: 'locked' | 'opened' | 'ready';
  contentPreview?: string;
  openDate?: string;
  sensitivity?: string;
  recommendationOn?: boolean;
  reactions?: number;
  children?: React.ReactNode;
}

export function SogonFileCard({
  title,
  status,
  contentPreview,
  openDate,
  sensitivity,
  recommendationOn,
  reactions,
  children
}: SogonFileCardProps) {
  const bgColor = status === 'opened' ? 'bg-[color:var(--yellow)]/20' : 'bg-white';

  return (
    <div className={`${bgColor} rounded-2xl p-4 border border-[color:var(--border)] shadow-sm`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-lg">📄</span>
          <h3 className="min-w-0 break-words font-medium text-[color:var(--navy)]">{title}</h3>
          <ZipBadge />
        </div>
        {status === 'locked' && <Lock className="h-4 w-4 shrink-0 text-[color:var(--gray)]" />}
        {status === 'opened' && <Gift className="h-4 w-4 shrink-0 text-[color:var(--lavender)]" />}
      </div>

      <div className="space-y-1.5 text-sm text-[color:var(--gray)]">
        {status === 'locked' && <p>🔒 아직 닫혀 있어요</p>}
        {status === 'opened' && <p>🎁 열림 완료</p>}
        {contentPreview && (
          <p className="line-clamp-2 text-[color:var(--navy)]">{contentPreview}</p>
        )}
        {openDate && <p>{openDate}</p>}
        {sensitivity && <p>민감도 {sensitivity}</p>}
        {recommendationOn !== undefined && (
          <p>추천 반영 {recommendationOn ? 'ON' : 'OFF'}</p>
        )}
        {reactions !== undefined && reactions > 0 && (
          <p>반응 {reactions}개</p>
        )}
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
