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
import { ArrowLeft, MapPin, Phone, Clock, Key, FileText, User, MoreVertical, MessageSquare, Check } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for adding a message
const messageFormSchema = z.object({
  message: z.string().min(1, "Message is required"),
  notifyManagement: z.boolean().default(true),
  groupId: z.number().optional().nullable(),
  servicePointId: z.number().optional().nullable()
});

export default function ManagerJobDetails() {
  const { id } = useParams();
  const jobId = parseInt(id || "0");
  const { toast } = useToast();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Query available staff members for reassignment
  const { data: staffMembers } = useQuery({
    queryKey: ['/api/staff'],
    enabled: isStaffDialogOpen // Only fetch when dialog is open
  });
  
  const form = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      message: "",
      notifyManagement: true,
      groupId: null,
      servicePointId: null
    },
  });
  
  const { data: jobDetails, isLoading, error, refetch } = useQuery({
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
        <Link href="/manager/dashboard">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Card className="p-6 text-center text-error">
          Error loading job details. Job might not exist or you don't have permission to view it.
        </Card>
      </div>
    );
  }
  
  const { job, customer, groups, servicePoints, assignedTo } = jobDetails;
  
  // Count completed service points
  const completedPoints = servicePoints.filter((point: any) => point.status === "completed").length;
  const totalPoints = servicePoints.length;
  const progressPercentage = getCompletionPercentage(completedPoints, totalPoints);
  
  const onSubmitMessage = async (data: z.infer<typeof messageFormSchema>) => {
    try {
      await apiRequest("POST", `/api/jobs/${jobId}/messages`, data);
      
      toast({
        title: "Success",
        description: "Message added successfully",
      });
      
      // Invalidate the messages query
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/messages`] });
      
      // Close the dialog and reset form
      setIsMessageDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <Link href="/manager/dashboard">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-medium">{customer.name}</h1>
              <p className="text-neutral-500">{formatDate(job.date)}</p>
            </div>
            <div className="flex items-center">
              <Badge className={getStatusColor(job.status)}>
                {getStatusText(job.status)}
              </Badge>
            </div>
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

          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-500 mb-1">Assignment</h3>
            <div className="bg-neutral-50 p-3 rounded-lg flex justify-between items-center">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium">{assignedTo.fullName}</p>
                  <p className="text-xs text-neutral-500">Assigned on {formatDate(job.date, "MMM d")}</p>
                </div>
              </div>
              <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Change</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] rounded-lg">
                  <DialogHeader>
                    <DialogTitle className="text-center">Reassign Job</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <h4 className="text-sm font-medium mb-3">Choose New Staff Member</h4>
                    {staffMembers && staffMembers.length > 0 ? (
                      <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a staff member" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-auto">
                          {staffMembers.map((staff: any) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center justify-center py-4">
                        <p className="text-sm text-neutral-500">Loading staff members...</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                    </DialogClose>
                    <Button 
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        if (!selectedStaffId) return;
                        
                        setIsAssigning(true);
                        try {
                          const response = await fetch(`/api/jobs/${jobId}/assign`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ staffId: selectedStaffId })
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to reassign job');
                          }
                          
                          // Refetch job details
                          setTimeout(() => {
                            refetch();
                          }, 500);
                          
                          toast({
                            title: "Job Reassigned",
                            description: "The job has been successfully reassigned."
                          });
                          
                          setIsStaffDialogOpen(false);
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to reassign job. Please try again.",
                            variant: "destructive"
                          });
                        } finally {
                          setIsAssigning(false);
                        }
                      }}
                      disabled={!selectedStaffId || isAssigning}
                    >
                      {isAssigning ? "Reassigning..." : "Reassign"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitMessage)} className="space-y-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                            Flag for attention
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
                      userRole="manager" 
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
                    userRole="manager" 
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
    </div>
  );
}
