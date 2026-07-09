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
    <nav className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] border-t border-white/70 bg-white/88 px-4 py-2 shadow-[0_-14px_35px_rgba(77,61,91,0.12)] backdrop-blur-xl">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-colors ${
                isActive ? 'bg-[color:var(--blush)] text-[color:var(--coral-deep)]' : 'text-[color:var(--gray)] hover:bg-[color:var(--gray-light)]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'text-[color:var(--coral-deep)]' : 'text-[color:var(--gray)]'}`}
              />
              <span className={`text-xs font-bold ${isActive ? 'text-[color:var(--coral-deep)]' : 'text-[color:var(--gray)]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
