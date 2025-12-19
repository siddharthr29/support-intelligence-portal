'use client';

export function DebugEnvClient() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT_SET';
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'black',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      borderRadius: '5px'
    }}>
      <div>API_URL: {apiUrl}</div>
      <div>Length: {apiUrl.length}</div>
      <div>Window Location: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</div>
    </div>
  );
}
