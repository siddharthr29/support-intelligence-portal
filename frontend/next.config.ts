import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compression
  compress: true,
  
  // Production optimizations
  poweredByHeader: false,
  
  // Static optimization
  output: 'standalone',
};

export default nextConfig;
