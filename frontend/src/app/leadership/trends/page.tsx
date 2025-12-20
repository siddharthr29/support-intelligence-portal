'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { LeadershipDateFilter } from '@/components/leadership/date-filter';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartLoadingSkeleton } from '@/components/leadership/loading-skeleton';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from '@/components/leadership/lazy-charts';
import { TrendingUp, Users, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TicketType {
  type: string;
  count: number;
  percentage: number;
}

interface Company {
  company_id: number;
  company_name: string;
  total_tickets: number;
  trend: string;
  trend_percentage: number;
  data_issues: number;
  how_to_training: number;
  technical_issues: number;
}

interface TagData {
  tag: string;
  count: number;
}

interface TimelineData {
  month: Date;
  total_tickets: number;
  resolved: number;
  unresolved: number;
  urgent: number;
  high: number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function TrendsPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    return { from, to };
  });

  const handleDateChange = useCallback((range: { from: Date; to: Date }) => {
    console.log('Date changed in trends:', range);
    setDateRange(range);
  }, []);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    console.log('Fetching trends with date range:', dateRange);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      const [typesRes, companiesRes, tagsRes, timelineRes] = await Promise.all([
        apiGet(`/api/leadership/trends/ticket-types?${params}`),
        apiGet(`/api/leadership/trends/companies?${params}`),
        apiGet(`/api/leadership/trends/tags?${params}`),
        apiGet(`/api/leadership/trends/timeline?${params}`),
      ]);

      console.log('Trends data loaded:', { 
        categoriesCount: typesRes.data.categories?.length,
        companiesCount: companiesRes.data.companies?.length,
        tagsCount: tagsRes.data.tags?.length,
        timelineCount: timelineRes.data.monthly?.length
      });

      setTicketTypes(typesRes.data.categories || []);
      setCompanies(companiesRes.data.companies || []);
      setTags(tagsRes.data.tags || []);
      setTimeline(timelineRes.data.monthly?.map((m: any) => ({
        ...m,
        month: new Date(m.month),
      })) || []);
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-96 mb-6" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        
        <div className="container mx-auto p-4 sm:p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Trends & Pattern Analysis</h1>
              <p className="text-gray-600">
                {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
            <LeadershipDateFilter onDateChange={handleDateChange} defaultPreset="12m" />
          </div>
        </div>

        {/* Top Row: Ticket Types & Top Companies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ticket Type Distribution */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Ticket Type Distribution</h2>
            </div>
            {ticketTypes.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No ticket type data available for selected date range</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={ticketTypes as any}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry: any) => `${entry.type}: ${entry.percentage}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ticketTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry: any) => `${entry.payload.type}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {ticketTypes.map((type, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-gray-700">{type.type}: {type.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Companies by Volume */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Top 10 Companies by Volume</h2>
            </div>
            {companies.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No company data available for selected date range</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="company_name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="total_tickets" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Trend Timeline */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Monthly Ticket Volume Trend</h2>
          </div>
          {timeline.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No timeline data available for selected date range</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                />
                <Legend />
                <Line type="monotone" dataKey="total_tickets" stroke="#8b5cf6" name="Total Tickets" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Resolved" strokeWidth={2} />
                <Line type="monotone" dataKey="unresolved" stroke="#ef4444" name="Unresolved" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Row: Tags & Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tags */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Top 20 Tags</h2>
            </div>
            {tags.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tag data available for selected date range</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tags}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tag" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Priority Distribution Over Time */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Priority Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                />
                <Legend />
                <Bar dataKey="urgent" stackId="a" fill="#ef4444" name="Urgent" />
                <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
                <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Company Details Table */}
        <div className="bg-white rounded-lg border p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Breakdown Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Total Tickets</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Data Issues</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">How-To/Training</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Technical</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map((company) => (
                  <tr key={company.company_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{company.company_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{company.total_tickets}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{company.data_issues}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{company.how_to_training}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{company.technical_issues}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        company.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                        company.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {company.trend === 'increasing' ? '↑' : company.trend === 'decreasing' ? '↓' : '→'} {company.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}
