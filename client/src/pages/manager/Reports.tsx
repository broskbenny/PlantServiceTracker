import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Check, FileText, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define form schema for filtering
const formSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  staffId: z.string().optional(),
  customerId: z.string().optional(),
});

export default function ManagerReports() {
  const [activeTab, setActiveTab] = useState("completed-jobs");
  const [filterParams, setFilterParams] = useState<any>(null);
  const { toast } = useToast();

  // Get all staff
  const { data: staffMembers, isLoading: isStaffLoading } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const response = await apiRequest("/api/staff");
      return response || [];
    },
  });

  // Get all customers
  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("/api/customers");
      return response || [];
    },
  });

  // Query for completed jobs report
  const {
    data: completedJobs,
    isLoading: isReportLoading,
    isFetching,
  } = useQuery({
    queryKey: ["/api/reports/completed-jobs", filterParams],
    queryFn: async () => {
      if (!filterParams) return null;

      // Construct query params
      const params = new URLSearchParams();
      if (filterParams.dateFrom) {
        params.append("dateFrom", filterParams.dateFrom.toISOString().split("T")[0]);
      }
      if (filterParams.dateTo) {
        params.append("dateTo", filterParams.dateTo.toISOString().split("T")[0]);
      }
      if (filterParams.staffId && filterParams.staffId !== "all") {
        params.append("staffId", filterParams.staffId);
      }
      if (filterParams.customerId && filterParams.customerId !== "all") {
        params.append("customerId", filterParams.customerId);
      }

      const url = `/api/reports/completed-jobs?${params.toString()}`;
      const response = await apiRequest(url);
      return response || [];
    },
    enabled: !!filterParams,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateFrom: undefined,
      dateTo: undefined,
      staffId: "all",
      customerId: "all",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setFilterParams(values);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate reports to track completed jobs and performance
        </p>
      </div>

      <Tabs defaultValue="completed-jobs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="completed-jobs" className="flex items-center">
            <Check className="mr-2 h-4 w-4" />
            Completed Jobs
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed-jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Jobs Report</CardTitle>
              <CardDescription>
                Filter completed jobs by date range, staff member, and customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date From */}
                    <FormField
                      control={form.control}
                      name="dateFrom"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>From Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    formatDate(field.value, "MMM dd, yyyy")
                                  ) : (
                                    <span className="text-muted-foreground">Select start date</span>
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
                                  date > new Date() || (form.watch("dateTo") ? date > form.watch("dateTo") : false)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date To */}
                    <FormField
                      control={form.control}
                      name="dateTo"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>To Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    formatDate(field.value, "MMM dd, yyyy")
                                  ) : (
                                    <span className="text-muted-foreground">Select end date</span>
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
                                  date > new Date() || (form.watch("dateFrom") ? date < form.watch("dateFrom") : false)
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Staff Member */}
                    <FormField
                      control={form.control}
                      name="staffId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Staff</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Staff</SelectItem>
                              {!isStaffLoading &&
                                staffMembers?.map((staff: any) => (
                                  <SelectItem key={staff.id} value={staff.id.toString()}>
                                    {staff.fullName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Customer */}
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
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Customers</SelectItem>
                              {!isCustomersLoading &&
                                customers?.map((customer: any) => (
                                  <SelectItem
                                    key={customer.id}
                                    value={customer.id.toString()}
                                  >
                                    {customer.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isReportLoading || isFetching}
                      className="flex items-center"
                    >
                      {(isReportLoading || isFetching) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Report...
                        </>
                      ) : (
                        <>
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Report Results */}
          {filterParams && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Report Results</CardTitle>
                  <CardDescription>
                    {filterParams.dateFrom && filterParams.dateTo
                      ? `${formatDate(filterParams.dateFrom, "MMM dd, yyyy")} to ${formatDate(
                          filterParams.dateTo,
                          "MMM dd, yyyy"
                        )}`
                      : filterParams.dateFrom
                      ? `From ${formatDate(filterParams.dateFrom, "MMM dd, yyyy")}`
                      : filterParams.dateTo
                      ? `Until ${formatDate(filterParams.dateTo, "MMM dd, yyyy")}`
                      : "All dates"}
                  </CardDescription>
                </div>
                <Button variant="outline" className="flex items-center" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isReportLoading || isFetching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !completedJobs || completedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No completed jobs found for the selected criteria.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Completed</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Plants</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedJobs.map((job: any) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              {formatDate(job.date, "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>{job.customer.name}</TableCell>
                            <TableCell>
                              {job.customer.address.split(",")[0]}
                            </TableCell>
                            <TableCell>{job.staffMember.fullName}</TableCell>
                            <TableCell>{job.plantCount}</TableCell>
                            <TableCell className="text-right">
                              <Link href={`/manager/jobs/${job.id}`}>
                                <Button variant="ghost" size="sm">
                                  View Details
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              {completedJobs && completedJobs.length > 0 && (
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {completedJobs.length} completed job(s)
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center min-h-[200px]">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-center text-muted-foreground">
                Performance reports will be available in a future update
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}