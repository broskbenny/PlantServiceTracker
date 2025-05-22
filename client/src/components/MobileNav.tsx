import { Link, useLocation } from "wouter";
import { ListTodo, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/lib/viewModeContext";

export default function MobileNav() {
  const [location] = useLocation();
  const { viewMode, setViewMode } = useViewMode();
  
  const isActive = (path: string) => location === path;
  
  const itemClasses = (active: boolean) => cn(
    "flex flex-col items-center justify-center text-sm",
    active ? "text-primary" : "text-neutral-500"
  );

  return (
    <nav className="md:hidden bg-white shadow-t-lg fixed bottom-0 left-0 right-0 z-10">
      <div className="grid grid-cols-2 h-16">
        <Link href="/staff/dashboard">
          <a className={itemClasses(isActive("/staff/dashboard") && viewMode === "list")}>
            <ListTodo className="h-5 w-5" />
            <span className="text-xs mt-1">List View</span>
          </a>
        </Link>
        <div 
          className={itemClasses(viewMode === "calendar")}
          onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="text-xs mt-1">Calendar</span>
        </div>
      </div>
    </nav>
  );
}
