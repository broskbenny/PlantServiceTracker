import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewModeProvider } from "./lib/viewModeContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ManagerDashboard from "@/pages/manager/Dashboard";
import ManagerCustomers from "@/pages/manager/Customers";
import ManagerStaff from "@/pages/manager/Staff";
import ManagerAttention from "@/pages/manager/Attention";
import ManagerJobDetails from "@/pages/manager/JobDetails";
import ManagerCustomerForm from "@/pages/manager/CustomerForm";
import ManagerJobForm from "@/pages/manager/JobForm";
import ManagerRecurringPatterns from "@/pages/manager/RecurringPatterns";
import ManagerRecurringPatternForm from "@/pages/manager/RecurringPatternForm";
import ManagerReports from "@/pages/manager/Reports";
import StaffDashboard from "@/pages/staff/Dashboard";
import StaffCalendar from "@/pages/staff/Calendar";
import StaffJobDetails from "@/pages/staff/JobDetails";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

function ProtectedRoute({ 
  component: Component, 
  roles = [], 
  ...rest 
}: { 
  component: React.ComponentType<any>;
  roles?: string[];
  [key: string]: any;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <NotFound />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuth();
  
  // Manually check for stored user in case the context isn't updating properly
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  
  // Use either the context user or the stored user
  const activeUser = user || parsedUser;
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!activeUser) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <Login />
        </Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        {/* Manager Routes */}
        <Route path="/" component={activeUser.role === "manager" ? ManagerDashboard : StaffDashboard} />
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/manager/dashboard">
          <ProtectedRoute component={ManagerDashboard} roles={["manager"]} />
        </Route>
        <Route path="/manager/customers">
          <ProtectedRoute component={ManagerCustomers} roles={["manager"]} />
        </Route>
        <Route path="/manager/customers/new">
          <ProtectedRoute component={ManagerCustomerForm} roles={["manager"]} />
        </Route>
        <Route path="/manager/customers/:id">
          {(params) => <ProtectedRoute component={ManagerCustomerForm} roles={["manager"]} id={params.id} />}
        </Route>
        <Route path="/manager/staff">
          <ProtectedRoute component={ManagerStaff} roles={["manager"]} />
        </Route>
        <Route path="/manager/attention">
          <ProtectedRoute component={ManagerAttention} roles={["manager"]} />
        </Route>
        <Route path="/manager/jobs/new">
          <ProtectedRoute component={ManagerJobForm} roles={["manager"]} />
        </Route>
        <Route path="/manager/jobs/:id">
          {(params) => <ProtectedRoute component={ManagerJobDetails} roles={["manager"]} id={params.id} />}
        </Route>
        <Route path="/manager/recurring-patterns">
          <ProtectedRoute component={ManagerRecurringPatterns} roles={["manager"]} />
        </Route>
        <Route path="/manager/recurring-patterns/new">
          <ProtectedRoute component={ManagerRecurringPatternForm} roles={["manager"]} />
        </Route>
        <Route path="/manager/recurring-patterns/:id">
          {(params) => <ProtectedRoute component={ManagerRecurringPatternForm} roles={["manager"]} id={params.id} />}
        </Route>
        <Route path="/manager/reports">
          <ProtectedRoute component={ManagerReports} roles={["manager"]} />
        </Route>
        
        {/* Staff Routes */}
        <Route path="/staff/dashboard">
          <ProtectedRoute component={StaffDashboard} roles={["staff"]} />
        </Route>
        <Route path="/staff/calendar">
          <ProtectedRoute component={StaffCalendar} roles={["staff"]} />
        </Route>
        <Route path="/staff/jobs/:id">
          {(params) => <ProtectedRoute component={StaffJobDetails} roles={["staff"]} id={params.id} />}
        </Route>
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ViewModeProvider>
          <Toaster />
          <Router />
        </ViewModeProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
