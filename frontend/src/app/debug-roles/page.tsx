'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

export default function DebugRoles() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await apiGet('/api/leadership/user/roles');
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch roles');
      }
    }
    fetchRoles();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Debug: User Roles</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {data && (
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 bg-yellow-100 border border-yellow-400 p-4 rounded">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>If you see <code>leadership: false</code>, you need to logout and login again</li>
          <li>The role was assigned AFTER you logged in, so your current token doesn't have it</li>
          <li>Logout completely, clear browser cache, then login fresh</li>
          <li>After fresh login, come back to this page to verify</li>
        </ol>
      </div>
    </div>
  );
}
