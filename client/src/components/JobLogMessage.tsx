import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface JobLogMessageProps {
  jobId: number;
  onClose?: () => void;
}

export function JobLogMessage({ jobId, onClose }: JobLogMessageProps) {
  const [message, setMessage] = useState("");
  const [notifyManagement, setNotifyManagement] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          jobId,
          userId: user?.id,
          message: message.trim(),
          notifyManagement,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add log message");
      }
      
      toast({
        title: "Success",
        description: "Message logged successfully",
      });
      
      // Invalidate queries to refresh job data
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      // Reset form
      setMessage("");
      setNotifyManagement(false);
      
      // Close modal if provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error logging message:", error);
      toast({
        title: "Error",
        description: "Failed to log message",
        variant: "destructive",
      });
    }
    
    setIsSubmitting(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="message">Log Message</Label>
        <Textarea
          id="message"
          placeholder="Enter message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notifyManagement"
          checked={notifyManagement}
          onCheckedChange={(checked) => setNotifyManagement(checked === true)}
        />
        <Label htmlFor="notifyManagement">Notify management</Label>
      </div>
      
      <div className="flex justify-end space-x-2">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}

interface MessageLogItemProps {
  message: {
    id: number;
    message: string;
    timestamp: string;
    notifyManagement: boolean;
    user: {
      fullName: string;
      role: string;
    };
  };
}

export function MessageLogItem({ message }: MessageLogItemProps) {
  const timeAgo = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });
  
  return (
    <div className="border rounded-md p-3 mb-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{message.user.fullName}</p>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </div>
        {message.notifyManagement && (
          <span className="text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-1">
            Management notified
          </span>
        )}
      </div>
      <p className="mt-2 text-sm">{message.message}</p>
    </div>
  );
}

interface JobLogHistoryProps {
  jobId: number;
}

export function JobLogHistory({ jobId }: JobLogHistoryProps) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?jobId=${jobId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      return response.json();
    },
  });
  
  if (isLoading) {
    return <div className="text-center py-4">Loading messages...</div>;
  }
  
  if (!messages || messages.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No messages found</div>;
  }
  
  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {messages.map((message: any) => (
        <MessageLogItem key={message.id} message={message} />
      ))}
    </div>
  );
}