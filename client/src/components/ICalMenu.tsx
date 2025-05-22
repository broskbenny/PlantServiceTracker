import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ICalMenu() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch the iCal feed URL
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/staff/ical-info"],
    queryFn: async () => {
      const response = await apiRequest("/api/staff/ical-info");
      return response;
    },
  });
  
  // Function to copy the URL to the clipboard
  const copyToClipboard = () => {
    if (data?.icalUrl) {
      navigator.clipboard.writeText(data.icalUrl);
      setCopied(true);
      
      toast({
        title: "URL Copied",
        description: "Calendar URL copied to clipboard",
      });
      
      // Reset the copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  return (
    <>
      <div
        className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
        onClick={() => setIsOpen(true)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        <span>Calendar Integration</span>
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calendar Integration</DialogTitle>
            <DialogDescription>
              Sync your work schedule with your personal calendar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-destructive">Failed to load calendar information. Please try again.</div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Your Calendar URL</div>
                  <div className="flex">
                    <Input 
                      value={data?.icalUrl} 
                      readOnly 
                      className="flex-1 pr-10 font-mono text-xs"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="-ml-10" 
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">How to use this URL</div>
                  <div className="text-sm text-muted-foreground">
                    <p>Add this URL to your preferred calendar application to keep your work schedule in sync.</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Quick Help</div>
                  <div className="flex flex-col space-y-1.5 text-sm text-muted-foreground">
                    <span>• Google Calendar: "+ → From URL"</span>
                    <span>• Apple Calendar: "File → New Calendar Subscription"</span>
                    <span>• Outlook: "Add calendar → From Internet"</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}