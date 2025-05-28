import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Route, UserCheck, TrafficCone, Search } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const { data: financialStats } = useQuery({
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

  const { data: journeys = [] } = useQuery({
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

  const { data: vehicles = [] } = useQuery({
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BlackSmith Logistics Dashboard</h1>
          <p className="text-gray-500">Complete overview of your logistics operations</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bs-gradient-blue text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Vehicles</h3>
                <p className="text-3xl font-bold">{dashboardStats?.vehicles?.total || 0}</p>
              </div>
              <Truck className="text-2xl opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-indigo text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Active Journeys</h3>
                <p className="text-3xl font-bold">{dashboardStats?.journeys?.active || 0}</p>
              </div>
              <Route className="text-2xl opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-green text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Available Drivers</h3>
                <p className="text-3xl font-bold">{dashboardStats?.drivers?.available || 0}</p>
              </div>
              <UserCheck className="text-2xl opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-orange text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Avg Trip Distance</h3>
                <p className="text-3xl font-bold">{dashboardStats?.journeys?.avgDistance || 0} km</p>
              </div>
              <TrafficCone className="text-2xl opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-0 p-0">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="fleet" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50"
              >
                Fleet Management
              </TabsTrigger>
              <TabsTrigger 
                value="finances" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50"
              >
                Finances
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Journeys</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search by driver or vehicle..." 
                    className="pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Journeys</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Journey Cards */}
            <div className="space-y-4">
              {journeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No journeys found
                </div>
              ) : (
                journeys.slice(0, 5).map((journey: any) => (
                  <Card key={journey.id} className={`border-l-4 ${
                    journey.status === 'active' ? 'border-l-blue-500' : 
                    journey.status === 'completed' ? 'border-l-green-500' : 'border-l-gray-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-semibold">{journey.destination}</h4>
                            <p className="text-sm text-gray-500">License Plate: {journey.licensePlate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Current Balance:</p>
                            <p className={`font-semibold ${
                              parseFloat(journey.balance) >= 0 ? 'profit-green' : 'loss-red'
                            }`}>
                              ₹{parseFloat(journey.balance).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Speed:</p>
                            <p className="font-semibold">{journey.speed || 0} km/h</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm capitalize ${
                            journey.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            journey.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {journey.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="fleet" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Truck className="text-blue-600 mr-3" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{dashboardStats?.vehicles?.total || 0}</p>
                      <p className="text-sm text-blue-700">Total Fleet</p>
                      <p className="text-xs text-blue-600">Registered vehicles in system</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <UserCheck className="text-green-600 mr-3" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{dashboardStats?.vehicles?.available || 0}</p>
                      <p className="text-sm text-green-700">Available</p>
                      <p className="text-xs text-green-600">Ready for new journeys</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Route className="text-orange-600 mr-3" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{dashboardStats?.vehicles?.inUse || 0}</p>
                      <p className="text-sm text-orange-700">In Transit</p>
                      <p className="text-xs text-orange-600">Currently on active journeys</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bs-gradient-purple text-white">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrafficCone className="text-white mr-3" size={24} />
                    <div>
                      <p className="text-2xl font-bold">
                        {dashboardStats?.vehicles?.total > 0 
                          ? Math.round((dashboardStats.vehicles.available / dashboardStats.vehicles.total) * 100)
                          : 100}%
                      </p>
                      <p className="text-sm opacity-90">Fleet Availability</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle List */}
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Vehicle List</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button variant="default" size="sm">All Vehicles</Button>
                      <Button variant="ghost" size="sm">Available</Button>
                      <Button variant="ghost" size="sm">In Use</Button>
                    </div>
                    <Input placeholder="Search license plates..." className="w-64" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vehicles.map((vehicle: any) => (
                        <tr key={vehicle.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{vehicle.licensePlate}</div>
                            <div className="text-sm text-gray-500">ID: {vehicle.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.model}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              vehicle.status === 'available' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {vehicle.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(vehicle.addedOn).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 hover:text-red-900 cursor-pointer">
                            Delete
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
                  Showing {vehicles.length} vehicles
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances" className="p-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bs-gradient-green text-white">
                <CardContent className="p-6">
                  <div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">Total Revenue</h3>
                    <p className="text-3xl font-bold">₹{(financialStats?.revenue || 0).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bs-gradient-red text-white">
                <CardContent className="p-6">
                  <div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">Total Expenses</h3>
                    <p className="text-3xl font-bold">₹{(financialStats?.expenses || 0).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div>
                    <h3 className="text-sm font-medium opacity-90 mb-2">Net Profit</h3>
                    <p className="text-3xl font-bold">₹{(financialStats?.netProfit || 0).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Expenses */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
                <div className="text-center py-8 text-gray-500">
                  <p>Financial data will be displayed here based on completed journeys and expenses.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
