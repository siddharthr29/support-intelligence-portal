'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart3, Users, TrendingUp, FileText, LogOut, Settings, ChevronDown, Activity, Bug } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LeadershipNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Overview', href: '/leadership', icon: BarChart3 },
    { 
      label: 'Analytics',
      icon: TrendingUp,
      children: [
        { label: 'Partners', href: '/leadership/partners', icon: Users },
        { label: 'Metrics', href: '/leadership/metrics', icon: Activity },
        { label: 'Trends', href: '/leadership/trends', icon: TrendingUp },
        { label: 'RFT Metrics', href: '/rft', icon: Activity },
        { label: 'Sync Performance', href: '/sync-performance', icon: Activity },
      ]
    },
    { 
      label: 'Reports',
      icon: FileText,
      children: [
        { label: 'Weekly Summary', href: '/leadership/summary', icon: FileText },
        { label: 'Implementations', href: '/leadership/implementations', icon: BarChart3 },
      ]
    },
    { label: 'Settings', href: '/leadership/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/leadership') {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
          <Link href="/leadership" className="flex items-center space-x-2 flex-shrink-0">
            <div className="relative h-6 w-20 sm:h-8 sm:w-32 md:h-10 md:w-40">
              <Image
                src="/avni-logo.png"
                alt="Avni"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
          <div className="h-6 w-px bg-gray-200 hidden md:block" />
          <span className="text-xs sm:text-sm font-semibold text-gray-600 hidden md:block">Leadership</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            // If item has children, render dropdown
            if ('children' in item && item.children) {
              const isAnyChildActive = item.children.some(child => isActive(child.href));
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium",
                        isAnyChildActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child.href);
                      return (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              childActive && "bg-primary/10 text-primary"
                            )}
                          >
                            <ChildIcon className="h-4 w-4" />
                            {child.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            // Regular link
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors h-9",
                  active 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-xs text-right hidden lg:block">
            <div className="font-medium text-gray-900 text-sm">{user?.email}</div>
            <div className="text-xs text-gray-500">Leadership</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1 sm:gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
