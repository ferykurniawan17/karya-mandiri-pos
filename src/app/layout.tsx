import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import InitDatabase from '@/components/InitDatabase'

export const metadata: Metadata = {
  title: 'POS Karya Mandiri',
  description: 'Aplikasi POS untuk Bahan Bangunan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <InitDatabase />
        {children}
        <Toaster />
      </body>
    </html>
  )
}

