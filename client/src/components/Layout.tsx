import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Skip layout for login page
  if (location === "/login" || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1">
        {user.role === "manager" && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
        
        <main className={`flex-1 pt-16 pb-4 w-full overflow-x-hidden ${user.role === "manager" ? "md:ml-64" : ""}`}>
          <div className="w-full px-0 sm:px-2 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
