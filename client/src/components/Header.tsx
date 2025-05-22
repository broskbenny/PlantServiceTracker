import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Menu, List, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ICalMenu } from "@/components/ICalMenu";
import { useViewMode } from "@/lib/viewModeContext";
import ngdLogo from "@/assets/ngd-logo.png";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { viewMode, setViewMode } = useViewMode();
  
  if (!user) return null;
  
  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };
  
  const initials = user.fullName
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white shadow-sm z-10 fixed top-0 left-0 right-0 border-b">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          {user.role === "manager" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-neutral-500 mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <img src={ngdLogo} alt="Nordic Green Design" className="h-8" />
        </div>
        
        {/* View toggle for staff users */}
        {user.role === "staff" && (
          <div className="flex justify-center">
            <div className="bg-muted rounded-full p-1 inline-flex">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full ${viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full ${viewMode === "calendar" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setViewMode("calendar")}
                aria-label="Calendar view"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex items-center">
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-neutral-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            </Button>
          </div>
          <div className="relative ml-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block ml-2 text-sm font-medium text-neutral-700">
                    {user.fullName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {user.role === "staff" && <ICalMenu />}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>


    </header>
  );
}
