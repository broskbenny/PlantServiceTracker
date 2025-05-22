import { cn } from "@/lib/utils";

type StatusType = "pending" | "in_progress" | "partially_completed" | "completed" | "assigned";

interface StatusIndicatorProps {
  status: StatusType | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  size = "md",
  showLabel = false,
  className
}: StatusIndicatorProps) {
  let statusColor = "";
  
  // Determine colors based on status - simplified to just use the traffic light
  switch (status) {
    case "completed":
      statusColor = "bg-green-500";
      break;
    case "partially_completed":
    case "in_progress":
      statusColor = "bg-yellow-500";
      break;
    case "assigned":
      statusColor = "bg-blue-500";
      break;
    case "pending":
    default:
      statusColor = "bg-red-500";
  }
  
  // Determine the size of the indicator
  let sizeClass = "h-3 w-3";
  if (size === "sm") {
    sizeClass = "h-2 w-2";
  } else if (size === "lg") {
    sizeClass = "h-4 w-4";
  }
  
  // Always just return the traffic light indicator, no text
  return (
    <div className={cn("flex items-center", className)}>
      <div className={`${sizeClass} rounded-full ${statusColor}`}></div>
    </div>
  );
}