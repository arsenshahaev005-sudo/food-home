/** @type {import('next').NextConfig} */
const nextConfig = {
  // Настройки для работы с API
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Оптимизация изображений
  images: {
    domains: [
      'localhost',
      ...(process.env.NEXT_PUBLIC_API_URL ? [new URL(process.env.NEXT_PUBLIC_API_URL).hostname] : []),
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Настройки компиляции
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Настройки безопасности
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Настройки редиректов
  async redirects() {
    return [];
  },

  // Переменные окружения, доступные на клиенте
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Food Home',
  },

  // Настройки для работы с TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },

  // Настройки для работы с ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },

};

module.exports = nextConfig;
