import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CreditCard, TrendingUp, Download, RefreshCw, BarChart3 } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-500">Overview of revenue, expenses, and profitability</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Financial Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bs-gradient-green text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <DollarSign className="mr-2" size={20} />
                      <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
                    </div>
                    <p className="text-3xl font-bold">₹{(financialStats?.revenue || 0).toLocaleString()}</p>
                    <div className="flex items-center text-sm mt-2 opacity-90">
                      <span>From completed journeys</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bs-gradient-red text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <CreditCard className="mr-2" size={20} />
                      <h3 className="text-sm font-medium opacity-90">Total Expenses</h3>
                    </div>
                    <p className="text-3xl font-bold">₹{(financialStats?.expenses || 0).toLocaleString()}</p>
                    <div className="flex items-center text-sm mt-2 opacity-90">
                      <span>Journey-related expenses</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-2">
                      <TrendingUp className="mr-2" size={20} />
                      <h3 className="text-sm font-medium opacity-90">Net Profit</h3>
                    </div>
                    <p className="text-3xl font-bold">₹{(financialStats?.netProfit || 0).toLocaleString()}</p>
                    <div className="flex items-center text-sm mt-2 opacity-90">
                      <span>
                        {financialStats?.revenue > 0 
                          ? `${((financialStats.netProfit / financialStats.revenue) * 100).toFixed(1)}% margin`
                          : 'No revenue data'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Financial Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Revenue Sources</h3>
                <p className="text-sm text-gray-500">Breakdown of income sources</p>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Journey Payments (Pouch)</span>
                    <span className="font-medium">₹{(financialStats?.revenue * 0.7 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Security Deposits</span>
                    <span className="font-medium">₹{(financialStats?.revenue * 0.3 || 0).toLocaleString()}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Revenue</span>
                    <span className="profit-green">₹{(financialStats?.revenue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Analysis */}
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Expense Analysis</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">By Category</button>
                  <button className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm">Timeline</button>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Expense Categories */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm">Fuel</span>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm">Salary</span>
                    </div>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                      <span className="text-sm">Maintenance</span>
                    </div>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary Overview */}
          <Card>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Salary Management Overview</h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{(financialStats?.salaryStats?.total || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Monthly Salaries</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold profit-green">
                    ₹{(financialStats?.salaryStats?.paid || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Paid This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{(financialStats?.salaryStats?.remaining || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Pending Payments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fleet Financial Analysis</h3>
                <p className="text-gray-500">
                  Detailed fleet cost analysis and ROI calculations will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Financial Reports</h3>
                <p className="text-gray-500">
                  Comprehensive financial reports and analytics will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
