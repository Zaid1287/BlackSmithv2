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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to BlackSmith Traders management console</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Fleet */}
        <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Fleet</p>
                <p className="text-2xl font-bold text-gray-900">{vehicles?.length || 0}</p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {dashboardStats?.vehicles?.available || 0} Available
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Drivers */}
        <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{users?.filter(u => u.role === 'driver')?.length || 0}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">All Active</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Journeys */}
        <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Journeys</p>
                <p className="text-2xl font-bold text-gray-900">{journeys?.length || 0}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">This Month</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(netProfit).toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {netProfit >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}% margin
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <TrendingUp className={`w-6 h-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue & Expenses */}
        <Card className="bg-white border-0 shadow-md">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            <p className="text-sm text-gray-600">Revenue and expenses breakdown</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full mr-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">₹{(financialStats?.revenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-full mr-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">₹{(financialStats?.expenses || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">Net Result</span>
                  <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netProfit >= 0 ? '+' : '-'}₹{Math.abs(netProfit).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card className="bg-white border-0 shadow-md">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Fleet Status</h3>
            <p className="text-sm text-gray-600">Current vehicle availability</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              {vehicles?.slice(0, 4).map((vehicle, index) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">{vehicle.licensePlate}</p>
                      <p className="text-sm text-gray-600">{vehicle.model}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                </div>
              )) || (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No vehicles registered</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-0 shadow-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-600">Manage your fleet and operations</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700">
              <Users className="w-6 h-6 mb-2" />
              <span>Manage Users</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center bg-green-600 hover:bg-green-700">
              <Truck className="w-6 h-6 mb-2" />
              <span>Fleet Management</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center bg-orange-600 hover:bg-orange-700">
              <DollarSign className="w-6 h-6 mb-2" />
              <span>Salary Management</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center bg-purple-600 hover:bg-purple-700">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Financial Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
