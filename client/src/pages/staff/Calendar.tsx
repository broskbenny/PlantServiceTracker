import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function StaffCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState(new Date());
  
  // Fetch all jobs for calendar view
  const { data: allJobs, isLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });
  
  // Filter jobs for the current staff member
  const myJobs = allJobs?.filter((job: any) => job.assignedToId === user?.id) || [];
  
  // Get jobs for selected date
  const selectedDateString = selectedDate?.toISOString().split('T')[0];
  const jobsForSelectedDate = myJobs.filter(
    (job: any) => job.date === selectedDateString
  );
  
  // Create date map for calendar highlighting
  const jobDates = myJobs.reduce((acc: Record<string, boolean>, job: any) => {
    acc[job.date] = true;
    return acc;
  }, {});
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const previousMonth = new Date(month);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    setMonth(previousMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setMonth(nextMonth);
  };
  
  // Helper function to check if date is in jobDates
  const isDateWithJob = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return jobDates[dateString];
  };

  return (
    <div className="p-0 pb-16 md:pb-0">
      <h1 className="text-xl font-medium mb-2 px-1">My Calendar</h1>
      
      <Card className="mb-2 border-0 rounded-none">
        <CardContent className="p-0">
          <div className="flex justify-between items-center px-1 py-1">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-5 w-5 p-0">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <h2 className="text-sm font-medium">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-5 w-5 p-0">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={month}
            onMonthChange={setMonth}
            className="w-full calendar-compact"
            modifiers={{
              withJob: (date) => isDateWithJob(date),
              today: (date) => 
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()
            }}
            modifiersStyles={{
              withJob: { 
                fontWeight: 'bold',
                borderWidth: '2px',
                borderColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary))'
              }
            }}
          />
        </CardContent>
      </Card>
      
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-4">
          {selectedDate && formatDate(selectedDate, "MMMM d, yyyy")} Assignments
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center my-8">
            <p>Loading assignments...</p>
          </div>
        ) : jobsForSelectedDate.length > 0 ? (
          <div className="space-y-4">
            {jobsForSelectedDate.map((job: any) => (
              <Link key={job.id} href={`/staff/jobs/${job.id}`}>
                <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex">
                    <div className={`w-2 ${job.status === 'completed' ? 'bg-success' : 'bg-info'}`}></div>
                    <CardContent className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{job.customer.name}</h3>
                        <Badge className={job.status === 'completed' ? 'bg-success text-white' : 'bg-info text-white'}>
                          {job.status === 'completed' ? 'Completed' : 'Assigned'}
                        </Badge>
                      </div>
                      
                      <div className="mb-2">
                        <p className="text-sm text-neutral-500">{job.customer.address.split(',')[0]}</p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-neutral-500">
                          <span className="font-medium">{job.completedServicePoints}/{job.totalServicePoints}</span> service points
                        </div>
                        <div className="text-secondary flex items-center text-sm">
                          View Details <ArrowUpRight className="ml-1 h-3 w-3" />
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
            <h3 className="font-medium text-lg mb-2">No Assignments</h3>
            <p className="text-neutral-500">
              You don't have any assignments scheduled for this date
            </p>
          </Card>
        )}
      </div>
      
      <Card className="bg-neutral-50 p-4 flex items-center">
        <CalendarIcon className="text-primary h-5 w-5 mr-2" />
        <div>
          <h3 className="font-medium">Calendar Sync Available</h3>
          <p className="text-sm text-neutral-500">Connect to your personal calendar app to stay updated</p>
        </div>
        <Button className="ml-auto bg-primary hover:bg-primary-dark text-white">Get iCal Link</Button>
      </Card>
    </div>
  );
}
