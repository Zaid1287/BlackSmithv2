import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Route, MapPin, Receipt, TrendingUp, Settings } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      toast({
        title: "Login Successful",
        description: "Welcome back to BlackSmith Traders!",
      });
      // Force redirect to dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login functions
  const loginAsAdmin = async () => {
    setIsLoading(true);
    try {
      await login("admin", "admin123");
      toast({
        title: "Login Successful",
        description: "Welcome back, Admin!",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDriver = async () => {
    setIsLoading(true);
    try {
      await login("driver", "driver123");
      toast({
        title: "Login Successful",
        description: "Welcome back, Driver!",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">Logistics Management System</h1>
          <p className="text-lg text-gray-600 mb-8">Track vehicles, manage expenses, and monitor journeys in real-time for BlackSmith Traders</p>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Route className="text-blue-500 text-2xl mb-2 mx-auto" size={32} />
              <h3 className="font-semibold text-sm">Real-time Tracking</h3>
              <p className="text-xs text-gray-500">Monitor vehicle locations and journey progress on a live map</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Receipt className="text-green-500 text-2xl mb-2 mx-auto" size={32} />
              <h3 className="font-semibold text-sm">Expense Management</h3>
              <p className="text-xs text-gray-500">Record and categorize all journey expenses to track profitability</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <TrendingUp className="text-orange-500 text-2xl mb-2 mx-auto" size={32} />
              <h3 className="font-semibold text-sm">Financial Overview</h3>
              <p className="text-xs text-gray-500">View profit and loss indicators for each journey in real-time</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Settings className="text-purple-500 text-2xl mb-2 mx-auto" size={32} />
              <h3 className="font-semibold text-sm">Advanced Reporting</h3>
              <p className="text-xs text-gray-500">Generate detailed reports for completed journeys and expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-lg mb-4">
              <span className="text-2xl font-bold">BS</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">BLACKSMITH TRADERS</h2>
            <h3 className="text-xl font-semibold text-gray-700 mt-4">Login</h3>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Username</Label>
              <Input 
                {...register("username")}
                placeholder="Enter your username" 
                className="w-full"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Password</Label>
              <Input 
                {...register("password")}
                type="password" 
                placeholder="Enter your password" 
                className="w-full"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gray-900 text-white hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
            
            <div className="space-y-2">
              <Button 
                type="button" 
                onClick={loginAsAdmin}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={isLoading}
              >
                Login as Admin (Demo)
              </Button>
              
              <Button 
                type="button" 
                onClick={loginAsDriver}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                Login as Driver (Demo)
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New users can only be added by administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
