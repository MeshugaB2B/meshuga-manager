import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Meshuga B2B Manager',
  description: 'Outil de gestion B2B — Meshuga Crazy Deli Paris',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
