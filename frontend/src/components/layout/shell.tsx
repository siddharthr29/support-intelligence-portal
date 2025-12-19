'use client';

import { useEffect } from 'react';
import { Navbar } from './navbar';
import { AiChat } from '@/components/dashboard/ai-chat';
import { useAppDataStore } from '@/stores/app-data-store';
import { Loader2 } from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { fetchAppData, isLoading, isLoaded, error } = useAppDataStore();
  
  // Fetch data ONCE on app load
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      fetchAppData();
    }
  }, [isLoaded, isLoading, fetchAppData]);
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {isLoading && !isLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Failed to load data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button 
                onClick={() => fetchAppData()} 
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <footer className="border-t py-6 md:py-8 bg-white">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for <strong>Avni Project</strong> Support Intelligence.
          </p>
        </div>
      </footer>
      <AiChat />
    </div>
  );
}
