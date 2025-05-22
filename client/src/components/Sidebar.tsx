import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  AlertCircle, 
  CalendarDays, 
  PlusCircle, 
  ListTodo, 
  RotateCw, 
  FileText, 
  User, 
  X,
  Repeat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: attentionItems } = useQuery({
    queryKey: ["/api/messages"],
    enabled: user?.role === "manager",
  });
  
  const unreadCount = attentionItems?.filter((item: any) => item.status === "unread").length || 0;
  
  if (!user) return null;
  
  const isActiveRoute = (route: string) => {
    if (route === "/") {
      return location === "/" || 
        (user.role === "manager" && location === "/manager/dashboard") ||
        (user.role === "staff" && location === "/staff/dashboard");
    }
    return location.startsWith(route);
  };
  
  const navItemClasses = (active: boolean) => cn(
    "flex items-center w-full px-2 py-2 text-sm font-medium rounded-md",
    active
      ? "text-primary border-l-4 border-primary bg-primary bg-opacity-5"
      : "text-neutral-500 border-l-4 border-transparent hover:bg-neutral-50"
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 w-64 overflow-y-auto bg-white shadow-md pt-16 transition-transform duration-300 ease-in-out",
        open ? "transform-none" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex justify-end p-2 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Manager Sidebar */}
      {user.role === "manager" && (
        <div className="py-4">
          <div className="px-4 mb-6">
            <div className="bg-primary bg-opacity-10 rounded-lg p-3">
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium">Manager</p>
                  <p className="text-xs text-neutral-500">{user.fullName}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-2 space-y-1">
            <Link href="/manager/dashboard">
              <a className={navItemClasses(isActiveRoute("/manager/dashboard"))}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
              </a>
            </Link>
            <Link href="/manager/customers">
              <a className={navItemClasses(isActiveRoute("/manager/customers"))}>
                <Building className="mr-3 h-5 w-5" />
                Customers
              </a>
            </Link>
            <Link href="/manager/staff">
              <a className={navItemClasses(isActiveRoute("/manager/staff"))}>
                <Users className="mr-3 h-5 w-5" />
                Service Staff
              </a>
            </Link>
            <Link href="/manager/attention">
              <a className={navItemClasses(isActiveRoute("/manager/attention"))}>
                <AlertCircle className="mr-3 h-5 w-5" />
                Requiring Attention
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-error text-white" variant="default">
                    {unreadCount}
                  </Badge>
                )}
              </a>
            </Link>
            <Link href="/manager/recurring-patterns">
              <a className={navItemClasses(isActiveRoute("/manager/recurring-patterns"))}>
                <Repeat className="mr-3 h-5 w-5" />
                Recurring Patterns
              </a>
            </Link>
          </div>
          
          <div className="px-4 mt-8">
            <h2 className="px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</h2>
            <div className="mt-2 space-y-1">
              <Link href="/manager/jobs/new">
                <a className="flex items-center w-full px-2 py-2 text-sm font-medium text-neutral-500 rounded-md hover:bg-neutral-50">
                  <PlusCircle className="mr-3 h-5 w-5" />
                  Create New Job
                </a>
              </Link>
              <Link href="/manager/recurring-patterns/new">
                <a className="flex items-center w-full px-2 py-2 text-sm font-medium text-neutral-500 rounded-md hover:bg-neutral-50">
                  <RotateCw className="mr-3 h-5 w-5" />
                  Create Recurring Pattern
                </a>
              </Link>
              <Link href="/manager/reports">
                <a className={navItemClasses(isActiveRoute("/manager/reports"))}>
                  <FileText className="mr-3 h-5 w-5" />
                  Reports
                </a>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Staff Sidebar - Simplified */}
      {user.role === "staff" && (
        <div className="py-4">
          <div className="px-4 mb-6">
            <div className="bg-secondary bg-opacity-10 rounded-lg p-3">
              <div className="flex items-center">
                <User className="h-5 w-5 text-secondary" />
                <div className="ml-3">
                  <p className="text-sm font-medium">Service Staff</p>
                  <p className="text-xs text-neutral-500">{user.fullName}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-2 space-y-1">
            <Link href="/staff/dashboard">
              <a className={navItemClasses(isActiveRoute("/staff/dashboard"))}>
                <ListTodo className="mr-3 h-5 w-5" />
                My Assignments
              </a>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
