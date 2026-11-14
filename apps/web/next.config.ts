import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // URLs can contain verification, invitation and reset tokens, patient IDs,
  // or search text. Do not echo incoming requests in the development terminal.
  logging: { incomingRequests: false },
  // The contracts package ships TypeScript source; Next transpiles it as part
  // of the app build so frontend and API share one definition.
  transpilePackages: ['@nexus-med/contracts'],
  async headers() {
    return [
      {
        source: '/aceptar-invitacion',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/restablecer-contrasena',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
