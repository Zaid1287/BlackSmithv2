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
import ExpenseQuickEntry from "@/components/expense-quick-entry";
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
    queryKey: ["/api/journeys/expenses", userActiveJourney?.id],
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
      const response = await fetch(`/api/journeys/${journeyId}/complete`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to complete journey");
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

  // Calculate actual expenses (excluding HYD Inward and Top Up)
  const actualExpenses = expenses.filter((expense: any) => 
    expense.category !== 'hyd_inward' && expense.category !== 'top_up'
  );
  const totalExpenses = actualExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
  
  // Calculate top-up amounts to add to balance
  const topUpExpenses = expenses.filter((expense: any) => expense.category === 'top_up');
  const totalTopUp = topUpExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
  
  const currentBalance = parseFloat(userActiveJourney.pouch) + totalTopUp - totalExpenses;

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Journey Status Panel */}
        <div className="lg:col-span-5 space-y-6">
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

          {/* Quick Expense Entry */}
          <Card>
            <CardContent className="p-6 md:p-10 lg:p-14 w-full">
              <h3 className="text-xl md:text-2xl font-bold flex items-center mb-8">
                <DollarSign className="text-green-600 mr-3 md:mr-4 w-6 h-6 md:w-8 md:h-8" />
                Quick Expense Entry
              </h3>
              <ExpenseQuickEntry journeyId={userActiveJourney.id} />
            </CardContent>
          </Card>

          {/* Expense History */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-6">Expense History</h3>
              
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense: any) => (
                    <div key={expense.id} className={`border rounded-lg p-4 ${
                      expense.category === 'hyd_inward' || expense.category === 'top_up' 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium capitalize ${
                            expense.category === 'hyd_inward' || expense.category === 'top_up' 
                              ? 'text-green-700' 
                              : 'text-gray-900'
                          }`}>
                            {expense.category.replace('_', ' ')}
                            {(expense.category === 'hyd_inward' || expense.category === 'top_up') && (
                              <span className="text-xs text-green-600 ml-2">+Income</span>
                            )}
                          </h4>
                          {expense.description && (
                            <p className="text-sm text-gray-500">{expense.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(expense.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold text-lg ${
                            expense.category === 'hyd_inward' || expense.category === 'top_up' 
                              ? 'text-green-600' 
                              : 'text-gray-900'
                          }`}>
                            {(expense.category === 'hyd_inward' || expense.category === 'top_up') ? '+' : ''}₹{parseFloat(expense.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Totals */}
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Expenses</span>
                      <span className="font-bold text-xl">₹{totalExpenses.toLocaleString()}</span>
                    </div>
                    {totalTopUp > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-green-700">Total Top Up</span>
                        <span className="font-bold text-xl text-green-600">+₹{totalTopUp.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No expenses recorded yet</p>
                  <p className="text-sm">Use the quick entry above to start tracking expenses</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Photos - Admin Only */}
          {user?.role === 'admin' && userActiveJourney?.photos && Array.isArray(userActiveJourney.photos) && userActiveJourney.photos.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Journey Photos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {userActiveJourney.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                      <img 
                        src={photo} 
                        alt={`Journey photo ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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