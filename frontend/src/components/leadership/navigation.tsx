'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, TrendingUp, FileText, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';

export function LeadershipNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const tabs = [
    { name: 'Overview', path: '/leadership', icon: BarChart3 },
    { name: 'Partners', path: '/leadership/partners', icon: Users },
    { name: 'Metrics', path: '/leadership/metrics', icon: TrendingUp },
    { name: 'Trends', path: '/leadership/trends', icon: TrendingUp },
    { name: 'All Implementations', path: '/leadership/implementations', icon: BarChart3 },
    { name: 'Summary', path: '/leadership/summary', icon: FileText },
    { name: 'Settings', path: '/leadership/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/leadership') {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="relative h-8 w-32">
              <Image
                src="/avni-logo.png"
                alt="Avni"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">SUPPORT OPERATIONAL DASHBOARD</h1>
          </div>

          {/* User & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <div className="font-medium text-gray-900">{user?.email}</div>
              <div className="text-xs text-gray-500">Leadership Access</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                  border-b-2 -mb-px
                  ${active 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
