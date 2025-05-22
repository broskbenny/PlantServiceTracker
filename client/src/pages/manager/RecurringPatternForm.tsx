import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define schema for form validation
const formSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]),
  customInterval: z.number().min(1).max(365).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  startDate: z.date(),
  endType: z.enum(["never", "after", "on"]),
  endAfterOccurrences: z.number().min(1).max(100).optional(),
  endDate: z.date().optional(),
  customerId: z.number(),
  assignedToId: z.number(),
  plantCount: z.number().min(1).max(1000),
  // Template job details
  templateJobName: z.string().min(1).max(100),
  includeGroups: z.boolean().default(false),
  groups: z.array(
    z.object({
      name: z.string(),
      servicePoints: z.array(
        z.object({
          plantType: z.string().optional(),
          potType: z.string().optional(),
        })
      )
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Customer {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  fullName: string;
}

interface RecurringPattern {
  id: number;
  frequency: string;
  customInterval: number | null;
  daysOfWeek: string[] | null;
  startDate: string;
  endDate: string | null;
  endAfterOccurrences: number | null;
  templateJob?: {
    id: number;
    customerId: number;
    assignedToId: number;
    plantCount: number;
    name?: string;
    groups?: Array<{
      id: number;
      name: string;
      servicePoints: Array<{
        id: number;
        plantType: string | null;
        potType: string | null;
      }>;
    }>;
  };
}

export default function RecurringPatternForm({ id }: { id?: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!id;
  const [activeTab, setActiveTab] = useState("pattern");

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequency: "weekly",
      startDate: new Date(),
      endType: "never",
      plantCount: 1,
      templateJobName: "",
      includeGroups: false,
      groups: [],
      daysOfWeek: ["monday"],
    },
  });
  
  // Fetch customers for dropdown
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("/api/customers");
      return response.customers as Customer[];
    }
  });
  
  // Fetch staff for dropdown
  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/users/staff"],
    queryFn: async () => {
      const response = await apiRequest("/api/users/staff");
      return response.staff as Staff[];
    }
  });
  
  // Fetch recurring pattern if editing
  const { data: pattern, isLoading: isLoadingPattern } = useQuery({
    queryKey: ["/api/recurring-patterns", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest(`/api/recurring-patterns/${id}`);
      return response.pattern as RecurringPattern;
    },
    enabled: isEditMode,
  });
  
  // Update form values when pattern data is loaded
  useEffect(() => {
    if (pattern && !isLoadingPattern) {
      // Determine end type based on pattern data
      let endType: "never" | "after" | "on" = "never";
      if (pattern.endDate) {
        endType = "on";
      } else if (pattern.endAfterOccurrences) {
        endType = "after";
      }
      
      // Update form values
      form.reset({
        frequency: pattern.frequency as any,
        customInterval: pattern.customInterval || undefined,
        daysOfWeek: pattern.daysOfWeek || undefined,
        startDate: new Date(pattern.startDate),
        endType,
        endAfterOccurrences: pattern.endAfterOccurrences || undefined,
        endDate: pattern.endDate ? new Date(pattern.endDate) : undefined,
        customerId: pattern.templateJob?.customerId || 0,
        assignedToId: pattern.templateJob?.assignedToId || 0,
        plantCount: pattern.templateJob?.plantCount || 1,
        templateJobName: pattern.templateJob?.name || "",
        includeGroups: pattern.templateJob?.groups && pattern.templateJob.groups.length > 0,
        groups: pattern.templateJob?.groups?.map(group => ({
          name: group.name,
          servicePoints: group.servicePoints.map(sp => ({
            plantType: sp.plantType || undefined,
            potType: sp.potType || undefined,
          }))
        })) || [],
      });
    }
  }, [pattern, isLoadingPattern, form]);
  
  // Create/update mutation
  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      if (isEditMode) {
        // Update existing pattern
        await apiRequest(`/api/recurring-patterns/${id}`, {
          method: "PUT",
          data: formData
        });
        
        toast({
          title: "Success",
          description: "Recurring pattern updated successfully",
        });
      } else {
        // Create new pattern
        await apiRequest("/api/recurring-patterns", {
          method: "POST",
          data: formData
        });
        
        toast({
          title: "Success",
          description: "Recurring pattern created successfully",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-patterns"] });
      navigate("/manager/recurring-patterns");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save recurring pattern",
        variant: "destructive",
      });
    }
  });
  
  // Handle group and service point management
  const [groups, setGroups] = useState<Array<{
    name: string;
    servicePoints: Array<{
      plantType?: string;
      potType?: string;
    }>;
  }>>([]);
  
  // Add empty group
  const addGroup = () => {
    setGroups([...groups, { name: "", servicePoints: [] }]);
  };
  
  // Add service point to group
  const addServicePoint = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicePoints.push({ plantType: "", potType: "" });
    setGroups(newGroups);
  };
  
  // Update group name
  const updateGroupName = (groupIndex: number, name: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex].name = name;
    setGroups(newGroups);
  };
  
  // Update service point
  const updateServicePoint = (
    groupIndex: number,
    pointIndex: number,
    field: "plantType" | "potType",
    value: string
  ) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicePoints[pointIndex][field] = value;
    setGroups(newGroups);
  };
  
  // Remove group
  const removeGroup = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups.splice(groupIndex, 1);
    setGroups(newGroups);
  };
  
  // Remove service point
  const removeServicePoint = (groupIndex: number, pointIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].servicePoints.splice(pointIndex, 1);
    setGroups(newGroups);
  };
  
  // Initialize groups when includeGroups changes or when editing
  useEffect(() => {
    if (form.watch("includeGroups") && groups.length === 0) {
      const initialGroups = pattern?.templateJob?.groups?.map(group => ({
        name: group.name,
        servicePoints: group.servicePoints.map(sp => ({
          plantType: sp.plantType || undefined,
          potType: sp.potType || undefined,
        }))
      })) || [{ name: "", servicePoints: [{ plantType: "", potType: "" }] }];
      
      setGroups(initialGroups);
    }
  }, [form.watch("includeGroups"), pattern?.templateJob?.groups]);
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Prepare data for API
    const formData: any = {
      frequency: values.frequency,
      startDate: format(values.startDate, "yyyy-MM-dd"),
    };
    
    // Add frequency-specific fields
    if (values.frequency === "custom") {
      formData.customInterval = values.customInterval;
    }
    
    if (["weekly", "biweekly", "monthly"].includes(values.frequency)) {
      formData.daysOfWeek = values.daysOfWeek;
    }
    
    // Add end condition
    if (values.endType === "after") {
      formData.endAfterOccurrences = values.endAfterOccurrences;
      formData.endDate = null;
    } else if (values.endType === "on") {
      formData.endDate = values.endDate ? format(values.endDate, "yyyy-MM-dd") : null;
      formData.endAfterOccurrences = null;
    } else {
      formData.endDate = null;
      formData.endAfterOccurrences = null;
    }
    
    // Add template job details
    formData.templateJob = {
      customerId: values.customerId,
      assignedToId: values.assignedToId,
      plantCount: values.plantCount,
      name: values.templateJobName,
    };
    
    // Add groups and service points if included
    if (values.includeGroups && groups.length > 0) {
      formData.templateJob.groups = groups.map(group => ({
        name: group.name,
        servicePoints: group.servicePoints.map(point => ({
          plantType: point.plantType || null,
          potType: point.potType || null,
        }))
      }));
    }
    
    // Submit the data
    mutation.mutate(formData);
  };
  
  const isLoading = isLoadingCustomers || isLoadingStaff || (isEditMode && isLoadingPattern);
  const isPending = mutation.isPending;
  
  // Helper function to get day name display
  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    };
    return days[day] || day;
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/manager/recurring-patterns")} className="mr-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Recurring Pattern" : "Create New Recurring Pattern"}
        </h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="pattern">Pattern Settings</TabsTrigger>
                <TabsTrigger value="template">Template Job</TabsTrigger>
              </TabsList>
              
              {/* Pattern Settings Tab */}
              <TabsContent value="pattern" className="space-y-6 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recurrence Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Frequency */}
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Custom Interval (if frequency is custom) */}
                    {form.watch("frequency") === "custom" && (
                      <FormField
                        control={form.control}
                        name="customInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interval (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={365} 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                value={field.value || 1}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of days between occurrences
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Days of Week (if frequency is weekly, biweekly, or monthly) */}
                    {["weekly", "biweekly", "monthly"].includes(form.watch("frequency")) && (
                      <FormField
                        control={form.control}
                        name="daysOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days of Week</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                                <div key={day} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={day}
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, day]);
                                      } else {
                                        field.onChange(
                                          currentValue.filter((d) => d !== day)
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={day}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {getDayName(day)}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Start Date */}
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* End Condition */}
                    <FormField
                      control={form.control}
                      name="endType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>End Condition</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="never" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Never end
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="after" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center">
                                  End after
                                  <Input
                                    type="number"
                                    className="w-16 ml-2 mr-2"
                                    min={1}
                                    max={100}
                                    value={form.watch("endAfterOccurrences") || 10}
                                    onChange={(e) => {
                                      form.setValue("endType", "after");
                                      form.setValue(
                                        "endAfterOccurrences",
                                        parseInt(e.target.value) || 10
                                      );
                                    }}
                                    disabled={form.watch("endType") !== "after"}
                                  />
                                  occurrences
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="on" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center">
                                  End on
                                  <div className="ml-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "ml-2 pl-3 text-left font-normal",
                                            !form.watch("endDate") && "text-muted-foreground"
                                          )}
                                          onClick={() => form.setValue("endType", "on")}
                                          disabled={form.watch("endType") !== "on"}
                                        >
                                          {form.watch("endDate") ? (
                                            format(form.watch("endDate"), "PPP")
                                          ) : (
                                            <span>Pick a date</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={form.watch("endDate")}
                                          onSelect={(date) => {
                                            form.setValue("endType", "on");
                                            form.setValue("endDate", date);
                                          }}
                                          disabled={(date) =>
                                            date < form.watch("startDate")
                                          }
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Template Job Tab */}
              <TabsContent value="template" className="space-y-6 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Job Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Template Job Name */}
                    <FormField
                      control={form.control}
                      name="templateJobName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter job template name" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this job template
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Customer Selection */}
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers?.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Staff Assignment */}
                    <FormField
                      control={form.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Staff</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {staff?.map((member) => (
                                <SelectItem key={member.id} value={member.id.toString()}>
                                  {member.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Plant Count */}
                    <FormField
                      control={form.control}
                      name="plantCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Plants</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Total number of plants for this job
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Include Groups Toggle */}
                    <FormField
                      control={form.control}
                      name="includeGroups"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Define Groups & Service Points
                            </FormLabel>
                            <FormDescription>
                              Organize plants into logical groups and define service points
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {/* Groups and Service Points */}
                    {form.watch("includeGroups") && (
                      <div className="space-y-4 border rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Groups & Service Points</h3>
                          <Button type="button" variant="outline" onClick={addGroup}>
                            Add Group
                          </Button>
                        </div>
                        
                        {groups.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            No groups defined. Add a group to start organizing service points.
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {groups.map((group, groupIndex) => (
                              <div key={groupIndex} className="border rounded-md p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className="w-full mr-2">
                                    <FormLabel htmlFor={`group-${groupIndex}`}>
                                      Group Name
                                    </FormLabel>
                                    <Input
                                      id={`group-${groupIndex}`}
                                      placeholder="e.g., Main Floor, Lobby, etc."
                                      value={group.name}
                                      onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeGroup(groupIndex)}
                                    className="mt-6"
                                  >
                                    Remove
                                  </Button>
                                </div>
                                
                                {/* Service Points */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <FormLabel>Service Points</FormLabel>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addServicePoint(groupIndex)}
                                    >
                                      Add Service Point
                                    </Button>
                                  </div>
                                  
                                  {group.servicePoints.length === 0 ? (
                                    <div className="text-center py-2 text-sm text-muted-foreground">
                                      No service points in this group.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {group.servicePoints.map((point, pointIndex) => (
                                        <div key={pointIndex} className="grid grid-cols-3 gap-2 items-end">
                                          <div>
                                            <FormLabel htmlFor={`plant-type-${groupIndex}-${pointIndex}`} className="text-xs">
                                              Plant Type
                                            </FormLabel>
                                            <Input
                                              id={`plant-type-${groupIndex}-${pointIndex}`}
                                              placeholder="Plant Type"
                                              value={point.plantType || ""}
                                              onChange={(e) =>
                                                updateServicePoint(
                                                  groupIndex,
                                                  pointIndex,
                                                  "plantType",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                          <div>
                                            <FormLabel htmlFor={`pot-type-${groupIndex}-${pointIndex}`} className="text-xs">
                                              Pot Type
                                            </FormLabel>
                                            <Input
                                              id={`pot-type-${groupIndex}-${pointIndex}`}
                                              placeholder="Pot Type"
                                              value={point.potType || ""}
                                              onChange={(e) =>
                                                updateServicePoint(
                                                  groupIndex,
                                                  pointIndex,
                                                  "potType",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeServicePoint(groupIndex, pointIndex)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manager/recurring-patterns")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode ? (
                  "Update Pattern"
                ) : (
                  "Create Pattern"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}