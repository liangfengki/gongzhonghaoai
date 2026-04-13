'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Settings, PenLine, Shield, LogOut, Coins } from 'lucide-react';
import { useUser } from '@/lib/use-user';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const links = [
    { href: '/', label: '选题', icon: Sparkles },
    { href: '/editor', label: '编辑器', icon: PenLine },
    { href: '/settings', label: '设置', icon: Settings },
  ];

  if (user?.isAdmin) {
    links.push({ href: '/admin', label: '管理', icon: Shield });
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center text-[13px] py-1.5 font-medium">
        需要积分可以添加微信「xdklt0528」
      </div>
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
            <Sparkles className="text-white" size={17} />
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
            牧咔AI
          </span>
        </Link>

        <nav className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                <Coins size={14} />
                <span>{user.credits}</span>
              </div>
              <span className="text-sm text-gray-500">{user.username}</span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
