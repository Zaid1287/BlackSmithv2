import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Route, UserCheck, TrafficCone, Search, X, Plus } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import AddExpenseModal from "@/components/add-expense-modal";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const queryClient = useQueryClient();

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
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
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
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
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
    refetchInterval: 5000, // Refresh every 5 seconds for faster journey updates
    staleTime: 2000, // Consider data stale after 2 seconds
    refetchOnWindowFocus: true, // Refetch when user focuses the window
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
    staleTime: 30000, // Vehicles don't change often, cache for 30 seconds
  });

  const { data: selectedJourneyExpenses = [] } = useQuery({
    queryKey: ["/api/journeys", selectedJourney?.id, "expenses"],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${selectedJourney?.id}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!selectedJourney?.id,
    refetchInterval: 3000, // Refresh expenses every 3 seconds when modal is open
    staleTime: 1000, // Consider expenses stale after 1 second
  });

  if (!dashboardStats || !financialStats) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 mobile-optimized">
      <div className="flex items-center justify-between mb-4 md:mb-8 fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">BlackSmith Logistics</h1>
          <p className="text-sm md:text-base text-gray-500 hidden md:block">Complete overview of your logistics operations</p>
          <div className="flex items-center mt-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Live data - Updates every 5 seconds
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8 mobile-grid">
        <Card className="bs-gradient-blue text-white hover-lift scale-in mobile-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-medium opacity-90">Total Vehicles</h3>
                <p className="text-xl md:text-3xl font-bold">{dashboardStats?.vehicles?.total || 0}</p>
              </div>
              <Truck className="opacity-80" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-indigo text-white hover-lift scale-in mobile-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-medium opacity-90">Active Journeys</h3>
                <p className="text-xl md:text-3xl font-bold">{dashboardStats?.journeys?.active || 0}</p>
              </div>
              <Route className="opacity-80" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-green text-white hover-lift scale-in mobile-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-medium opacity-90">Available Drivers</h3>
                <p className="text-xl md:text-3xl font-bold">{dashboardStats?.drivers?.available || 0}</p>
              </div>
              <UserCheck className="opacity-80" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-orange text-white hover-lift scale-in mobile-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-medium opacity-90">Revenue</h3>
                <p className="text-lg md:text-2xl font-bold">₹{parseFloat(financialStats?.revenue || 0).toLocaleString()}</p>
              </div>
              <TrafficCone className="opacity-80" size={24} />
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

            {/* Journey Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mobile-grid">
              {journeys.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500 fade-in">
                  <Route className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Journeys Available</h3>
                  <p className="mobile-text">Start by creating a new journey from the manage vehicles section</p>
                </div>
              ) : (
                journeys
                  .filter((journey: any) => 
                    statusFilter === 'all' || journey.status === statusFilter
                  )
                  .filter((journey: any) =>
                    searchTerm === '' || 
                    journey.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    journey.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    journey.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .slice(0, 12).map((journey: any, index: number) => (
                  <Card 
                    key={journey.id} 
                    className={`cursor-pointer hover-lift border-l-4 slide-up mobile-card ${
                      journey.status === 'active' ? 'border-l-blue-500' : 
                      journey.status === 'completed' ? 'border-l-green-500' : 'border-l-gray-500'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base md:text-lg truncate mobile-text">{journey.destination}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs capitalize scale-in ${
                            journey.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            journey.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {journey.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 md:space-y-2">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-gray-500">License Plate:</span>
                            <span className="font-medium">{journey.licensePlate}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-gray-500">Balance:</span>
                            <span className={`font-medium ${
                              parseFloat(journey.balance) >= 0 ? 'profit-green' : 'loss-red'
                            }`}>
                              ₹{parseFloat(journey.balance).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-gray-500">Speed:</span>
                            <span className="font-medium">{journey.speed || 0} km/h</span>
                          </div>
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

      {/* Journey Details Modal */}
      <Dialog open={!!selectedJourney} onOpenChange={() => setSelectedJourney(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mobile-modal scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl mobile-text">
              Journey Details - {selectedJourney?.destination}
            </DialogTitle>
          </DialogHeader>

          {selectedJourney && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mobile-grid">
              {/* Journey Information */}
              <div className="fade-in">
                <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Journey Information</h3>
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Driver</p>
                      <p className="font-medium text-sm md:text-lg">{selectedJourney.driverName || 'Driver Name'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">License Plate</p>
                      <p className="font-medium text-sm md:text-lg">{selectedJourney.licensePlate}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Started At</p>
                      <p className="font-medium text-lg">
                        {selectedJourney.startTime ? new Date(selectedJourney.startTime).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">ETA</p>
                      <p className="font-medium text-lg">Unknown</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Distance</p>
                      <p className="font-medium text-lg">{selectedJourney.distance || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedJourney.status === 'completed' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {selectedJourney.status === 'completed' ? '✓ Completed' : selectedJourney.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Financial Information</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Pouch Amount</p>
                      <p className="font-medium text-lg">₹{parseFloat(selectedJourney.pouch || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Security Deposit</p>
                      <div>
                        <p className="font-medium text-lg">₹{parseFloat(selectedJourney.security || 0).toLocaleString()}</p>
                        {selectedJourney.status === 'completed' && (
                          <p className="text-green-600 text-xs">Added back to balance (journey completed)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">HYD Inward</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg text-green-600">
                          ₹{selectedJourneyExpenses
                            .filter((exp: any) => exp.category === 'hyd_inward')
                            .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0)
                            .toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const amount = prompt('Enter HYD Inward amount:');
                            if (amount && !isNaN(parseFloat(amount))) {
                              // Add HYD Inward expense
                              fetch(`/api/journeys/${selectedJourney.id}/expenses`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...getAuthHeaders(),
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                  journeyId: selectedJourney.id,
                                  category: 'hyd_inward',
                                  amount: amount,
                                  description: 'HYD Inward Revenue'
                                })
                              }).then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/journeys", selectedJourney.id, "expenses"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
                              });
                            }
                          }}
                          className="text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Current Expenses</p>
                      <p className="font-medium text-lg">₹{parseFloat(selectedJourney.totalExpenses || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Total Top-ups</p>
                      <p className="font-medium text-lg text-green-600">
                        +₹{selectedJourneyExpenses
                          .filter((exp: any) => exp.category === 'top_up')
                          .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Toll Expenses</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg">
                          ₹{selectedJourneyExpenses
                            .filter(exp => exp.category === 'toll')
                            .reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
                            .toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const amount = prompt('Enter Toll amount:');
                            if (amount && !isNaN(parseFloat(amount))) {
                              // Add Toll expense
                              fetch(`/api/journeys/${selectedJourney.id}/expenses`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...getAuthHeaders(),
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                  journeyId: selectedJourney.id,
                                  category: 'toll',
                                  amount: amount,
                                  description: 'Toll Expense'
                                })
                              }).then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/journeys", selectedJourney.id, "expenses"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
                              });
                            }
                          }}
                          className="text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div>
                      <p className="text-gray-500 text-sm">Current Balance</p>
                      <p className={`font-bold text-2xl ${
                        parseFloat(selectedJourney.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{parseFloat(selectedJourney.balance || 0).toLocaleString()}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Working Balance:</strong> ₹{selectedJourney.pouch || 0} (pouch) + ₹{selectedJourneyExpenses.filter(exp => exp.category === 'top_up').reduce((sum, exp) => sum + parseFloat(exp.amount), 0)} (top-ups) - ₹{selectedJourney.totalExpenses || 0} (expenses)</p>
                        {selectedJourney.status === 'completed' && (
                          <p><strong>Final Adjustments:</strong> ₹{selectedJourney.security || 0} (security) (added because journey is completed)</p>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => setShowAddExpenseModal(true)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Expense
                        </Button>
                        {selectedJourney.status === 'active' && (
                          <Button
                            onClick={() => {
                              if (confirm(`Complete journey to ${selectedJourney.destination}?`)) {
                                fetch(`/api/journeys/${selectedJourney.id}/complete`, {
                                  method: 'POST',
                                  headers: getAuthHeaders(),
                                  credentials: 'include'
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
                                  setSelectedJourney(null);
                                });
                              }
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Complete Journey
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      {selectedJourney && (
        <AddExpenseModal
          open={showAddExpenseModal}
          onOpenChange={setShowAddExpenseModal}
          journeyId={selectedJourney.id}
        />
      )}
    </div>
  );
}
