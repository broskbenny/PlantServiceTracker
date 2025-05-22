import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getCompletionPercentage, getStatusColor, getStatusText } from "@/lib/utils";
import { User, MapPin, SprayCan, Repeat } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

interface JobCardProps {
  job: {
    id: number;
    date: string;
    status: string;
    assignedTo: {
      id: number;
      fullName: string;
    };
    plantCount: number;
    customer: {
      name: string;
      address: string;
    };
    totalServicePoints: number;
    completedServicePoints: number;
    isRecurring?: boolean;
    recurringPatternId?: number | null;
  };
  userRole: string;
}

export default function JobCard({ job, userRole }: JobCardProps) {
  const { 
    id, 
    date, 
    status, 
    assignedTo, 
    plantCount, 
    customer, 
    totalServicePoints,
    completedServicePoints,
    isRecurring,
    recurringPatternId
  } = job;
  
  const progressPercentage = getCompletionPercentage(completedServicePoints, totalServicePoints);
  const statusClasses = getStatusColor(status);
  const basePath = userRole === "manager" ? "/manager" : "/staff";
  
  return (
    <Link href={`${basePath}/jobs/${id}`}>
      <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="p-4 border-b border-neutral-100 flex flex-row justify-between items-start space-y-0">
          <div className="flex flex-col">
            <h3 className="font-medium">{customer.name}</h3>
            <div className="flex items-center">
              <p className="text-sm text-neutral-500">{formatDate(date, "MMM d")}</p>
              {isRecurring && (
                <div className="flex items-center ml-2 text-emerald-600" title="Recurring job">
                  <Repeat className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          </div>
          <Badge className={statusClasses}>
            {getStatusText(status)}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center text-sm text-neutral-500">
              <User className="h-4 w-4 mr-2" />
              {assignedTo.fullName}
            </div>
            <div className="flex items-center text-sm text-neutral-500">
              <MapPin className="h-4 w-4 mr-2" />
              {customer.address.split(',')[0]}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-neutral-500">
                <SprayCan className="h-4 w-4 mr-2" />
                {plantCount} plants
              </div>
              <div className="text-sm font-medium">
                {completedServicePoints}/{totalServicePoints}
              </div>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
