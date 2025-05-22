import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Repeat, Calendar, Trash2, Edit, Plus, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RecurringPattern {
  id: number;
  frequency: string;
  customInterval: number | null;
  daysOfWeek: string[] | null;
  startDate: string;
  endDate: string | null;
  endAfterOccurrences: number | null;
  templateJob?: {
    customer: {
      id: number;
      name: string;
    };
    assignedTo: {
      id: number;
      fullName: string;
    };
    plantCount: number;
  };
}

export default function RecurringPatterns() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(null);
  const [occurrences, setOccurrences] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewDates, setPreviewDates] = useState<string[]>([]);
  
  // Fetch recurring patterns
  const { data: patterns, isLoading, error } = useQuery({
    queryKey: ["/api/recurring-patterns"],
    queryFn: async () => {
      const response = await apiRequest("/api/recurring-patterns");
      return response.patterns as RecurringPattern[];
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (patternId: number) => {
      return await apiRequest(`/api/recurring-patterns/${patternId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-patterns"] });
      toast({
        title: "Success",
        description: "Recurring pattern deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete recurring pattern",
        variant: "destructive",
      });
    }
  });
  
  // Preview dates
  const fetchPreviewDates = async () => {
    if (!selectedPatternId) return;
    
    setIsLoadingPreview(true);
    
    try {
      const response = await apiRequest(`/api/recurring-patterns/${selectedPatternId}/preview-dates?occurrences=${occurrences}`);
      setPreviewDates(response.dates || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load preview dates",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Generate jobs
  const generateJobs = async () => {
    if (!selectedPatternId) return;
    
    setIsGenerating(true);
    
    try {
      await apiRequest(`/api/recurring-patterns/${selectedPatternId}/generate-jobs`, {
        method: "POST",
        data: { occurrences }
      });
      
      // Invalidate jobs query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      toast({
        title: "Success",
        description: `${occurrences} job instances have been generated successfully`,
      });
      
      setGenerateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate job instances",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle delete
  const handleDelete = (patternId: number) => {
    setSelectedPatternId(patternId);
    setDeleteDialogOpen(true);
  };
  
  // Handle generate dialog
  const handleGenerateDialog = (patternId: number) => {
    setSelectedPatternId(patternId);
    setGenerateDialogOpen(true);
  };
  
  // Handle preview dialog
  const handlePreviewDialog = (patternId: number) => {
    setSelectedPatternId(patternId);
    setPreviewDialogOpen(true);
    // Reset preview dates
    setPreviewDates([]);
  };
  
  // Confirm delete
  const confirmDelete = () => {
    if (selectedPatternId) {
      deleteMutation.mutate(selectedPatternId);
    }
  };
  
  // Format frequency for display
  const formatFrequency = (pattern: RecurringPattern) => {
    switch (pattern.frequency) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "biweekly":
        return "Bi-weekly";
      case "monthly":
        return "Monthly";
      case "custom":
        return `Every ${pattern.customInterval} days`;
      default:
        return pattern.frequency;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Recurring Job Patterns</h1>
          <p className="text-muted-foreground">Manage your recurring job series</p>
        </div>
        <Button asChild>
          <Link href="/manager/recurring-patterns/new">
            <Plus className="mr-2 h-4 w-4" /> Create New Pattern
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          Failed to load recurring patterns. Please try again.
        </div>
      ) : patterns && patterns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className="w-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 text-emerald-600" />
                      {formatFrequency(pattern)}
                    </CardTitle>
                    <CardDescription>
                      Starts {formatDate(pattern.startDate, "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {pattern.endDate 
                      ? `Until ${formatDate(pattern.endDate, "MMM d, yyyy")}`
                      : pattern.endAfterOccurrences 
                        ? `${pattern.endAfterOccurrences} occurrences`
                        : "No end date"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pattern.templateJob && (
                    <>
                      <div className="text-sm">
                        <span className="font-medium">Customer:</span>{' '}
                        {pattern.templateJob.customer.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Staff:</span>{' '}
                        {pattern.templateJob.assignedTo.fullName}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Plants:</span>{' '}
                        {pattern.templateJob.plantCount}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <div className="flex space-x-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreviewDialog(pattern.id)}>
                    <Calendar className="mr-1 h-4 w-4" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGenerateDialog(pattern.id)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Generate
                  </Button>
                </div>
                <div className="flex space-x-2 w-full">
                  <Button variant="secondary" size="sm" className="flex-1" asChild>
                    <Link href={`/manager/recurring-patterns/${pattern.id}`}>
                      <Edit className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(pattern.id)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-muted p-8 rounded-lg text-center">
          <Repeat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No recurring patterns found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first recurring job pattern to automate your scheduling.
          </p>
          <Button asChild>
            <Link href="/manager/recurring-patterns/new">
              <Plus className="mr-2 h-4 w-4" /> Create Pattern
            </Link>
          </Button>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring pattern and cannot be undone.
              This will not affect any jobs that have already been generated from this pattern.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Generate Jobs Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Job Instances</DialogTitle>
            <DialogDescription>
              Specify how many job occurrences you want to generate from this recurring pattern.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="occurrences">Number of occurrences</Label>
              <Input
                id="occurrences"
                type="number"
                min="1"
                max="100"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateJobs} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Jobs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dates Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview Job Dates</DialogTitle>
            <DialogDescription>
              See when jobs will be scheduled based on this recurring pattern.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="previewOccurrences">Number of occurrences to preview</Label>
              <div className="flex space-x-2">
                <Input
                  id="previewOccurrences"
                  type="number"
                  min="1"
                  max="100"
                  value={occurrences}
                  onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
                <Button onClick={fetchPreviewDates} disabled={isLoadingPreview}>
                  {isLoadingPreview ? "Loading..." : "Preview"}
                </Button>
              </div>
            </div>
            
            {/* Preview Results */}
            <div className="mt-4">
              {isLoadingPreview ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-6 w-full" />
                  ))}
                </div>
              ) : previewDates.length > 0 ? (
                <div className="border rounded-md divide-y">
                  {previewDates.map((date, index) => (
                    <div key={index} className="p-3 flex justify-between items-center">
                      <div className="font-medium">{formatDate(date, "MMMM d, yyyy")}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(date, "EEEE")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}