import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface AttentionItemProps {
  item: {
    id: number;
    date: string;
    message: string;
    status: string;
    job: {
      id: number;
    };
    customer: {
      name: string;
    };
    user: {
      id: number;
      fullName: string;
    };
  };
}

export default function AttentionItem({ item }: AttentionItemProps) {
  const { id, date, message, status, customer, user } = item;
  const { toast } = useToast();
  
  const handleMarkAsRead = async () => {
    try {
      await apiRequest("PUT", `/api/messages/${id}`, { status: "read" });
      
      toast({
        title: "Success",
        description: "Item marked as read",
      });
      
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className={`mb-4 ${status === "unread" ? "bg-neutral-50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium flex items-center">
              {customer.name}
              {status === "unread" && <span className="ml-2 w-2 h-2 rounded-full bg-error"></span>}
            </h3>
            <p className="text-sm text-neutral-500">
              {formatDate(date, "MMM d")} • Reported by {user.fullName}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-500">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "unread" && (
                <DropdownMenuItem onClick={handleMarkAsRead}>
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>View job details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm mb-3">{message}</p>
        <div className="flex justify-end space-x-2">
          {status === "unread" && (
            <>
              <Button variant="outline" size="sm" onClick={handleMarkAsRead}>
                Dismiss
              </Button>
              <Button className="bg-primary hover:bg-primary-dark text-white" size="sm">
                Respond
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
