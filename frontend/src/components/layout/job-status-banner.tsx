'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface HealthStatus {
  status: string;
  scheduler: {
    running: boolean;
    jobInProgress: boolean;
  };
}

export function JobStatusBanner() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastJobStatus, setLastJobStatus] = useState<boolean>(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/health`);
        const data: HealthStatus = await response.json();
        
        if (data.scheduler.jobInProgress && !lastJobStatus) {
          toast.info('Weekly data sync in progress...', {
            duration: 5000,
          });
        } else if (!data.scheduler.jobInProgress && lastJobStatus) {
          toast.success('Weekly data sync completed successfully!', {
            duration: 5000,
          });
        }
        
        setLastJobStatus(data.scheduler.jobInProgress);
        setHealthStatus(data);
      } catch (error) {
        console.error('Failed to fetch health status:', error);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, [lastJobStatus]);

  if (!healthStatus) return null;

  if (healthStatus.scheduler.jobInProgress) {
    return (
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Weekly Data Sync in Progress
              </p>
              <p className="text-xs text-blue-700">
                Fetching latest tickets from Freshdesk. This may take a few minutes...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!healthStatus.scheduler.running) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Scheduler Not Running
              </p>
              <p className="text-xs text-yellow-700">
                Weekly automatic sync is currently disabled. Contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
