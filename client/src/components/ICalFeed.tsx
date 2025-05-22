import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ICalFeed() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Calendar Integration</CardTitle>
        </div>
        <CardDescription>
          Sync your work schedule with your personal calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Add this URL to your preferred calendar application to keep your work schedule in sync.</p>
                <p>The iCal feed will automatically update whenever your job assignments change.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Instructions for popular calendar apps</div>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">Google Calendar</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-muted-foreground">
                    <li>Click the "+" next to "Other calendars"</li>
                    <li>Select "From URL"</li>
                    <li>Paste the URL above and click "Add calendar"</li>
                  </ol>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">Apple Calendar</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-muted-foreground">
                    <li>Choose File → New Calendar Subscription</li>
                    <li>Paste the URL above and click "Subscribe"</li>
                    <li>Adjust the settings and click "OK"</li>
                  </ol>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">Outlook Calendar</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-muted-foreground">
                    <li>Go to Calendar view</li>
                    <li>Click "Add calendar" → "From Internet"</li>
                    <li>Paste the URL above and click "OK"</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Note: Depending on your calendar provider, it may take up to 24 hours for updates to sync.
        </div>
      </CardFooter>
    </Card>
  );
}