import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Users, MapPin, TrendingUp, DollarSign, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

export default function FinancialManagement() {
  const { data: financialStats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/financial"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/financial", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch financial stats");
      return response.json();
    },
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: journeys } = useQuery({
    queryKey: ["/api/journeys"],
    queryFn: async () => {
      const response = await fetch("/api/journeys", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch journeys");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const netProfit = (financialStats?.revenue || 0) - (financialStats?.expenses || 0);
  const profitMargin = financialStats?.revenue > 0 ? (netProfit / financialStats.revenue) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex">
      {/* Left Sidebar - Controls */}
      <div className="w-80 bg-white/10 backdrop-blur-lg border-r border-white/20 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Control Panel</h2>
          <p className="text-blue-200">Manage fleet operations</p>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Fleet Size</p>
                <p className="text-2xl font-bold text-white">{vehicles?.length || 0}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-300" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Active Drivers</p>
                <p className="text-2xl font-bold text-white">{users?.filter(u => u.role === 'driver')?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-300" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Journeys</p>
                <p className="text-2xl font-bold text-white">{journeys?.length || 0}</p>
              </div>
              <MapPin className="w-8 h-8 text-orange-300" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ₹{Math.abs(netProfit).toLocaleString()}
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-12">
            <Users className="w-5 h-5 mr-2" />
            Manage Users
          </Button>
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white border-0 h-12">
            <Truck className="w-5 h-5 mr-2" />
            Fleet Management
          </Button>
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 h-12">
            <DollarSign className="w-5 h-5 mr-2" />
            Salary Management
          </Button>
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 h-12">
            <TrendingUp className="w-5 h-5 mr-2" />
            Financial Reports
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-blue-200 text-lg">BlackSmith Traders Management Console</p>
        </div>

        {/* Main Statistics Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Financial Overview */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Financial Overview</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-green-500/20 rounded-full mr-4">
                    <DollarSign className="w-6 h-6 text-green-300" />
                  </div>
                  <div>
                    <p className="text-green-200 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-300">₹{(financialStats?.revenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-red-500/20 rounded-full mr-4">
                    <AlertCircle className="w-6 h-6 text-red-300" />
                  </div>
                  <div>
                    <p className="text-red-200 text-sm">Total Expenses</p>
                    <p className="text-3xl font-bold text-red-300">₹{(financialStats?.expenses || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-medium text-white">Net Result</span>
                  <span className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {netProfit >= 0 ? '+' : '-'}₹{Math.abs(netProfit).toLocaleString()}
                  </span>
                </div>
                <p className="text-blue-200 text-sm mt-2">
                  {profitMargin.toFixed(1)}% profit margin
                </p>
              </div>
            </div>
          </div>

          {/* Fleet Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Fleet Status</h3>
            
            <div className="space-y-4">
              {vehicles?.slice(0, 5).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-4"></div>
                    <div>
                      <p className="font-semibold text-white">{vehicle.licensePlate}</p>
                      <p className="text-blue-200 text-sm">{vehicle.model}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    Available
                  </Badge>
                </div>
              )) || (
                <div className="text-center py-12">
                  <Truck className="w-16 h-16 mx-auto mb-4 text-white/30" />
                  <p className="text-white/60">No vehicles registered</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-blue-200 text-sm mb-2">Active Journeys</p>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-blue-300 text-xs">Currently running</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 text-sm mb-2">Monthly Revenue</p>
              <p className="text-3xl font-bold text-green-300">₹{(financialStats?.revenue || 0).toLocaleString()}</p>
              <p className="text-green-400 text-xs">This month</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 text-sm mb-2">Fuel Efficiency</p>
              <p className="text-3xl font-bold text-orange-300">24.5</p>
              <p className="text-orange-400 text-xs">km/liter avg</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 text-sm mb-2">Driver Rating</p>
              <p className="text-3xl font-bold text-yellow-300">4.8</p>
              <p className="text-yellow-400 text-xs">Average rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
