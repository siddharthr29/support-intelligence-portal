import { NextResponse } from 'next/server';

export async function GET() {
  // Test if environment variables are being read
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  return NextResponse.json({
    message: "Environment test",
    NEXT_PUBLIC_API_URL: apiUrl || 'NOT_SET',
    apiUrlLength: apiUrl?.length || 0,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  });
}
