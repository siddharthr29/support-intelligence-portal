'use client';

import { useState } from 'react';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, BarChart3, Users, Building2, TrendingUp, Calendar, Activity } from 'lucide-react';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: any;
  category: 'implementations' | 'tickets' | 'performance' | 'trends';
  color: string;
}

const dashboards: DashboardCard[] = [
  {
    id: 'all-implementations',
    title: 'All Avni Implementations',
    description: 'Complete overview of all Avni implementations across organizations',
    url: 'https://reporting.avniproject.org/question/816-all-avni-implementations',
    icon: Building2,
    category: 'implementations',
    color: 'blue',
  },
  {
    id: 'ticket-volume',
    title: 'Ticket Volume Analysis',
    description: 'Historical ticket volume trends and patterns',
    url: 'https://reporting.avniproject.org/question/817-ticket-volume-analysis',
    icon: BarChart3,
    category: 'tickets',
    color: 'green',
  },
  {
    id: 'partner-engagement',
    title: 'Partner Engagement Metrics',
    description: 'Partner activity and engagement patterns over time',
    url: 'https://reporting.avniproject.org/question/818-partner-engagement',
    icon: Users,
    category: 'performance',
    color: 'purple',
  },
  {
    id: 'resolution-trends',
    title: 'Resolution Time Trends',
    description: 'Average resolution time and SLA performance',
    url: 'https://reporting.avniproject.org/question/819-resolution-trends',
    icon: TrendingUp,
    category: 'trends',
    color: 'orange',
  },
  {
    id: 'monthly-summary',
    title: 'Monthly Performance Summary',
    description: 'Comprehensive monthly metrics and KPIs',
    url: 'https://reporting.avniproject.org/question/820-monthly-summary',
    icon: Calendar,
    category: 'performance',
    color: 'indigo',
  },
  {
    id: 'support-capacity',
    title: 'Support Team Capacity',
    description: 'Team workload distribution and capacity analysis',
    url: 'https://reporting.avniproject.org/question/821-support-capacity',
    icon: Activity,
    category: 'performance',
    color: 'red',
  },
];

export default function AnalyticsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Dashboards', count: dashboards.length },
    { id: 'implementations', label: 'Implementations', count: dashboards.filter(d => d.category === 'implementations').length },
    { id: 'tickets', label: 'Tickets', count: dashboards.filter(d => d.category === 'tickets').length },
    { id: 'performance', label: 'Performance', count: dashboards.filter(d => d.category === 'performance').length },
    { id: 'trends', label: 'Trends', count: dashboards.filter(d => d.category === 'trends').length },
  ];

  const filteredDashboards = selectedCategory === 'all' 
    ? dashboards 
    : dashboards.filter(d => d.category === selectedCategory);

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">
            Metabase dashboards and comprehensive analytics for data-driven decision making
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-2"
            >
              {cat.label}
              <Badge variant="secondary" className="ml-1">
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDashboards.map((dashboard) => {
            const Icon = dashboard.icon;
            const colors = getColorClasses(dashboard.color);
            
            return (
              <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {dashboard.category}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{dashboard.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {dashboard.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => window.open(dashboard.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Dashboard
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredDashboards.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No dashboards found</p>
              <p className="text-sm">Try selecting a different category</p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">About Metabase Analytics</h3>
                <p className="text-sm text-gray-700">
                  These dashboards are powered by Metabase and provide real-time insights into Avni implementations, 
                  support operations, and partner engagement. Click "Open Dashboard" to view detailed analytics in a new tab.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
