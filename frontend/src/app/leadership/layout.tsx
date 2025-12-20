'use client';

import { LeadershipProvider } from '@/contexts/leadership-context';

export default function LeadershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LeadershipProvider>
      {children}
    </LeadershipProvider>
  );
}
