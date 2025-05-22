import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Form schema for customer
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  contact: z.string().min(1, "Contact name is required"),
  phone: z.string().min(1, "Phone number is required"),
  openingHours: z.string().min(1, "Opening hours are required"),
  entryCode: z.string().optional(),
  siteNotes: z.string().optional()
});

export default function ManagerCustomerForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!id;
  
  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      address: "",
      contact: "",
      phone: "",
      openingHours: "",
      entryCode: "",
      siteNotes: ""
    }
  });
  
  // Fetch customer data if in edit mode
  const { data: customer, isLoading } = useQuery({
    queryKey: [`/api/customers/${id}`],
    enabled: isEditMode,
  });
  
  // Populate form with customer data when available
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        address: customer.address,
        contact: customer.contact,
        phone: customer.phone,
        openingHours: customer.openingHours,
        entryCode: customer.entryCode || "",
        siteNotes: customer.siteNotes || ""
      });
    }
  }, [customer, form]);
  
  const onSubmit = async (data: z.infer<typeof customerFormSchema>) => {
    setIsSubmitting(true);
    
    try {
      if (isEditMode) {
        await apiRequest("PUT", `/api/customers/${id}`, data);
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/customers", data);
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
      }
      
      // Invalidate the customers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      // Redirect back to customers page
      setLocation("/manager/customers");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} customer`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <Link href="/manager/customers">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
        </Button>
      </Link>
      
      <div className="mb-6">
        <h1 className="text-2xl font-medium">{isEditMode ? 'Edit' : 'Add'} Customer</h1>
        <p className="text-neutral-500">
          {isEditMode 
            ? 'Update the customer details below' 
            : 'Fill in the customer details below'}
        </p>
      </div>
      
      {isEditMode && isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading customer data...</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Northshore Office Complex" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="John Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="entryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entry Code (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="A1B2C3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="123 Business St, Seattle, WA 98101" 
                              {...field} 
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="openingHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Hours</FormLabel>
                          <FormControl>
                            <Input placeholder="Mon-Fri: 8:00 AM - 6:00 PM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="siteNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Use service elevator in back. Sign in at security desk." 
                              {...field} 
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Link href="/manager/customers">
                    <Button variant="outline" type="button">Cancel</Button>
                  </Link>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary-dark text-white" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? (isEditMode ? 'Updating...' : 'Creating...')
                      : (isEditMode ? 'Update Customer' : 'Create Customer')
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
