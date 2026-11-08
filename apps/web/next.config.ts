import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The contracts package ships TypeScript source; Next transpiles it as part
  // of the app build so frontend and API share one definition.
  transpilePackages: ['@nexus-med/contracts'],
};

export default nextConfig;
