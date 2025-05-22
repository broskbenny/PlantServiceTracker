import { useQuery } from "@tanstack/react-query";
import CustomerCard from "@/components/CustomerCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Search, RefreshCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function ManagerCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/customers"],
  });
  
  const filteredCustomers = customers?.filter((customer: any) => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Customers</h1>
        <Link href="/manager/customers/new">
          <Button className="bg-primary hover:bg-primary-dark text-white flex items-center">
            <Plus className="mr-1 h-4 w-4" /> Add Customer
          </Button>
        </Link>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search customers..."
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
          <p>Loading customers...</p>
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-error">
          Error loading customers. Please try again.
        </Card>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer: any) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h3 className="font-medium text-lg mb-2">No Customers Found</h3>
          <p className="text-neutral-500 mb-4">
            {searchQuery ? "Try a different search term or" : "Get started by adding your first customer"}
          </p>
          <Link href="/manager/customers/new">
            <Button className="bg-primary hover:bg-primary-dark text-white">
              Add New Customer
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
