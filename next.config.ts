/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.zafyfashion.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Add more if needed in future
    ],
  },

  // Allowed origins for development (mobile / network access)
  allowedDevOrigins: ['10.95.98.136'],
};

module.exports = nextConfig;