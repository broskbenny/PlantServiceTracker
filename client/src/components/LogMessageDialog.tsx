import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { JobLogMessage, MessageLogItem, JobLogHistory } from "./JobLogMessage";
import { MessageSquare, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LogMessageDialogProps {
  jobId: number;
  customerName: string;
}

export function LogMessageDialog({ jobId, customerName }: LogMessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Fetch the most recent message for this job
  const { data: latestMessage, isLoading } = useQuery({
    queryKey: ["/api/messages", jobId, "latest"],
    queryFn: async () => {
      const response = await fetch(`/api/messages?jobId=${jobId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const messages = await response.json();
      return messages && messages.length > 0 ? messages[0] : null;
    },
  });

  return (
    <div className="mt-4">
      {/* Display latest message if it exists */}
      {!isLoading && latestMessage && (
        <div className="mb-3">
          <div className="text-sm font-medium mb-1">Latest message:</div>
          <MessageLogItem message={latestMessage} />
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="grid grid-cols-2 gap-2">
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("history")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              View History
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Job Message Log</DialogTitle>
            <DialogDescription>
              {customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 ${activeTab === "new" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
              onClick={() => setActiveTab("new")}
            >
              New Message
            </button>
            <button
              className={`px-4 py-2 ${activeTab === "history" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
              onClick={() => setActiveTab("history")}
            >
              Message History
            </button>
          </div>

          {activeTab === "new" ? (
            <JobLogMessage 
              jobId={jobId} 
              onClose={() => setIsOpen(false)} 
            />
          ) : (
            <JobLogHistory jobId={jobId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}