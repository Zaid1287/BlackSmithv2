import { Switch, Route, Redirect } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Page components
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import ManageUsers from "@/pages/manage-users";
import ManageVehicles from "@/pages/manage-vehicles";
import JourneyHistory from "@/pages/journey-history";
import Salaries from "@/pages/salaries";
import FinancialManagement from "@/pages/financial-management";
import ActiveJourney from "@/pages/active-journey";
import EmiManagement from "@/pages/emi";

import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const [forceShowApp, setForceShowApp] = useState(false);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await apiRequest("POST", "/api/init");
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initializeApp();
  }, []);

  // Force show app after 5 seconds if still loading (prevents white screen)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Auth timeout - showing app anyway");
        setForceShowApp(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading && !forceShowApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? (
          user.role === "admin" ? <Redirect to="/admin-dashboard" /> : <Redirect to="/active-journeys" />
        ) : <Login />}
      </Route>
      
      <Route path="/admin-dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/active-journeys">
        <ProtectedRoute allowedRoles={["driver"]}>
          <ActiveJourney />
        </ProtectedRoute>
      </Route>

      <Route path="/journey-history">
        <ProtectedRoute allowedRoles={["driver", "admin"]}>
          <JourneyHistory />
        </ProtectedRoute>
      </Route>

      <Route path="/manage-users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ManageUsers />
        </ProtectedRoute>
      </Route>

      <Route path="/manage-vehicles">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ManageVehicles />
        </ProtectedRoute>
      </Route>

      <Route path="/financial-management">
        <ProtectedRoute allowedRoles={["admin"]}>
          <FinancialManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/salaries">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Salaries />
        </ProtectedRoute>
      </Route>

      <Route path="/emi">
        <ProtectedRoute allowedRoles={["admin"]}>
          <EmiManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        {user ? (
          user.role === "admin" ? <Redirect to="/admin-dashboard" /> : <Redirect to="/active-journeys" />
        ) : <Redirect to="/login" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
