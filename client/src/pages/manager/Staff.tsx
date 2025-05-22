import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Search, RefreshCcw, User, Mail, Eye, Edit, Trash, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Create a schema for staff form
const staffFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  role: z.string().default("staff")
});

export default function ManagerStaff() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "staff"
    },
  });
  
  // Fetch staff members (users with role "staff")
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["/api/users"],
  });
  
  const staffMembers = users?.filter((user: any) => user.role === "staff") || [];
  
  const filteredStaff = staffMembers.filter((staff: any) => 
    staff.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const onSubmit = async (data: z.infer<typeof staffFormSchema>) => {
    try {
      await apiRequest("POST", "/api/users", data);
      
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
      
      // Invalidate the users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Close the dialog and reset form
      setIsAddStaffOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteStaff = async () => {
    if (!selectedStaffId) return;
    
    try {
      await apiRequest("DELETE", `/api/users/${selectedStaffId}`);
      
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      
      // Invalidate the users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedStaffId(null);
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Service Staff</h1>
        <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-dark text-white flex items-center">
              <Plus className="mr-1 h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service Staff</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button className="bg-primary hover:bg-primary-dark text-white" type="submit">
                    Add Staff
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search staff members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading staff members...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Jobs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff: any) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-neutral-400" />
                      {staff.fullName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center mb-1">
                      <Mail className="h-4 w-4 mr-2 text-neutral-400" />
                      {staff.email}
                    </div>
                    <div className="text-sm text-neutral-500">
                      @{staff.username}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm">
                      <span className="font-medium text-primary">10</span> assigned
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-secondary">42</span> completed
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" className="text-secondary">
                        <Eye className="h-4 w-4 mr-1" /> View Jobs
                      </Button>
                      <Button variant="ghost" size="icon" className="text-secondary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-error"
                        onClick={() => {
                          setSelectedStaffId(staff.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
          <h3 className="font-medium text-lg mb-2">No Staff Found</h3>
          <p className="text-neutral-500 mb-4">
            {searchQuery ? "Try a different search term or" : "Get started by adding your first team member"}
          </p>
          <Button 
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => setIsAddStaffOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Staff
          </Button>
        </Card>
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this staff member and remove them from all assigned jobs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteStaff();
              }}
              className="bg-error text-white hover:bg-error/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
