import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import InitDatabase from '@/components/InitDatabase'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'POS Karya Mandiri',
  description: 'Aplikasi POS untuk Bahan Bangunan',
  manifest: '/manifest.json',
  themeColor: '#4f46e5',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS Karya Mandiri',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="POS Karya Mandiri" />
      </head>
      <body>
        <InitDatabase />
        <ServiceWorkerRegistration />
        {children}
        <Toaster />
      </body>
    </html>
  )
}

