import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import JobCard from "@/components/JobCard";
import AttentionItem from "@/components/AttentionItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ChevronRight, CircleAlert, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [visibleDate, setVisibleDate] = useState(new Date());
  
  // Format date for API request
  const dateString = visibleDate.toISOString().split('T')[0];
  
  // Fetch jobs for today
  const { data: todayJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: [`/api/jobs/date/${dateString}`],
  });
  
  // Fetch all jobs for upcoming jobs
  const { data: allJobs } = useQuery({
    queryKey: ["/api/jobs"],
  });
  
  // Fetch attention items
  const { data: attentionItems, isLoading: isLoadingAttention } = useQuery({
    queryKey: ["/api/messages"],
  });
  
  // Filter jobs for today and upcoming
  const upcomingJobs = allJobs?.filter(
    (job: any) => new Date(job.date) > new Date()
  ) || [];
  
  // Calculate unread attention items
  const unreadAttentionItems = attentionItems?.filter(
    (item: any) => item.status === "unread"
  ) || [];

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Manager Dashboard</h1>
        <p className="text-neutral-500">Today is {formatDate(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>
      
      <Tabs defaultValue="today" className="mb-8">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
          <TabsTrigger value="this-week">This Week</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-medium">Today's Schedule</h2>
            <Link href="/manager/jobs/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                Create Job
              </Button>
            </Link>
          </div>
          
          {isLoadingJobs ? (
            <div className="flex justify-center my-8">
              <p>Loading jobs...</p>
            </div>
          ) : todayJobs?.length ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
              {todayJobs.map((job: any) => (
                <JobCard key={job.id} job={job} userRole="manager" />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-neutral-500 mb-4">No jobs scheduled for today</p>
              <Link href="/manager/jobs/new">
                <Button className="bg-primary hover:bg-primary-dark text-white">
                  Create New Job
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="tomorrow" className="mt-4">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
            <h3 className="font-medium text-lg mb-2">Tomorrow's Schedule</h3>
            <p className="text-neutral-500 mb-4">This feature is coming soon</p>
          </div>
        </TabsContent>
        <TabsContent value="this-week" className="mt-4">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
            <h3 className="font-medium text-lg mb-2">This Week's Schedule</h3>
            <p className="text-neutral-500 mb-4">This feature is coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium flex items-center">
            Items Requiring Attention
            {unreadAttentionItems.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-error text-white text-xs rounded-full">
                {unreadAttentionItems.length}
              </span>
            )}
          </h2>
          <Link href="/manager/attention">
            <Button variant="ghost" className="text-secondary flex items-center">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        
        {isLoadingAttention ? (
          <div className="flex justify-center my-8">
            <p>Loading attention items...</p>
          </div>
        ) : attentionItems?.length ? (
          <div>
            {attentionItems.slice(0, 3).map((item: any) => (
              <AttentionItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <CircleAlert className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
            <h3 className="font-medium text-lg mb-2">No Items Requiring Attention</h3>
            <p className="text-neutral-500">
              When staff flag issues during service, they'll appear here
            </p>
          </Card>
        )}
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4">Upcoming Jobs</h2>
        
        {upcomingJobs.length ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {upcomingJobs.slice(0, 3).map((job: any) => (
              <JobCard key={job.id} job={job} userRole="manager" />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
            <h3 className="font-medium text-lg mb-2">No Upcoming Jobs</h3>
            <p className="text-neutral-500 mb-4">
              Create new jobs to see them in your schedule
            </p>
            <Link href="/manager/jobs/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                Create New Job
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
