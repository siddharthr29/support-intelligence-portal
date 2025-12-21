'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LayoutDashboard, FileText, Calendar, Building2, Bug, LogOut, AlertTriangle, BarChart3, CalendarDays, ChevronDown, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { YearSelector } from '@/components/year-selector';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { 
    label: 'Reports', 
    icon: FileText,
    children: [
      { label: 'Weekly Report', href: '/reports/weekly', icon: Calendar },
      { label: 'Monthly Report', href: '/reports/monthly', icon: CalendarDays },
      { label: 'Yearly Report', href: '/reports/yearly', icon: BarChart3 },
    ]
  },
  { 
    label: 'Analytics', 
    icon: TrendingUp,
    children: [
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'RFT Metrics', href: '/rft', icon: Bug },
      { label: 'Error Logs', href: '/error-logs', icon: AlertTriangle },
    ]
  },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="relative h-6 w-20 sm:h-8 sm:w-32 md:h-10 md:w-40">
              <Image
                src="/avni-logo.png"
                alt="Avni by Samanvay Foundation"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
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
          
          <div className="h-6 w-px bg-gray-200 mx-1 sm:mx-2 hidden md:block" />
          <div className="hidden md:block">
            <YearSelector />
          </div>
          
          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full ml-1 sm:ml-2 flex-shrink-0">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="text-left">Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-4 md:hidden">
              <YearSelector />
            </div>
            <nav className="flex flex-col gap-2 mt-6">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                
                // If item has children, render group
                if ('children' in item && item.children) {
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </div>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ml-2",
                                childActive 
                                  ? "bg-primary/10 text-primary" 
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              )}
                              onClick={() => setIsOpen(false)}
                            >
                              <ChildIcon className="h-5 w-5" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Regular link
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        active 
                          ? "bg-primary/10 text-primary" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                
                {/* Mobile User Info & Logout */}
                {user && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="px-4 py-2 text-sm text-gray-600 truncate">
                      {user?.email || 'User'}
                    </div>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      Log out
                    </button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
