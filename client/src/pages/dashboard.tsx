import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, TrendingUp, DollarSign, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import StartJourneyModal from "@/components/start-journey-modal";
import AddUserModal from "@/components/add-user-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const { data: activeJourneys = [] } = useQuery({
    queryKey: ["/api/journeys/active"],
    queryFn: async () => {
      const response = await fetch("/api/journeys/active", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch active journeys");
      return response.json();
    },
  });

  const { data: userJourneys = [] } = useQuery({
    queryKey: ["/api/journeys"],
    queryFn: async () => {
      const response = await fetch("/api/journeys", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch journeys");
      return response.json();
    },
    enabled: user?.role === "driver",
  });

  // Fetch financial stats for all users
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

  // Fetch all users for available drivers
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const hasActiveJourney = user?.role === "driver" && activeJourneys.some((j: any) => j.driverId === user.id);
  
  // Get available drivers (drivers not on active journeys)
  const availableDrivers = allUsers.filter((driver: any) => 
    driver.role === 'driver' && !activeJourneys.some((journey: any) => journey.driverId === driver.id)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Journeys Card */}
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Activity className="w-5 h-5" />
              <span className="text-lg font-medium">Active Journeys</span>
            </div>
            <div className="text-4xl font-bold mb-2">{activeJourneys.length}</div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="bg-green-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <DollarSign className="w-5 h-5" />
              <span className="text-lg font-medium">Total Revenue</span>
            </div>
            <div className="text-4xl font-bold mb-2">₹{(financialStats?.revenue || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-5 h-5" />
              <span className="text-lg font-medium">Net Profit</span>
            </div>
            <div className="text-4xl font-bold mb-2">₹{(financialStats?.netProfit || 0).toLocaleString()}</div>
            <div className="text-sm opacity-90">
              {financialStats?.netProfit >= 0 ? '↑ 12% from last month' : '↓ Loss this period'}
            </div>
            <div className="text-xs opacity-75 mt-1">
              Net Profit = (Revenue + Security Deposits - Expenses) - Salary Payments + Salary Refunds (₹{(financialStats?.breakdown?.salaryDebts || 0).toLocaleString()})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Journeys Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Journeys</h2>
              
              {activeJourneys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No active journeys at the moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJourneys.map((journey: any) => (
                    <div key={journey.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Journey #{journey.id}</p>
                          <p className="text-sm text-gray-500">To: {journey.destination}</p>
                          <p className="text-sm text-gray-500">Driver: {journey.driverName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Started</p>
                          <p className="text-sm font-medium">{new Date(journey.startTime).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Drivers Section */}
        <div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Available Drivers</h2>
              </div>
              
              {user?.role === 'admin' ? (
                <>
                  {availableDrivers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No available drivers</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {availableDrivers.map((driver: any) => (
                        <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{driver.name}</p>
                            <p className="text-sm text-gray-500">@{driver.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => setShowAddUserModal(true)}
                    variant="outline" 
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Driver
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Driver information visible to admins only</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Driver Action */}
      {user?.role === 'driver' && !hasActiveJourney && (
        <div className="flex justify-center">
          <Button 
            onClick={() => setShowJourneyModal(true)}
            className="bg-blue-500 hover:bg-blue-600 px-8 py-3"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Journey
          </Button>
        </div>
      )}

      <StartJourneyModal 
        open={showJourneyModal} 
        onOpenChange={setShowJourneyModal} 
      />
      
      {user?.role === 'admin' && (
        <AddUserModal 
          open={showAddUserModal} 
          onOpenChange={setShowAddUserModal} 
        />
      )}
    </div>
  );
}
