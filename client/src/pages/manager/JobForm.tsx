import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Trash, Plus } from "lucide-react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

// Form schema for job creation
const jobFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({
    required_error: "Job date is required",
  }),
  assignedToId: z.string().min(1, "Assignment is required"),
  plantCount: z.string().min(1, "Plant count is required"),
  isRecurring: z.boolean().default(false),
  groups: z.array(
    z.object({
      name: z.string().min(1, "Group name is required"),
      servicePoints: z.array(
        z.object({
          plantType: z.string().optional(),
          potType: z.string().optional(),
        })
      )
    })
  ).optional(),
  servicePoints: z.array(
    z.object({
      plantType: z.string().optional(),
      potType: z.string().optional(),
    })
  ).optional(),
});

export default function ManagerJobForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof jobFormSchema>>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      customerId: "",
      date: new Date(),
      assignedToId: "",
      plantCount: "",
      isRecurring: false,
      groups: [],
      servicePoints: [{ plantType: "", potType: "" }],
    }
  });
  
  // Fetch customers for the dropdown
  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });
  
  // Fetch staff for the dropdown
  const { data: staff } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Field arrays for groups and service points
  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: form.control,
    name: "groups",
  });
  
  const { fields: servicePointFields, append: appendServicePoint, remove: removeServicePoint } = useFieldArray({
    control: form.control,
    name: "servicePoints",
  });
  
  const onSubmit = async (data: z.infer<typeof jobFormSchema>) => {
    setIsSubmitting(true);
    
    try {
      console.log("Submitting form data:", data);
      
      // Convert IDs from string to number
      const customerId = parseInt(data.customerId);
      const assignedToId = parseInt(data.assignedToId);
      const plantCount = parseInt(data.plantCount);
      
      // Format date for API
      const formattedDate = data.date.toISOString().split('T')[0];
      
      // Create job with required fields
      const jobPayload = {
        customerId,
        assignedToId,
        date: formattedDate,
        plantCount,
        isRecurring: data.isRecurring || false,
        status: "assigned"
      };
      
      console.log("Sending job payload:", jobPayload);
      
      // Create job using fetch to better handle any potential issues
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(jobPayload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Job creation failed:", errorData);
        throw new Error(`Failed to create job: ${errorData.message || 'Unknown error'}`);
      }
      
      const jobData = await response.json();
      console.log("Job created successfully:", jobData);
      const jobId = jobData.id;
      
      // Create groups and their service points
      if (data.groups && data.groups.length > 0) {
        for (const group of data.groups) {
          try {
            // Create group
            const groupResponse = await fetch(`/api/jobs/${jobId}/groups`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
              },
              body: JSON.stringify({
                name: group.name,
                jobId
              })
            });
            
            if (!groupResponse.ok) {
              console.error("Failed to create group:", await groupResponse.text());
              continue;
            }
            
            const groupData = await groupResponse.json();
            const groupId = groupData.id;
            
            // Create service points for the group
            if (group.servicePoints && group.servicePoints.length > 0) {
              for (const point of group.servicePoints) {
                try {
                  await fetch(`/api/jobs/${jobId}/service-points`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                      plantType: point.plantType || "Unnamed Plant",
                      potType: point.potType || "Standard Pot",
                      groupId,
                      jobId
                    })
                  });
                } catch (error) {
                  console.error("Error creating service point:", error);
                }
              }
            }
          } catch (error) {
            console.error("Error processing group:", error);
          }
        }
      }
      
      // Create direct service points
      if (data.servicePoints && data.servicePoints.length > 0) {
        for (const point of data.servicePoints) {
          try {
            await fetch(`/api/jobs/${jobId}/service-points`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
              },
              body: JSON.stringify({
                plantType: point.plantType || "Unnamed Plant",
                potType: point.potType || "Standard Pot",
                jobId
              })
            });
          } catch (error) {
            console.error("Error creating service point:", error);
          }
        }
      }
      
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      // Redirect to the job details page
      setLocation(`/manager/jobs/${jobId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-[100vw]">
      <Link href="/manager/dashboard">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </Link>
      
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Create New Job</h1>
        <p className="text-neutral-500">
          Fill in the job details below
        </p>
      </div>
      
      <Card className="w-full shadow">
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(customers) ? customers.map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name}
                              </SelectItem>
                            )) : (
                              <SelectItem value="loading">Loading customers...</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(staff) 
                              ? staff
                                  .filter((user: any) => user.role === "staff")
                                  .map((staffMember: any) => (
                                    <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                                      {staffMember.fullName}
                                    </SelectItem>
                                  ))
                              : (
                                <SelectItem value="loading">Loading staff members...</SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Job Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  formatDate(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="plantCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Plant Count</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="32" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Recurring Job</FormLabel>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Groups Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Groups (Optional)</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => appendGroup({ name: "", servicePoints: [{ plantType: "", potType: "" }] })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Group
                  </Button>
                </div>
                
                {groupFields.map((groupField, groupIndex) => (
                  <Card key={groupField.id} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <FormField
                        control={form.control}
                        name={`groups.${groupIndex}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1 mr-4">
                            <FormLabel>Group Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Main Lobby" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-error"
                        onClick={() => removeGroup(groupIndex)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Service Points</h4>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const updatedGroups = [...form.getValues("groups") || []];
                            if (!updatedGroups[groupIndex].servicePoints) {
                              updatedGroups[groupIndex].servicePoints = [];
                            }
                            updatedGroups[groupIndex].servicePoints.push({ plantType: "", potType: "" });
                            form.setValue("groups", updatedGroups);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Service Point
                        </Button>
                      </div>
                      
                      {(form.getValues(`groups.${groupIndex}.servicePoints`) || []).map((_, pointIndex) => (
                        <div key={pointIndex} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 border rounded-md">
                          <FormField
                            control={form.control}
                            name={`groups.${groupIndex}.servicePoints.${pointIndex}.plantType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plant Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ficus Tree" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`groups.${groupIndex}.servicePoints.${pointIndex}.potType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pot Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ceramic - Large" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Direct Service Points Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Service Points</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => appendServicePoint({ plantType: "", potType: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Service Point
                  </Button>
                </div>
                
                {servicePointFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`servicePoints.${index}.plantType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plant Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Monstera" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`servicePoints.${index}.potType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pot Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Plastic - Medium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="text-error mt-auto"
                        onClick={() => {
                          if (servicePointFields.length > 1) {
                            removeServicePoint(index);
                          } else {
                            toast({
                              title: "Cannot remove",
                              description: "At least one service point is required",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Trash className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2 pt-4">
                <Link href="/manager/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" type="button" className="w-full">Cancel</Button>
                </Link>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-dark text-white w-full sm:w-auto" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Job'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
