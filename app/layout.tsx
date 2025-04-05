import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SharedLayout from "./components/layout/SharedLayout";
import { Providers } from './providers'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from 'react'
import { Loader2 } from "lucide-react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://new.hodlocker.com' 
  : 'http://localhost:3000'

export const metadata: Metadata = {
  title: "hodlocker.com | Stream Bitcoin into the Future",
  description: "Lock Bitcoin to posts, stream satoshis through time, and build your savings while engaging with content. The first social platform where engagement builds your future.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "hodlocker.com | Stream Bitcoin into the Future",
    description: "Lock Bitcoin to posts, stream satoshis through time, and build your savings while engaging with content. The first social platform where engagement builds your future.",
    url: "https://new.hodlocker.com",
    siteName: "new.hodlocker.com",
    type: "website",
    images: [
      {
        url: `${baseUrl}/diamond.png`,
        width: 1200,
        height: 630,
        alt: "Hodlocker - Stream Bitcoin into the Future"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "hodlocker.com | Stream Bitcoin into the Future",
    description: "Lock Bitcoin to posts, stream satoshis through time, and build your savings while engaging with content. The first social platform where engagement builds your future.",
    images: [`${baseUrl}/diamond.png`]
  },
  other: {
    'telegram-channel': '@hodlocker',
    'og:image': `${baseUrl}/diamond.png`,
    'og:site_name': 'hodlocker.com',
    'og:type': 'website',
    'og:image:width': '1200',
    'og:image:height': '630',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            
              <SharedLayout>
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                  </div>
                }>
                  {children}
                </Suspense>
              </SharedLayout>
           
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
