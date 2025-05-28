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
      const response = await login(data.username, data.password);
      toast({
        title: "Login Successful",
        description: "Welcome back to BlackSmith Traders!",
      });
      // Redirect based on user role
      if (response.user.role === 'admin') {
        setLocation("/financial-management");
      } else {
        setLocation("/active-journeys");
      }
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
      setLocation("/financial-management");
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
      setLocation("/active-journeys");
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

      {/* Centered Login Form */}
      <div className="w-full flex items-center justify-center p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Premium Login Container */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl relative">
            {/* Luxury Accent Lines */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            
            {/* Premium Logo */}
            <div className="text-center mb-8">
              <div className="mb-6">
                {/* Large B|S Logo */}
                <div className="flex items-center justify-center mb-4">
                  <span className="text-6xl font-serif font-bold text-white">B</span>
                  <div className="w-0.5 h-16 bg-white mx-4"></div>
                  <span className="text-6xl font-serif font-bold text-white">S</span>
                </div>
                {/* Company Name */}
                <div className="text-white text-lg font-light tracking-[0.3em] uppercase">
                  BLACKSMITH TRADERS
                </div>
              </div>
            </div>

            {/* Premium Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-100/90 mb-2 tracking-wide uppercase">Username</Label>
                <Input 
                  {...register("username")}
                  placeholder="Enter your username" 
                  className="w-full h-12 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-gray-400/50 focus:bg-white/15 rounded-xl px-4 text-base backdrop-blur-sm transition-all duration-300 shadow-inner"
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-red-300 text-sm mt-1 ml-2">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-100/90 mb-2 tracking-wide uppercase">Password</Label>
                <Input 
                  {...register("password")}
                  type="password" 
                  placeholder="Enter your password" 
                  className="w-full h-12 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-gray-400/50 focus:bg-white/15 rounded-xl px-4 text-base backdrop-blur-sm transition-all duration-300 shadow-inner"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-red-300 text-sm mt-1 ml-2">{errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white border-0 rounded-xl font-semibold text-base tracking-wide shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : "Login"}
              </Button>
              
              <div className="space-y-3 pt-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-transparent text-gray-200/70 font-light tracking-widest uppercase">Demo Access</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={loginAsAdmin}
                  className="w-full h-10 bg-gradient-to-r from-gray-700/80 to-gray-900/80 hover:from-gray-800 hover:to-black text-white border border-gray-400/30 rounded-lg font-medium tracking-wide transition-all duration-300 backdrop-blur-sm"
                  disabled={isLoading}
                >
                  Executive Access
                </Button>
                
                <Button 
                  type="button" 
                  onClick={loginAsDriver}
                  className="w-full h-10 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg font-medium tracking-wide transition-all duration-300 backdrop-blur-sm"
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
    </div>
  );
}
