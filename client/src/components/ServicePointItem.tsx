import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ServicePointItemProps {
  point: {
    id: number;
    plantType: string;
    potType: string;
    status: string;
    jobId: number;
    groupId?: number;
  };
  userRole: string;
}

export default function ServicePointItem({ point, userRole }: ServicePointItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const handleStatusToggle = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    const newStatus = point.status === "completed" ? "pending" : "completed";
    
    try {
      console.log("Updating service point:", point.id, "to status:", newStatus);
      
      // Use direct fetch for more reliable error handling
      const response = await fetch(`/api/service-points/${point.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Service point update failed:", errorText);
        throw new Error(errorText);
      }
      
      // Update the cache
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${point.jobId}`] });
      
      toast({
        title: "Success",
        description: `Service point marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating service point:", error);
      toast({
        title: "Error",
        description: "Failed to update service point status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <li className="py-3 flex items-center justify-between border-b border-neutral-100 last:border-b-0">
      <div>
        <p className="font-medium">{point.plantType || "Unnamed Plant"}</p>
        <p className="text-sm text-neutral-500">{point.potType || "Standard Pot"}</p>
      </div>
      <Button
        variant="ghost"
        className={cn(
          "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
          point.status === "completed" 
            ? "bg-success bg-opacity-10 text-success" 
            : "bg-neutral-100 text-neutral-700"
        )}
        onClick={handleStatusToggle}
        disabled={isUpdating}
      >
        {point.status === "completed" ? (
          <>
            <Check className="h-4 w-4 mr-1" /> Completed
          </>
        ) : (
          <>
            <Circle className="h-4 w-4 mr-1" /> Mark Complete
          </>
        )}
      </Button>
    </li>
  );
}
