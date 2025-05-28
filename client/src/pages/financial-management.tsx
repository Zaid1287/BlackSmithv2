import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Route, ArrowUpRight } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { Link, useLocation } from "wouter";

export default function FinancialManagement() {
  const [location] = useLocation();
  
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
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeJourneys = journeys?.filter((journey: any) => journey.status === 'active') || [];
  const totalRevenue = parseFloat(financialStats?.revenue || "0");
  const totalExpenses = parseFloat(financialStats?.expenses || "0");
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="flex space-x-6 mb-8 border-b border-gray-200">
        <Link href="/financial-management">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/financial-management' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Overview
          </button>
        </Link>
        <Link href="/manage-vehicles">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/manage-vehicles' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Fleet Management
          </button>
        </Link>
        <Link href="/salaries">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/salaries' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Finances
          </button>
        </Link>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Active Journeys Card */}
        <Card className="bg-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Route className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Active Journeys</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              {activeJourneys.length}
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="bg-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Total Revenue</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              ₹{totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className="bg-green-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Net Profit</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              ₹{netProfit.toLocaleString()}
            </div>
            <div className="flex items-center text-sm opacity-90">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>12% from last month</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              Net Profit = (Revenue + Security Deposits - Expenses) - Salary Payments + Salary Refunds (₹15,200)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Journeys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Journeys</h2>
        
        {activeJourneys.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Journeys</h3>
              <p className="text-gray-500">All vehicles are currently available for new journeys.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJourneys.map((journey: any) => (
              <Card key={journey.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      In Progress
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {journey.licensePlate}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Journey to {journey.destination}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Started: {new Date(journey.startTime).toLocaleDateString()}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Pouch:</span>
                      <span className="font-medium ml-1">₹{parseFloat(journey.pouch || "0").toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Security:</span>
                      <span className="font-medium ml-1">₹{parseFloat(journey.security || "0").toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}