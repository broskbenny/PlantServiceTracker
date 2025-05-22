import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { user } = useAuth();
  const homePath = user?.role === "manager" ? "/manager/dashboard" : "/staff/dashboard";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-error" />
            <h1 className="text-2xl font-bold text-neutral-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 mb-6 text-sm text-neutral-600">
            The page you are looking for doesn't exist or you don't have permission to access it.
          </p>

          <Link href={user ? homePath : "/login"}>
            <Button className="w-full bg-primary hover:bg-primary-dark text-white">
              {user ? "Return to Dashboard" : "Go to Login"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
