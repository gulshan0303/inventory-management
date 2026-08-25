import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://52.65.223.73:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
