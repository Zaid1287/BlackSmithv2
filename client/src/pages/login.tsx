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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex relative overflow-hidden">
      {/* Luxury Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-white/5 to-gray-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-300/5 to-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-gray-400/5 to-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Premium Login Container */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 shadow-2xl relative">
            {/* Luxury Accent Lines */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            
            {/* Premium Logo */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-600/30 to-gray-800/30 backdrop-blur-xl text-white rounded-3xl mb-8 border-2 border-white/30 shadow-xl relative">
                <span className="text-4xl font-bold bg-gradient-to-r from-gray-200 to-white bg-clip-text text-transparent">BS</span>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-3xl blur-sm"></div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent mb-3 tracking-wide">
                BLACKSMITH TRADERS
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-gray-400 to-white mx-auto mb-4"></div>
              <h3 className="text-xl font-light text-gray-100 tracking-widest uppercase">Login Portal</h3>
            </div>

            {/* Premium Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-100/90 mb-3 tracking-wide uppercase">Username</Label>
                <Input 
                  {...register("username")}
                  placeholder="Enter your username" 
                  className="w-full h-14 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-gray-400/50 focus:bg-white/15 rounded-2xl px-6 text-lg backdrop-blur-sm transition-all duration-300 shadow-inner"
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-red-300 text-sm mt-2 ml-2">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-100/90 mb-3 tracking-wide uppercase">Password</Label>
                <Input 
                  {...register("password")}
                  type="password" 
                  placeholder="Enter your password" 
                  className="w-full h-14 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-gray-400/50 focus:bg-white/15 rounded-2xl px-6 text-lg backdrop-blur-sm transition-all duration-300 shadow-inner"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-red-300 text-sm mt-2 ml-2">{errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white border-0 rounded-2xl font-semibold text-lg tracking-wide shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : "Access Portal"}
              </Button>
              
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-gray-200/70 font-light tracking-widest uppercase">Demo Access</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={loginAsAdmin}
                  className="w-full h-12 bg-gradient-to-r from-gray-700/80 to-gray-900/80 hover:from-gray-800 hover:to-black text-white border border-gray-400/30 rounded-xl font-medium tracking-wide transition-all duration-300 backdrop-blur-sm"
                  disabled={isLoading}
                >
                  Executive Access
                </Button>
                
                <Button 
                  type="button" 
                  onClick={loginAsDriver}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl font-medium tracking-wide transition-all duration-300 backdrop-blur-sm"
                  disabled={isLoading}
                >
                  Driver Access
                </Button>
              </div>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-white/10">
              <p className="text-gray-200/60 text-sm font-light tracking-wide">
                Authorized Personnel Only
              </p>
              <p className="text-gray-200/40 text-xs mt-1 tracking-widest">
                Contact Administrator for New Accounts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Luxury Features */}
      <div className="hidden lg:flex lg:w-3/5 items-center justify-center p-16 relative z-10">
        <div className="max-w-3xl">
          <div className="mb-12">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent mb-8 leading-tight">
              Elite Logistics
              <span className="block text-5xl font-light mt-2">Management Suite</span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-gray-400 to-white mb-8"></div>
            <p className="text-2xl text-gray-100/80 font-light leading-relaxed tracking-wide">
              Precision fleet control with real-time analytics and comprehensive expense monitoring for BlackSmith Traders
            </p>
          </div>
          
          {/* Premium Feature List */}
          <div className="space-y-10">
            <div className="flex items-start space-x-8 group">
              <div className="p-5 bg-gradient-to-br from-gray-600/20 to-gray-800/20 rounded-2xl border border-gray-400/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Route className="w-10 h-10 text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-wide">Real-time Fleet Tracking</h3>
                <p className="text-gray-200/80 text-lg leading-relaxed font-light">Advanced GPS monitoring with precision location data, route optimization, and live journey analytics for complete fleet visibility</p>
              </div>
            </div>

            <div className="flex items-start space-x-8 group">
              <div className="p-5 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-2xl border border-gray-400/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Receipt className="w-10 h-10 text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-wide">Intelligent Expense Control</h3>
                <p className="text-gray-200/80 text-lg leading-relaxed font-light">Automated expense categorization with real-time profitability analysis, cost optimization insights, and detailed financial reporting</p>
              </div>
            </div>

            <div className="flex items-start space-x-8 group">
              <div className="p-5 bg-gradient-to-br from-gray-700/20 to-gray-900/20 rounded-2xl border border-gray-400/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-10 h-10 text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-wide">Advanced Analytics Dashboard</h3>
                <p className="text-gray-200/80 text-lg leading-relaxed font-light">Comprehensive profit/loss indicators with predictive analytics, performance metrics, and strategic business intelligence</p>
              </div>
            </div>

            <div className="flex items-start space-x-8 group">
              <div className="p-5 bg-gradient-to-br from-gray-600/20 to-black/20 rounded-2xl border border-gray-400/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Settings className="w-10 h-10 text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-wide">Enterprise Reporting Suite</h3>
                <p className="text-gray-200/80 text-lg leading-relaxed font-light">Executive-grade reports with customizable dashboards, automated insights, and comprehensive fleet performance analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
