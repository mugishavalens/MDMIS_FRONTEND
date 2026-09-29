/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['mapbox-gl'],
  turbopack: {},
  allowedDevOrigins: ['172.27.112.1'],
  // Hide the Next.js dev-mode badge (bottom-left 'N'); it overlapped the sidebar.
  devIndicators: false,
}

export default nextConfig
