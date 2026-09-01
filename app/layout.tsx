import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/shell/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'MDMIS — Mineral Detection & Mining Intelligence System',
  description: 'AI-powered subsurface exploration platform for Rwanda\'s extractive minerals sector.',
}

export const viewport: Viewport = { themeColor: '#0f1115' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Load Cesium.js & Widgets stylesheet globally — needed for the CesiumGlobe component */}
        <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
        <script src="/cesium/Cesium.js" async defer />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
