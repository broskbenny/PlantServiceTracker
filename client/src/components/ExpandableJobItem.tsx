import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, User, ChevronDown, ChevronUp, Plus, Check, AlertCircle } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import { LogMessageDialog } from "./LogMessageDialog";

interface ExpandableJobItemProps {
  job: any;
  isToday?: boolean;
  isTomorrow?: boolean;
}

export function ExpandableJobItem({ job, isToday = false, isTomorrow = false }: ExpandableJobItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract the core properties directly from job
  const { 
    id, 
    date, 
    status, 
    customer,
    plantCount,
    notes
  } = job;
  
  // Process groups, ensuring the property exists
  const groups = Array.isArray(job.groups) ? job.groups : [];
  
  // Gather total counts of all service points across all groups
  let totalServicePoints = 0;
  let completedServicePoints = 0;
  
  // Count service points from all groups
  groups.forEach((group: any) => {
    const groupServicePoints = Array.isArray(group.servicePoints) ? group.servicePoints : [];
    totalServicePoints += groupServicePoints.length;
    completedServicePoints += groupServicePoints.filter((sp: any) => sp.status === "completed").length;
  });
  
  // Determine job status for traffic light visualization
  let jobStatus = "pending";
  
  if (status === "completed") {
    jobStatus = "completed";
  } else if (completedServicePoints > 0) {
    jobStatus = completedServicePoints === totalServicePoints 
      ? "completed" 
      : "partially_completed";
  } else if (status === "in_progress") {
    jobStatus = "in_progress";
  }
  
  const toggleGroup = (groupId: number) => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups(expandedGroups.filter(id => id !== groupId));
    } else {
      setExpandedGroups([...expandedGroups, groupId]);
    }
  };
  
  const toggleCompleteServicePoint = async (servicePointId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      
      // Use fetch directly for better error handling
      const response = await fetch(`/api/service-points/${servicePointId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update service point');
      }
      
      toast({
        title: "Success",
        description: `Service point ${newStatus === "completed" ? "completed" : "reopened"}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/date/${new Date().toISOString().split('T')[0]}`] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service point",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkJobComplete = async () => {
    // Check if all service points are completed
    if (completedServicePoints < totalServicePoints) {
      const uncompletedPoints = totalServicePoints - completedServicePoints;
      const confirmComplete = window.confirm(
        `There are still ${uncompletedPoints} uncompleted service points. Are you sure you want to complete the job?`
      );
      
      if (!confirmComplete) return;
    }
    
    try {
      // Update job status directly
      const jobResponse = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: "completed" })
      });
      
      if (!jobResponse.ok) {
        throw new Error("Failed to complete job");
      }
      
      toast({
        title: "Success",
        description: "Job marked as complete",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/date/${new Date().toISOString().split('T')[0]}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/date/${new Date(date).toISOString().split('T')[0]}`] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete job",
        variant: "destructive",
      });
    }
  };
  
  const handleReopenJob = async () => {
    try {
      // Use fetch directly for better error handling
      const response = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: "in_progress" })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to reopen job:", errorText);
        throw new Error(errorText);
      }
      
      toast({
        title: "Success",
        description: "Job reopened",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/date/${new Date().toISOString().split('T')[0]}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/date/${new Date(date).toISOString().split('T')[0]}`] });
      
    } catch (error) {
      console.error("Error reopening job:", error);
      toast({
        title: "Error",
        description: "Failed to reopen job",
        variant: "destructive",
      });
    }
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="mb-2" id={`job-${id}`}>
      <Card className={`overflow-hidden border-0 sm:border ${expanded ? 'border-primary' : ''}`}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-2 sm:p-3 cursor-pointer hover:bg-muted/20 flex justify-between items-center">
            {/* Job Title on the left */}
            <div className="flex-1">
              <h3 className="font-medium text-sm sm:text-base">{customer.name}</h3>
            </div>
            
            {/* Controls on the right */}
            <div className="flex items-center space-x-2">
              {/* Compact checkmark button to mark complete */}
              {!expanded && status !== "completed" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkJobComplete();
                  }}
                  title="Mark job as complete"
                >
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
              
              {/* Status indicator (traffic light) consistently on the right */}
              <StatusIndicator status={jobStatus} />
              
              {/* Toggle indicator */}
              <div>
                {expanded ? 
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : 
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                }
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 border-t">
            {/* Customer Details Section */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Customer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="break-words">{customer.address}</span>
                </div>
                <div className="flex items-start">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="break-words">{customer.phone}</span>
                </div>
                {customer.contactPerson && (
                  <div className="flex items-start">
                    <User className="h-4 w-4 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="break-words">{customer.contactPerson}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Notes Section */}
            {notes && (
              <div className="mb-4 p-3 bg-muted/30 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-sm">{notes}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Message Log Section */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Communication Log</h4>
              <LogMessageDialog jobId={id} customerName={customer.name} />
            </div>
            
            {/* Job Groups Section */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Job Groups</h4>
              
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No groups defined</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group: any) => {
                    // Make sure group service points are always an array, even if missing
                    const groupServicePoints = Array.isArray(group.servicePoints) ? group.servicePoints : [];
                    // Count completed service points in this group
                    const completedInGroup = groupServicePoints.filter((sp: any) => sp.status === "completed").length;
                    const isGroupExpanded = expandedGroups.includes(group.id);
                    
                    return (
                      <div key={group.id} className="border rounded-md">
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/20"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-sm sm:text-base truncate">{group.name}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {completedInGroup}/{groupServicePoints.length} service points
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Status indicator with traffic light - consistent placement */}
                            <StatusIndicator 
                              status={
                                completedInGroup === 0 
                                  ? "pending" 
                                  : completedInGroup === groupServicePoints.length 
                                    ? "completed" 
                                    : "partially_completed"
                              }
                              size="sm"
                            />
                            
                            {/* Quick complete button as check only */}
                            {completedInGroup < groupServicePoints.length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Mark all service points in this group as complete
                                  groupServicePoints.forEach((point: any) => {
                                    if (point.status !== "completed") {
                                      toggleCompleteServicePoint(point.id, point.status);
                                    }
                                  });
                                }}
                                title="Mark all service points in this group as complete"
                              >
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            )}
                            
                            {isGroupExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                        
                        {isGroupExpanded && (
                          <div className="border-t p-3 space-y-2">
                            {groupServicePoints.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No service points in this group</p>
                            ) : (
                              groupServicePoints.map((servicePoint: any) => (
                                <div 
                                  key={servicePoint.id} 
                                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/10"
                                >
                                  <div className="flex-1 mr-2 text-sm">
                                    {servicePoint.description}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {/* Status indicator with traffic light - consistent placement */}
                                    <StatusIndicator 
                                      status={servicePoint.status === "completed" ? "completed" : "pending"} 
                                      size="sm"
                                    />
                                    
                                    {/* Simple checkmark button */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={() => toggleCompleteServicePoint(servicePoint.id, servicePoint.status)}
                                      title={
                                        servicePoint.status === "completed" 
                                          ? "Mark as not completed" 
                                          : "Mark as completed"
                                      }
                                    >
                                      <Check 
                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${servicePoint.status === "completed" ? "opacity-50" : "opacity-100"}`} 
                                      />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Job Actions */}
            <div className="flex justify-end space-x-2 pt-2">
              {status === "completed" ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReopenJob}
                >
                  Reopen Job
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-primary hover:bg-primary-dark text-white" 
                  onClick={handleMarkJobComplete}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Complete Job
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}