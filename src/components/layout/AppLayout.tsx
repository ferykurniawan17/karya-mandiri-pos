"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  user: {
    name: string;
    role?: string;
  };
  title?: string;
}

const SIDEBAR_STORAGE_KEY = "sidebar_collapsed";

export default function AppLayout({
  children,
  user,
  title = "POS Karya Mandiri",
}: AppLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  // Hide sidebar on login page
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow flex-shrink-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {/* Toggle Sidebar Button */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={isCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                {isCollapsed ? (
                  <Menu className="h-5 w-5 text-gray-600" />
                ) : (
                  <X className="h-5 w-5 text-gray-600" />
                )}
              </button>
              
              <Link href="/dashboard">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Halo, {user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Menu */}
        <Sidebar isCollapsed={isCollapsed} userRole={user.role} />

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

