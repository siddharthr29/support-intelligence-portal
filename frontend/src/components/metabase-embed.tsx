'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetabaseEmbedProps {
  questionId?: number;
  dashboardId?: number;
  params?: Record<string, any>;
  height?: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export function MetabaseEmbed({
  questionId,
  dashboardId,
  params,
  height = '800px',
  className = '',
  autoRefresh = true,
  refreshInterval = 540, // 9 minutes (before 10 min token expiry)
}: MetabaseEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchEmbedUrl = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      if (questionId) {
        endpoint = `/api/metabase/embed/question/${questionId}`;
      } else if (dashboardId) {
        endpoint = `/api/metabase/embed/dashboard/${dashboardId}`;
      } else {
        throw new Error('Either questionId or dashboardId must be provided');
      }

      if (params && Object.keys(params).length > 0) {
        endpoint += `?params=${encodeURIComponent(JSON.stringify(params))}`;
      }

      const response = await apiGet(endpoint);
      setEmbedUrl(response.data.embedUrl);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Failed to fetch Metabase embed URL:', err);
      setError(err.response?.data?.message || 'Failed to load Metabase content');
    } finally {
      setLoading(false);
    }
  }, [questionId, dashboardId, params]);

  useEffect(() => {
    fetchEmbedUrl();
  }, [fetchEmbedUrl]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!autoRefresh || !embedUrl) return;

    const interval = setInterval(() => {
      fetchEmbedUrl();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, embedUrl, refreshInterval, fetchEmbedUrl]);

  if (loading && !embedUrl) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64 bg-gray-300" />
            <Skeleton className="h-[600px] w-full bg-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Content</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchEmbedUrl} variant="outline" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!embedUrl) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <iframe
        src={embedUrl}
        frameBorder="0"
        width="100%"
        height={height}
        allowTransparency
        className="rounded-lg border shadow-sm"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        title={questionId ? `Metabase Question ${questionId}` : `Metabase Dashboard ${dashboardId}`}
      />
      {autoRefresh && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
          Auto-refreshing • Last: {lastRefresh.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      )}
    </div>
  );
}
