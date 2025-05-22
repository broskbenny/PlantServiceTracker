import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash, MapPin, Phone, Clock, Key, FileText } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CustomerCardProps {
  customer: {
    id: number;
    name: string;
    address: string;
    contact: string;
    phone: string;
    openingHours: string;
    entryCode?: string;
    siteNotes?: string;
  };
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await apiRequest("DELETE", `/api/customers/${customer.id}`);
      
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      
      // Invalidate the customers query
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  return (
    <>
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium">{customer.name}</h3>
            <div className="flex space-x-1">
              <Link href={`/manager/customers/${customer.id}`}>
                <Button variant="ghost" size="icon" className="text-secondary h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-error h-8 w-8"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-start text-sm text-neutral-600">
              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{customer.address}</span>
            </div>
            <div className="flex items-center text-sm text-neutral-600">
              <span className="font-medium mr-2">Contact:</span> {customer.contact}
            </div>
            <div className="flex items-center text-sm text-neutral-600">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" /> {customer.phone}
            </div>
            <div className="flex items-start text-sm text-neutral-600">
              <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{customer.openingHours}</span>
            </div>
            {customer.entryCode && (
              <div className="flex items-center text-sm text-neutral-600">
                <Key className="h-4 w-4 mr-2 flex-shrink-0" /> {customer.entryCode}
              </div>
            )}
          </div>
          
          {customer.siteNotes && (
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-start text-sm text-neutral-500">
                <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{customer.siteNotes}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {customer.name} and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-error text-white hover:bg-error/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
