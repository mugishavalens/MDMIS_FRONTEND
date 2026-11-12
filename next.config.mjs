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
  // Browser hardening for every page. The CSP here doesn't restrict
  // scripts (Cesium and Next's inline bootstrap need a nonce-based policy
  // for that); it stops the app being framed (clickjacking), plugins, and
  // <base>/form hijacking.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
