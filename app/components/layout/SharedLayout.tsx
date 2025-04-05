// This is now a server component (no 'use client' directive)

import { ReactNode } from "react";
import { Russo_One } from "next/font/google";
import Link from 'next/link';

// Import client components
import NetworkStatsPanel from "./NetworkStatsPanel";
import SidebarNavigation from "./SidebarNavigation";
import HeaderActions from "./HeaderActions";
import MobileActions from "./MobileActions";

const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
});

// Helper function to format hashrate with appropriate units - moved outside component
const formatHashrate = (hashrate: number | null) => {
  if (!hashrate) return null;
  
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let unitIndex = 0;
  let formattedHashrate = hashrate;
  
  while (formattedHashrate >= 1000 && unitIndex < units.length - 1) {
    formattedHashrate /= 1000;
    unitIndex++;
  }
  
  return {
    value: formattedHashrate.toFixed(2),
    unit: units[unitIndex]
  };
}

const formatPublicKeyWithEllipsis = (publicKey: string) => {
  return `..${publicKey.slice(-12)}`
}

const SharedLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="flex min-h-screen">
        <div className="max-w-7xl mx-auto w-full flex">
          {/* Left sidebar - starts from very top */}
          <aside className="hidden lg:block w-[275px] min-w-[275px] sticky top-0 self-start h-screen">
            <div className="h-full p-4">
              <div className="p-2 pl-4 sm:p-3 mb-4">
                <Link href="/" className={`pr-1 text-3xl sm:text-2xl font-normal bg-gradient-to-r from-black to-black/80 dark:from-white dark:to-white/80 text-transparent bg-clip-text hover:opacity-80 transition-opacity italic overflow-visible whitespace-nowrap ${russoOne.variable} ${russoOne.className}`}>
                  hodlocker
                </Link>
              </div>
              <SidebarNavigation />
            </div>
          </aside>

          {/* Main content - with fixed width on desktop */}
          <main className="flex-1 pt-12 lg:pt-0 lg:w-[600px] lg:min-w-[600px] lg:max-w-[600px] lg:ml-6 min-w-0 border-x">
            {/* No wrapper elements - let Feed component handle its own sticky header */}
            {children}
          </main>

          {/* Right sidebar - starts from very top */}
          <aside className="hidden xl:block w-[350px] min-w-[350px] sticky top-0 self-start h-screen">
            <div className="h-full p-4">
              <div className="mb-6 flex justify-end">
                <HeaderActions />
              </div>
              <NetworkStatsPanel />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile header - only visible on small screens - removed glass effect */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b bg-background shadow-sm lg:hidden">
        <div className="flex items-center justify-between p-2 sm:p-3">
          <Link href="/" className={`pr-1 text-2xl sm:text-2xl font-normal bg-gradient-to-r from-black to-black/80 dark:from-white dark:to-white/80 text-transparent bg-clip-text hover:opacity-80 transition-opacity italic overflow-visible whitespace-nowrap ${russoOne.variable} ${russoOne.className}`}>
            hodlocker
          </Link>
          <HeaderActions />
        </div>
      </div>

      {/* Mobile actions - only visible on small screens */}
      <MobileActions />
    </>
  );
};

export default SharedLayout;
