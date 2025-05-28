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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-12">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm text-white rounded-2xl mb-6 border border-white/30">
              <span className="text-3xl font-bold">BS</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">BLACKSMITH TRADERS</h2>
            <h3 className="text-lg font-medium text-blue-200">Login</h3>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-blue-200 mb-2">Username</Label>
              <Input 
                {...register("username")}
                placeholder="Enter your username" 
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-red-300 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-blue-200 mb-2">Password</Label>
              <Input 
                {...register("password")}
                type="password" 
                placeholder="Enter your password" 
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-red-300 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
            
            <div className="space-y-3">
              <Button 
                type="button" 
                onClick={loginAsAdmin}
                className="w-full bg-green-600 hover:bg-green-700 text-white border-0 h-11 rounded-lg"
                disabled={isLoading}
              >
                Login as Admin (Demo)
              </Button>
              
              <Button 
                type="button" 
                onClick={loginAsDriver}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 h-11 rounded-lg"
                disabled={isLoading}
              >
                Login as Driver (Demo)
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-blue-200/80 mt-6">
            New users can only be added by administrators.
          </p>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex lg:w-3/5 items-center justify-center p-12">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold text-white mb-6">Logistics Management System</h1>
          <p className="text-xl text-blue-200 mb-12 leading-relaxed">
            Track vehicles, manage expenses, and monitor journeys in real-time for BlackSmith Traders
          </p>
          
          {/* Feature List - No Cards */}
          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="p-4 bg-blue-500/20 rounded-full">
                <Route className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Real-time Tracking</h3>
                <p className="text-blue-200 leading-relaxed">Monitor vehicle locations and journey progress on a live map with precise GPS coordinates</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="p-4 bg-green-500/20 rounded-full">
                <Receipt className="w-8 h-8 text-green-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Expense Management</h3>
                <p className="text-blue-200 leading-relaxed">Record and categorize all journey expenses to track profitability and optimize costs</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="p-4 bg-orange-500/20 rounded-full">
                <TrendingUp className="w-8 h-8 text-orange-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Financial Overview</h3>
                <p className="text-blue-200 leading-relaxed">View profit and loss indicators for each journey with real-time financial analytics</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="p-4 bg-purple-500/20 rounded-full">
                <Settings className="w-8 h-8 text-purple-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Advanced Reporting</h3>
                <p className="text-blue-200 leading-relaxed">Generate comprehensive reports for completed journeys, expenses, and fleet performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
