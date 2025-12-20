'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';

interface UserRoles {
  support_engineer: boolean;
  product_manager: boolean;
  leadership: boolean;
  founder: boolean;
}

interface DataRange {
  earliest_date: string;
  latest_date: string;
  total_tickets: number;
  years_available: number[];
  coverage: string;
}

export default function LeadershipDashboard() {
  const router = useRouter();
  const [roles, setRoles] = useState<UserRoles | null>(null);
  const [dataRange, setDataRange] = useState<DataRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check user roles
        const rolesResponse = await apiGet('/api/leadership/user/roles');
        const userRoles = rolesResponse.data.roles;
        
        // Verify leadership or founder access
        if (!userRoles.leadership && !userRoles.founder) {
          setError('Leadership access required. Please contact your administrator.');
          setLoading(false);
          return;
        }

        setRoles(userRoles);

        // Get data range
        const rangeResponse = await apiGet('/api/leadership/data-range');
        setDataRange(rangeResponse.data);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load leadership dashboard:', err);
        setError('Failed to load dashboard. Please try again.');
        setLoading(false);
      }
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leadership intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Leadership Intelligence</h1>
        <p className="text-muted-foreground">
          Partner-aware support intelligence for founders and leadership
        </p>
      </div>

      {/* User Info */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Your Access Level</h2>
        <div className="flex gap-2">
          {roles?.founder && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              Founder
            </span>
          )}
          {roles?.leadership && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Leadership
            </span>
          )}
          {roles?.product_manager && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Product Manager
            </span>
          )}
        </div>
      </div>

      {/* Data Coverage */}
      {dataRange && (
        <div className="bg-card rounded-lg border p-4 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Data Coverage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{dataRange.total_tickets.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dataRange.years_available.length}</p>
              <p className="text-sm text-muted-foreground">Years Available</p>
            </div>
            <div>
              <p className="text-sm font-medium">{dataRange.coverage}</p>
              <p className="text-sm text-muted-foreground">Date Range</p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6 hover:border-primary cursor-pointer" onClick={() => router.push('/leadership/partners')}>
          <h3 className="text-lg font-semibold mb-2">Partner Risk Metrics</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Identify partners with operational risks, data loss patterns, and adoption challenges
          </p>
          <button className="text-sm text-primary font-medium">View Partners →</button>
        </div>

        <div className="bg-card rounded-lg border p-6 hover:border-primary cursor-pointer" onClick={() => router.push('/leadership/metrics')}>
          <h3 className="text-lg font-semibold mb-2">Social Sector Metrics</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Program risk, adoption signals, platform reliability, and support capacity metrics
          </p>
          <button className="text-sm text-primary font-medium">View Metrics →</button>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Action Playbooks</h3>
          <p className="text-muted-foreground text-sm mb-4">
            8 automated playbooks for signal detection and intervention
          </p>
          <div className="text-sm text-green-600 font-medium">✓ Active in Database</div>
        </div>

        <div className="bg-card rounded-lg border p-6 hover:border-primary cursor-pointer" onClick={() => router.push('/leadership/summary')}>
          <h3 className="text-lg font-semibold mb-2">Weekly Founder Summary</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Low-noise, high-signal weekly intelligence summary with top risks and recommended actions
          </p>
          <button className="text-sm text-primary font-medium">View Summary →</button>
        </div>
      </div>

      {/* Phase 1 Complete Notice */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-green-800 font-semibold mb-2">✅ Phase 1 Complete: Authentication & Access</h3>
        <p className="text-green-700 text-sm">
          Role-based access control is now active. Leadership and founder roles can access this dashboard.
          Support engineers will continue using the existing operational dashboards without any changes.
        </p>
      </div>
    </div>
  );
}
