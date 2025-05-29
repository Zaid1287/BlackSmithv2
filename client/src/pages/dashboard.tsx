import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import StartJourneyModal from "@/components/start-journey-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showJourneyModal, setShowJourneyModal] = useState(false);

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

  const hasActiveJourney = user?.role === "driver" && activeJourneys.some((j: any) => j.driverId === user.id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}!</p>
        </div>
        {!hasActiveJourney && (
          <Button 
            onClick={() => setShowJourneyModal(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Journey
          </Button>
        )}
      </div>

      {hasActiveJourney ? (
        <div className="space-y-6">
          {/* Active Journey Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Active Journey</h2>
                  <p className="text-gray-600">You have an active journey in progress</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700">
                  View Journey
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Main Action Area */}
          <div className="flex justify-center mb-8">
            <Card className="w-full max-w-2xl border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Truck className="text-gray-600" size={32} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Ready to Start Your Journey?</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">You don't have any active journeys at the moment. Start a new journey to begin tracking your route, expenses, and more.</p>
                <Button 
                  onClick={() => setShowJourneyModal(true)}
                  className="bg-gray-900 hover:bg-gray-800 px-8 py-3"
                  size="lg"
                >
                  Start New Journey
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-green-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-lg font-medium">Total Revenue</span>
                    </div>
                    <div className="text-3xl font-bold">₹{(financialStats?.revenue || 0).toLocaleString()}</div>
                    <div className="text-sm opacity-90 mt-2">
                      <div>Journey Revenue + Security</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingDown className="w-5 h-5" />
                      <span className="text-lg font-medium">Total Expenses</span>
                    </div>
                    <div className="text-3xl font-bold">₹{(financialStats?.expenses || 0).toLocaleString()}</div>
                    <div className="text-sm opacity-90 mt-2">
                      <div>Journey + Salary Expenses</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-lg font-medium">Net Profit</span>
                    </div>
                    <div className="text-3xl font-bold">₹{(financialStats?.netProfit || 0).toLocaleString()}</div>
                    <div className="text-sm opacity-90 mt-2">
                      <div>Current Financial Status</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <StartJourneyModal 
        open={showJourneyModal} 
        onOpenChange={setShowJourneyModal} 
      />
    </div>
  );
}
