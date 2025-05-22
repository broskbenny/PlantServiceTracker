import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Building,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerAttention() {
  const [activeTab, setActiveTab] = useState("unread");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages requiring attention
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["/api/messages", activeTab],
    queryFn: async () => {
      const response = await apiRequest(`/api/messages?status=${activeTab === "all" ? "all" : activeTab}`);
      return response || [];
    },
  });

  // Mutation for acknowledging messages
  const acknowledgeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/messages/${messageId}/acknowledge`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Message acknowledged successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge message",
        variant: "destructive",
      });
    },
  });

  // Handle acknowledge button click
  const handleAcknowledge = (messageId: number) => {
    acknowledgeMutation.mutate(messageId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Items Requiring Attention</h1>
        <p className="text-muted-foreground">
          Messages and alerts from service staff that need your attention
        </p>
      </div>

      <Tabs defaultValue="unread" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="unread" className="flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            Unread
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Acknowledged
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            All Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-4">
          <AttentionItemsList 
            messages={messages} 
            isLoading={isLoading} 
            error={error}
            onAcknowledge={handleAcknowledge}
            isPending={acknowledgeMutation.isPending}
            showAcknowledgeButton={true}
            emptyMessage="No unread items requiring attention"
          />
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          <AttentionItemsList 
            messages={messages} 
            isLoading={isLoading} 
            error={error}
            onAcknowledge={handleAcknowledge}
            isPending={acknowledgeMutation.isPending}
            showAcknowledgeButton={false}
            emptyMessage="No acknowledged items to display"
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <AttentionItemsList 
            messages={messages} 
            isLoading={isLoading} 
            error={error}
            onAcknowledge={handleAcknowledge}
            isPending={acknowledgeMutation.isPending}
            showAcknowledgeButton={true}
            emptyMessage="No items requiring attention"
            showStatus={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AttentionItemsListProps {
  messages: any[] | undefined;
  isLoading: boolean;
  error: unknown;
  onAcknowledge: (messageId: number) => void;
  isPending: boolean;
  showAcknowledgeButton: boolean;
  emptyMessage: string;
  showStatus?: boolean;
}

function AttentionItemsList({
  messages,
  isLoading,
  error,
  onAcknowledge,
  isPending,
  showAcknowledgeButton,
  emptyMessage,
  showStatus = false,
}: AttentionItemsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>
            There was an error loading the items requiring attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try again or contact support if the problem persists.</p>
        </CardContent>
      </Card>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center min-h-[200px]">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Customer</TableHead>
              {showStatus && <TableHead>Status</TableHead>}
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell className="align-top">
                  <div className="font-medium text-xs">
                    {formatDate(message.timestamp, "MMM dd, yyyy")}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatDate(message.timestamp, "hh:mm a")}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center">
                    <div className="bg-secondary text-secondary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs mr-2">
                      {message.user?.fullName?.[0] || "?"}
                    </div>
                    <span className="text-xs">{message.user?.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="text-xs font-medium">
                    {message.customer?.name || "N/A"}
                  </div>
                  <Link
                    href={`/manager/jobs/${message.jobId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Job #{message.jobId}
                  </Link>
                </TableCell>
                {showStatus && (
                  <TableCell className="align-top">
                    <Badge
                      variant={message.status === "read" ? "outline" : "default"}
                      className={message.status === "read" ? "bg-muted" : ""}
                    >
                      {message.status === "read" ? "Acknowledged" : "Unread"}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="align-top max-w-md">
                  <div className="text-sm whitespace-normal break-words">
                    {message.message}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top">
                  {showAcknowledgeButton && message.status === "unread" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAcknowledge(message.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                        </>
                      ) : (
                        "Acknowledge"
                      )}
                    </Button>
                  ) : message.status === "unread" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAcknowledge(message.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                        </>
                      ) : (
                        "Acknowledge"
                      )}
                    </Button>
                  ) : (
                    <Link href={`/manager/jobs/${message.jobId}`}>
                      <Button variant="outline" size="sm">
                        View Job
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}