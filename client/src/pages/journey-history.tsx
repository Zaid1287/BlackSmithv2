import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import AddExpenseModal from "@/components/add-expense-modal";
import JourneyExpenseBreakdown from "@/components/journey-expense-breakdown";

export default function JourneyHistory() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);

  const { data: journeys = [], isLoading } = useQuery({
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

  // Fetch all expenses to check for HYD Inward entries (admin only)
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["/api/expenses/all"],
    queryFn: async () => {
      const response = await fetch("/api/expenses/all", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: user?.role === 'admin', // Only fetch for admin users
  });

  const filteredJourneys = journeys.filter((journey: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "hyd_inward_missing") {
      // Check if journey has any HYD Inward expenses
      const hasHydInward = allExpenses.some((expense: any) => 
        expense.journeyId === journey.id && expense.category === 'hyd_inward'
      );
      return !hasHydInward && journey.status === 'completed';
    }
    return journey.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Journey History</h2>
              <p className="text-gray-500 mt-1">View all journeys and their details</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Filter by status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Journeys</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="active">In Progress</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  {user?.role === 'admin' && (
                    <SelectItem value="hyd_inward_missing">HYD Inward not entered</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJourneys.map((journey: any) => (
                  <tr key={journey.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{journey.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{journey.licensePlate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{journey.destination}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(journey.startTime).toLocaleDateString()} {new Date(journey.startTime).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {journey.endTime ? (
                        <>
                          {new Date(journey.endTime).toLocaleDateString()} {new Date(journey.endTime).toLocaleTimeString()}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          journey.status === 'completed' ? 'default' :
                          journey.status === 'active' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {journey.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={parseFloat(journey.balance) >= 0 ? 'profit-green' : 'loss-red'}>
                        {parseFloat(journey.balance) >= 0 ? '+' : ''}₹{parseFloat(journey.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <JourneyExpenseBreakdown 
                          journeyId={journey.id} 
                          journeyData={journey} 
                        />
                        {user?.role === 'admin' && journey.status === 'completed' && !allExpenses.some((expense: any) => 
                          expense.journeyId === journey.id && expense.category === 'hyd_inward'
                        ) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJourneyId(journey.id);
                              setShowAddExpenseModal(true);
                            }}
                            className="text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            HYD Inward
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredJourneys.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {statusFilter === "all" 
                ? "No journeys found. Start your first journey to see it here."
                : statusFilter === "hyd_inward_missing"
                ? "No completed journeys missing HYD Inward entries found."
                : `No ${statusFilter} journeys found.`
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal for HYD Inward */}
      {selectedJourneyId && (
        <AddExpenseModal
          open={showAddExpenseModal}
          onOpenChange={setShowAddExpenseModal}
          journeyId={selectedJourneyId}
        />
      )}
    </div>
  );
}
