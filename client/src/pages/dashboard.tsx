import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Truck, MapPin, Receipt, Flag } from "lucide-react";
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
          {/* Empty State */}
          <Card className="border-2 border-dashed border-gray-200 p-12 text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="text-blue-600" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start Your Journey?</h2>
            <p className="text-gray-500 mb-6">You don't have any active journeys at the moment. Start a new journey to begin tracking your route, expenses, and more.</p>
            <Button 
              onClick={() => setShowJourneyModal(true)}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Journey
            </Button>
          </Card>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <MapPin className="text-blue-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Journey Tracking</h3>
                </div>
                <p className="text-gray-600 text-sm">Track your location and speed in real-time during your journey.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Receipt className="text-green-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Expense Management</h3>
                </div>
                <p className="text-gray-600 text-sm">Easily log and track all your journey-related expenses.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <Flag className="text-orange-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Journey Milestones</h3>
                </div>
                <p className="text-gray-600 text-sm">Track important events and get notifications during your journey.</p>
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
