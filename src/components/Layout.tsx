import React from 'react';
import { NavLink, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Store, Utensils, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const city = searchParams.get('city');
  const searchStr = city ? `?city=${encodeURIComponent(city)}` : '';

  return (
    <div className="flex flex-col h-screen w-full max-w-3xl mx-auto bg-secondary relative pb-[env(safe-area-inset-bottom)]">
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Outlet />
      </main>

      <nav className="absolute bottom-0 left-0 right-0 h-16 bg-primary border-t border-theme shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex items-center justify-around px-4 z-50">
        <NavLink to={`/shops${searchStr}`} className={() => cn(
          "flex flex-col items-center justify-center w-1/3 h-full transition-colors",
          location.pathname === '/shops' ? "text-accent font-medium" : "text-tertiary"
        )}>
          <Store className="w-6 h-6 mb-1" />
          <span className="text-xs">商家榜</span>
        </NavLink>

        <div className="w-1/3 flex justify-center relative -top-4">
          <button
            onClick={() => navigate(`/add?type=${location.pathname === '/dishes' ? 'dish' : 'shop'}${city ? `&city=${encodeURIComponent(city)}` : ''}`)}
            className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        <NavLink to={`/dishes${searchStr}`} className={() => cn(
          "flex flex-col items-center justify-center w-1/3 h-full transition-colors",
          location.pathname === '/dishes' ? "text-accent font-medium" : "text-tertiary"
        )}>
          <Utensils className="w-6 h-6 mb-1" />
          <span className="text-xs">餐品榜</span>
        </NavLink>
      </nav>
    </div>
  );
}
