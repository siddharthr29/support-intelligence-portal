'use client';

import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { MetabaseEmbed } from '@/components/metabase-embed';
import { ExternalLink } from 'lucide-react';

export default function ImplementationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
          <p className="text-gray-600">
            Live dashboard showing all active Avni implementations across India with real-time data from Metabase
          </p>
        </div>

        {/* Metabase Embedded Dashboard */}
        <div className="mb-8">
          <MetabaseEmbed 
            questionId={816}
            height="1000px"
            autoRefresh={true}
            refreshInterval={540}
          />
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">About This Dashboard</h3>
                <p className="text-sm text-gray-700">
                  This dashboard is embedded directly from Metabase (Question 816) and shows all active Avni implementations. 
                  The data is always up-to-date and reflects any changes made in Metabase automatically. 
                  The dashboard includes organization details, project information, user counts, subject counts, and geographic distribution.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Security:</strong> The dashboard is securely embedded using JWT tokens that are generated server-side. 
                  Tokens auto-refresh every 9 minutes to ensure uninterrupted access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
