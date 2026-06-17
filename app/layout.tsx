import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SpaRedirectHandler } from '@/components/SpaRedirectHandler'

export const metadata: Metadata = {
  title:       'MeuPet+ — Cuidado inteligente para seu pet',
  description: 'Acompanhe a saúde, rotina e bem-estar do seu pet com inteligência artificial.',
  manifest:    '/meupet-app/manifest.json',
  icons: {
    icon:  '/meupet-app/icons/icon-192.png',
    apple: '/meupet-app/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor:    '#2563eb',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-slate-50">
        <SpaRedirectHandler />
        {children}
      </body>
    </html>
  )
}
