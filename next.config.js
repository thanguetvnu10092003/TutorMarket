/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    domains: ['images.unsplash.com', 'randomuser.me', 'ui-avatars.com', 'lh3.googleusercontent.com'],
  },
};

export default nextConfig;
