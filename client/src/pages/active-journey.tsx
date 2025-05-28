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

  // Mock real-time data updates
  const mockSpeed = 65 + Math.floor(Math.random() * 20);
  const mockDistance = 245 + Math.floor(Math.random() * 100);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userActiveJourney) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Journey</h1>
            <p className="text-gray-500">Start a new journey to begin tracking</p>
          </div>
          <Button 
            onClick={() => setShowJourneyModal(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Journey
          </Button>
        </div>

        {/* Empty State */}
        <Card className="border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Route className="text-blue-600" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Journey</h2>
          <p className="text-gray-500 mb-6">You don't have any active journeys at the moment. Start a new journey to begin tracking your route, expenses, and more.</p>
          <Button 
            onClick={() => setShowJourneyModal(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Journey
          </Button>
        </Card>

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
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <DollarSign className="text-green-600 mr-2" size={20} />
                Journey Expenses
              </h3>
              
              {/* Income Section */}
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">HYD Inward Income</h4>
                      <p className="text-sm text-green-600">(This is an income item)</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-3 py-2 w-32"
                      />
                      <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center">
                        Add <Plus className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Categories Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Loading</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Rope</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Fuel</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Food</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Toll</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Maintenance</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">RTO</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">NZB Unloading</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 5 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">HYD Unloading</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Miscellaneous</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 6 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Mechanical</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Electrical</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 7 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Body Works</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tires Air</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 8 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tire Change</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tire Greasing</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 9 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Weighment</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">AdBlue</span>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                      <button className="border border-gray-300 rounded px-2 py-1 text-sm flex items-center">
                        Add <Plus className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Up Section */}
              <div className="mt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-green-800">Top Up</span>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="text" 
                        placeholder="₹ Amount" 
                        className="border border-gray-300 rounded px-3 py-2 w-32"
                      />
                      <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center">
                        Top Up <Plus className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview Panel */}
        <div className="space-y-6">
          {/* Profit/Loss Indicator */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Financial Status</h3>
              
              {/* Live Counter */}
              <div className="text-center mb-4">
                <div className={`text-3xl font-bold mb-2 profit-loss-indicator ${
                  currentBalance >= 0 ? 'profit-green' : 'loss-red'
                }`}>
                  {currentBalance >= 0 ? '+' : ''}₹{currentBalance.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  {currentBalance >= 0 ? 'Current Profit' : 'Current Loss'}
                </p>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Initial Pouch:</span>
                  <span className="font-medium profit-green">+₹{parseFloat(userActiveJourney.pouch).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit:</span>
                  <span className="font-medium text-blue-600">+₹{parseFloat(userActiveJourney.security).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Expenses:</span>
                  <span className="font-medium loss-red">-₹{totalExpenses.toLocaleString()}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Net Balance:</span>
                  <span className={currentBalance >= 0 ? 'profit-green' : 'loss-red'}>
                    {currentBalance >= 0 ? '+' : ''}₹{currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
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
