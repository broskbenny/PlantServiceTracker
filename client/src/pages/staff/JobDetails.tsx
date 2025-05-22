import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";
import { useState } from "react";
import ServicePointItem from "@/components/ServicePointItem";
import { formatDate, getCompletionPercentage, getStatusColor, getStatusText } from "@/lib/utils";
import { ArrowLeft, MapPin, Phone, Clock, Key, FileText, MessageSquare } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

// Form schema for adding a message
const messageFormSchema = z.object({
  message: z.string().min(1, "Message is required"),
  notifyManagement: z.boolean().default(true),
  groupId: z.number().optional().nullable(),
  servicePointId: z.number().optional().nullable()
});

// Form schema for completing a job
const completeJobFormSchema = z.object({
  status: z.string(),
  message: z.string().optional()
});

export default function StaffJobDetails() {
  const { id } = useParams();
  const jobId = parseInt(id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isCompleteJobDialogOpen, setIsCompleteJobDialogOpen] = useState(false);
  
  const messageForm = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      message: "",
      notifyManagement: true,
      groupId: null,
      servicePointId: null
    },
  });
  
  const completeJobForm = useForm<z.infer<typeof completeJobFormSchema>>({
    resolver: zodResolver(completeJobFormSchema),
    defaultValues: {
      status: "completed",
      message: ""
    },
  });
  
  const { data: jobDetails, isLoading, error } = useQuery({
    queryKey: [`/api/jobs/${jobId}`],
  });
  
  const { data: messages } = useQuery({
    queryKey: [`/api/jobs/${jobId}/messages`],
    enabled: !!jobId
  });
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-center my-12">
          <p>Loading job details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !jobDetails) {
    return (
      <div className="p-4">
        <Link href="/staff/dashboard">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Tasks
          </Button>
        </Link>
        <Card className="p-6 text-center text-error">
          Error loading job details. Job might not exist or you don't have permission to view it.
        </Card>
      </div>
    );
  }
  
  const { job, customer, groups, servicePoints, assignedTo } = jobDetails;
  
  // Verify that the job is assigned to the current user
  if (assignedTo.id !== user?.id) {
    return (
      <div className="p-4">
        <Link href="/staff/dashboard">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Tasks
          </Button>
        </Link>
        <Card className="p-6 text-center text-error">
          You don't have permission to view this job.
        </Card>
      </div>
    );
  }
  
  // Count completed service points
  const completedPoints = servicePoints.filter((point: any) => point.status === "completed").length;
  const totalPoints = servicePoints.length;
  const progressPercentage = getCompletionPercentage(completedPoints, totalPoints);
  
  const onSubmitMessage = async (data: z.infer<typeof messageFormSchema>) => {
    try {
      console.log("Submitting message:", data);
      
      const response = await fetch(`/api/jobs/${jobId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: data.message,
          notifyManagement: data.notifyManagement || false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to add message:", errorData);
        throw new Error(errorData);
      }
      
      const result = await response.json();
      console.log("Message added successfully:", result);
      
      toast({
        title: "Success",
        description: "Message added successfully",
      });
      
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/messages`] });
      
      // Close the dialog and reset form
      setIsMessageDialogOpen(false);
      messageForm.reset();
    } catch (error) {
      console.error("Error adding message:", error);
      toast({
        title: "Error",
        description: "Failed to add message",
        variant: "destructive",
      });
    }
  };
  
  const onCompleteJob = async (data: z.infer<typeof completeJobFormSchema>) => {
    // Check if all service points are completed
    if (completedPoints < totalPoints) {
      const uncompletedPoints = totalPoints - completedPoints;
      const confirmComplete = window.confirm(
        `There are still ${uncompletedPoints} uncompleted service points. Are you sure you want to complete the job?`
      );
      
      if (!confirmComplete) return;
    }
    
    try {
      console.log("Completing job:", jobId, "with data:", data);
      
      // Update job status with direct fetch for better error handling
      const jobResponse = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: data.status })
      });
      
      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();
        console.error("Failed to update job status:", errorText);
        throw new Error(`Failed to update job status: ${errorText}`);
      }
      
      console.log("Job status updated successfully");
      
      // Add message if provided
      if (data.message && data.message.trim() !== '') {
        console.log("Adding completion message:", data.message);
        
        const messageResponse = await fetch(`/api/jobs/${jobId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            message: data.message,
            notifyManagement: false
          })
        });
        
        if (!messageResponse.ok) {
          console.warn("Failed to add completion message, but job was marked complete");
        } else {
          console.log("Completion message added successfully");
        }
      }
      
      toast({
        title: "Success",
        description: "Job completed successfully",
      });
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      // Close the dialog and reset form
      setIsCompleteJobDialogOpen(false);
      completeJobForm.reset();
    } catch (error) {
      console.error("Error completing job:", error);
      toast({
        title: "Error",
        description: "Failed to complete job",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 pb-16 md:pb-4">
      <Link href="/staff/dashboard">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Tasks
        </Button>
      </Link>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-medium">{customer.name}</h1>
              <p className="text-neutral-500">{formatDate(job.date)}</p>
            </div>
            <Badge className={getStatusColor(job.status)}>
              {getStatusText(job.status)}
            </Badge>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-neutral-500">Completion Progress</span>
              <span className="text-sm font-medium text-neutral-500">{completedPoints}/{totalPoints}</span>
            </div>
            <Progress value={progressPercentage} className="h-2.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-500 mb-1">Customer Details</h3>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-sm mb-1">
                  <span className="font-medium">Contact:</span> {customer.contact}
                </p>
                <div className="flex items-center text-sm mb-1">
                  <Phone className="h-4 w-4 mr-1 text-neutral-500" /> {customer.phone}
                </div>
                <div className="flex items-center text-sm mb-1">
                  <Clock className="h-4 w-4 mr-1 text-neutral-500" /> {customer.openingHours}
                </div>
                {customer.entryCode && (
                  <div className="flex items-center text-sm">
                    <Key className="h-4 w-4 mr-1 text-neutral-500" /> {customer.entryCode}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-500 mb-1">Location</h3>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-sm mb-2">{customer.address}</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-secondary text-sm flex items-center">
                  <MapPin className="h-4 w-4 mr-1" /> Get Directions
                </a>
              </div>
            </div>
          </div>

          {customer.siteNotes && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-neutral-500 mb-1">Site Notes</h3>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-sm">{customer.siteNotes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Service Points</h2>
          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-secondary">
                <MessageSquare className="h-4 w-4 mr-1" /> Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Job Note</DialogTitle>
              </DialogHeader>
              <Form {...messageForm}>
                <form onSubmit={messageForm.handleSubmit(onSubmitMessage)} className="space-y-4">
                  <FormField
                    control={messageForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your message or note about this job" 
                            rows={4} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={messageForm.control}
                    name="notifyManagement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            id="notifyManagement" 
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel htmlFor="notifyManagement">
                            Flag for manager's attention
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" className="bg-primary hover:bg-primary-dark text-white">
                      Add Note
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {groups.length > 0 ? (
          groups.map(({ group, servicePoints: groupPoints }: any) => (
            <Card key={group.id} className="mb-4">
              <div className="p-4 border-b border-neutral-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{group.name}</h3>
                  <span className="text-sm text-neutral-500">
                    {groupPoints.filter((p: any) => p.status === "completed").length}/{groupPoints.length} completed
                  </span>
                </div>
              </div>
              <div className="p-4">
                <ul className="divide-y divide-neutral-100">
                  {groupPoints.map((point: any) => (
                    <ServicePointItem 
                      key={point.id} 
                      point={point} 
                      userRole="staff" 
                    />
                  ))}
                </ul>
              </div>
            </Card>
          ))
        ) : (
          <Card className="mb-4">
            <div className="p-4">
              <ul className="divide-y divide-neutral-100">
                {servicePoints.map((point: any) => (
                  <ServicePointItem 
                    key={point.id} 
                    point={point}
                    userRole="staff" 
                  />
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
      
      {messages && messages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">Job Messages</h2>
          <Card>
            <div className="p-4">
              <ul className="divide-y divide-neutral-100">
                {messages.map((message: any) => (
                  <li key={message.id} className="py-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{message.user.fullName}</span>
                      <span className="text-xs text-neutral-500">{formatDate(message.timestamp, "MMM d, h:mm a")}</span>
                    </div>
                    <p className="text-sm mb-1">{message.message}</p>
                    {message.notifyManagement && (
                      <Badge variant="outline" className="text-warning border-warning text-xs">
                        Flagged for attention
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
      
      {job.status !== "completed" && (
        <Dialog open={isCompleteJobDialogOpen} onOpenChange={setIsCompleteJobDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary-dark text-white">
              Complete Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
            </DialogHeader>
            <Form {...completeJobForm}>
              <form onSubmit={completeJobForm.handleSubmit(onCompleteJob)} className="space-y-4">
                <FormField
                  control={completeJobForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a note about the completed job" 
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" className="bg-primary hover:bg-primary-dark text-white">
                    Mark as Completed
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
