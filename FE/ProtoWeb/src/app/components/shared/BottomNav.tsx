import { useNavigate, useLocation } from 'react-router';
import { Calendar, FolderHeart, Heart, Sparkles, User } from 'lucide-react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Heart, label: '홈', path: '/home' },
    { icon: FolderHeart, label: '소곤.zip', path: '/my-folder' },
    { icon: Sparkles, label: '추천', path: '/recommendation' },
    { icon: Calendar, label: '기록', path: '/record' },
    { icon: User, label: 'MY', path: '/plus' }
  ];

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto grid grid-cols-5 rounded-[1.65rem] border border-white/80 bg-white/94 p-1.5 shadow-[0_10px_32px_rgba(77,61,91,0.16)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[color:var(--gray)] transition-transform active:scale-95"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-[color:var(--blush)] text-[color:var(--coral-deep)]'
                    : 'text-[color:var(--gray)]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={`text-[10px] font-black leading-none ${isActive ? 'text-[color:var(--coral-deep)]' : 'text-[color:var(--gray)]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
