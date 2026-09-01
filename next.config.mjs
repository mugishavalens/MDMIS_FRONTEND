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
}

export default nextConfig
