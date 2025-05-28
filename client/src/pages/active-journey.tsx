import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  Plus, 
  Gauge, 
  Route, 
  DollarSign, 
  Fuel, 
  Utensils,
  Pause,
  Play,
  Square,
  AlertTriangle
} from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import StartJourneyModal from "@/components/start-journey-modal";
import AddExpenseModal from "@/components/add-expense-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ActiveJourney() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const { data: activeJourneys = [], isLoading } = useQuery({
    queryKey: ["/api/journeys/active"],
    queryFn: async () => {
      const response = await fetch("/api/journeys/active", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch active journeys");
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
    staleTime: 0, // Always fetch fresh data
  });

  const userActiveJourney = activeJourneys.find((journey: any) => journey.driverId === user?.id);

  const { data: expenses = [] } = useQuery({
    queryKey: [`/api/journeys/${userActiveJourney?.id}/expenses`],
    queryFn: async () => {
      if (!userActiveJourney?.id) return [];
      const response = await fetch(`/api/journeys/${userActiveJourney.id}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!userActiveJourney?.id,
  });

  const completeJourneyMutation = useMutation({
    mutationFn: async (journeyId: number) => {
      const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journey Completed",
        description: "Your journey has been completed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete journey",
        variant: "destructive",
      });
    },
  });

  const handleCompleteJourney = () => {
    if (userActiveJourney && confirm("Are you sure you want to complete this journey?")) {
      completeJourneyMutation.mutate(userActiveJourney.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading active journey...</div>
      </div>
    );
  }

  if (!userActiveJourney) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Route className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Journey</h2>
          <p className="text-gray-500 mb-6">You don't have any active journeys at the moment.</p>
          <Button 
            onClick={() => setShowJourneyModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Journey
          </Button>
        </div>

        <StartJourneyModal 
          open={showJourneyModal} 
          onOpenChange={setShowJourneyModal} 
        />
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
  const currentBalance = parseFloat(userActiveJourney.pouch) + parseFloat(userActiveJourney.security) - totalExpenses;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Journey Tracking</h1>
          <p className="text-gray-500">Monitor your current journey in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            In Progress
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey Status Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Journey Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Journey to {userActiveJourney.destination}</h2>
                  <p className="text-gray-500">
                    License Plate: {userActiveJourney.licensePlate} • Started: {new Date(userActiveJourney.startTime).toLocaleTimeString()}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">In Progress</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Initial Pouch</p>
                  <p className="font-semibold">₹{parseFloat(userActiveJourney.pouch).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Security Deposit</p>
                  <p className="font-semibold">₹{parseFloat(userActiveJourney.security).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journey Expenses */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center">
                  <DollarSign className="text-green-600 mr-2" size={20} />
                  Journey Expenses
                </h3>
                <Button 
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
              
              {/* Expenses List */}
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense: any) => (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium capitalize">{expense.category.replace('_', ' ')}</h4>
                          {expense.description && (
                            <p className="text-sm text-gray-500">{expense.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(expense.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-lg">₹{parseFloat(expense.amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Expenses</span>
                      <span className="font-bold text-xl">₹{totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No expenses recorded yet</p>
                  <p className="text-sm">Click "Add Expense" to track your spending</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Controls */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Journey Controls</h3>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleCompleteJourney}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={completeJourneyMutation.isPending}
                >
                  <Square className="w-4 h-4 mr-2" />
                  {completeJourneyMutation.isPending ? "Completing..." : "Complete Journey"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Financial Summary Panel */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Initial Pouch</span>
                  <span className="font-semibold">₹{parseFloat(userActiveJourney.pouch).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-semibold">₹{parseFloat(userActiveJourney.security).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Expenses</span>
                  <span className="font-semibold text-red-600">-₹{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Current Balance</span>
                    <span className={`font-bold text-lg ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {userActiveJourney && (
        <AddExpenseModal 
          open={showExpenseModal} 
          onOpenChange={setShowExpenseModal}
          journeyId={userActiveJourney.id}
        />
      )}

      <StartJourneyModal 
        open={showJourneyModal} 
        onOpenChange={setShowJourneyModal} 
      />
    </div>
  );
}