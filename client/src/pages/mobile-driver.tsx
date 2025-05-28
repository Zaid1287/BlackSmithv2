import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Play, 
  Square, 
  Plus, 
  Wifi, 
  WifiOff, 
  Navigation,
  Clock,
  Fuel,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { offlineStorage, locationTracker, networkManager, type OfflineJourney, type OfflineExpense, type LocationUpdate } from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";

export default function MobileDriver() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentJourney, setCurrentJourney] = useState<OfflineJourney | null>(null);
  const [journeys, setJourneys] = useState<OfflineJourney[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    type: '',
    amount: '',
    description: ''
  });

  // Journey form state
  const [journeyForm, setJourneyForm] = useState({
    destination: '',
    vehicleId: ''
  });

  useEffect(() => {
    initializeOfflineStorage();
    setupNetworkListener();
    loadJourneys();
  }, []);

  const initializeOfflineStorage = async () => {
    try {
      await offlineStorage.init();
      console.log('Offline storage initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      toast({
        title: "Storage Error",
        description: "Failed to initialize offline storage",
        variant: "destructive"
      });
    }
  };

  const setupNetworkListener = () => {
    networkManager.onStatusChange((online) => {
      setIsOnline(online);
      toast({
        title: online ? "Back Online" : "Gone Offline",
        description: online ? "Data will sync automatically" : "Working in offline mode",
        variant: online ? "default" : "destructive"
      });
    });
  };

  const loadJourneys = async () => {
    if (!user) return;
    
    try {
      const offlineJourneys = await offlineStorage.getJourneys(user.id);
      setJourneys(offlineJourneys);
      
      // Find active journey
      const active = offlineJourneys.find(j => j.status === 'active');
      if (active) {
        setCurrentJourney(active);
        setIsTracking(true);
        startLocationTracking(active.id);
      }
    } catch (error) {
      console.error('Failed to load journeys:', error);
    }
  };

  const startJourney = async () => {
    if (!user || !journeyForm.destination) return;

    try {
      // Request location permission
      const hasPermission = await locationTracker.requestPermission();
      if (!hasPermission) {
        toast({
          title: "Location Required",
          description: "Please enable location access to start journey tracking",
          variant: "destructive"
        });
        return;
      }

      // Get current location
      const location = await locationTracker.getCurrentLocation();
      setCurrentLocation(location);

      // Create new journey
      const newJourney: OfflineJourney = {
        id: `journey_${Date.now()}`,
        driverId: user.id,
        vehicleId: parseInt(journeyForm.vehicleId) || 1,
        startLocation: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        destination: journeyForm.destination,
        status: 'active',
        startTime: new Date().toISOString(),
        distance: 0,
        expenses: [],
        locationUpdates: [location],
        createdAt: new Date().toISOString(),
        synced: false
      };

      // Save offline
      await offlineStorage.saveJourney(newJourney);
      
      // Queue for sync when online
      await offlineStorage.addOfflineAction({
        id: `action_${Date.now()}`,
        type: 'journey',
        action: 'create',
        data: newJourney,
        timestamp: new Date().toISOString(),
        synced: false
      });

      setCurrentJourney(newJourney);
      setJourneys(prev => [...prev, newJourney]);
      setIsTracking(true);
      startLocationTracking(newJourney.id);

      // Clear form
      setJourneyForm({ destination: '', vehicleId: '' });

      toast({
        title: "Journey Started",
        description: "Tracking your location and journey progress",
      });
    } catch (error) {
      console.error('Failed to start journey:', error);
      toast({
        title: "Error",
        description: "Failed to start journey. Try again.",
        variant: "destructive"
      });
    }
  };

  const completeJourney = async () => {
    if (!currentJourney) return;

    try {
      // Stop location tracking
      locationTracker.stopTracking();
      setIsTracking(false);

      // Update journey
      const completedJourney = {
        ...currentJourney,
        status: 'completed' as const,
        endTime: new Date().toISOString()
      };

      await offlineStorage.saveJourney(completedJourney);
      
      // Queue for sync
      await offlineStorage.addOfflineAction({
        id: `action_${Date.now()}`,
        type: 'journey',
        action: 'complete',
        data: completedJourney,
        timestamp: new Date().toISOString(),
        synced: false
      });

      setCurrentJourney(null);
      setJourneys(prev => prev.map(j => j.id === completedJourney.id ? completedJourney : j));

      toast({
        title: "Journey Completed",
        description: "Journey data saved and will sync when online",
      });
    } catch (error) {
      console.error('Failed to complete journey:', error);
      toast({
        title: "Error",
        description: "Failed to complete journey",
        variant: "destructive"
      });
    }
  };

  const startLocationTracking = (journeyId: string) => {
    locationTracker.startTracking(journeyId, (location) => {
      setCurrentLocation(location);
      
      // Update journey with new location
      if (currentJourney) {
        const updatedJourney = {
          ...currentJourney,
          locationUpdates: [...currentJourney.locationUpdates, location]
        };
        setCurrentJourney(updatedJourney);
        offlineStorage.saveJourney(updatedJourney);
      }
    });
  };

  const addExpense = async () => {
    if (!currentJourney || !expenseForm.type || !expenseForm.amount) return;

    try {
      const newExpense: OfflineExpense = {
        id: `expense_${Date.now()}`,
        journeyId: currentJourney.id,
        type: expenseForm.type,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        timestamp: new Date().toISOString(),
        synced: false
      };

      // Save offline
      await offlineStorage.saveExpense(newExpense);
      
      // Update current journey
      const updatedJourney = {
        ...currentJourney,
        expenses: [...currentJourney.expenses, newExpense]
      };
      
      await offlineStorage.saveJourney(updatedJourney);
      setCurrentJourney(updatedJourney);

      // Queue for sync
      await offlineStorage.addOfflineAction({
        id: `action_${Date.now()}`,
        type: 'expense',
        action: 'create',
        data: newExpense,
        timestamp: new Date().toISOString(),
        synced: false
      });

      // Clear form
      setExpenseForm({ type: '', amount: '', description: '' });
      setShowExpenseForm(false);

      toast({
        title: "Expense Added",
        description: "Expense saved and will sync when online",
      });
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">Please log in to access the mobile driver app</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Driver App</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Badge className="bg-green-100 text-green-800">
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Journey Status */}
        {currentJourney ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-blue-900">Active Journey</h2>
                <Badge className="bg-blue-100 text-blue-800">
                  <Navigation className="w-3 h-3 mr-1" />
                  {isTracking ? 'Tracking' : 'Paused'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-700">To: {currentJourney.destination}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-700">
                    Started: {new Date(currentJourney.startTime).toLocaleTimeString()}
                  </span>
                </div>

                {currentLocation && (
                  <div className="flex items-center text-sm">
                    <Navigation className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-gray-700">
                      Speed: {Math.round(currentLocation.speed * 3.6)} km/h
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">
                    Expenses: ₹{currentJourney.expenses.reduce((sum, e) => sum + e.amount, 0)}
                  </span>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowExpenseForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Expense
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={completeJourney}
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Start New Journey */
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Start New Journey</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="Enter destination"
                    value={journeyForm.destination}
                    onChange={(e) => setJourneyForm(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicle">Vehicle ID (Optional)</Label>
                  <Input
                    id="vehicle"
                    type="number"
                    placeholder="Vehicle ID"
                    value={journeyForm.vehicleId}
                    onChange={(e) => setJourneyForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={startJourney}
                  disabled={!journeyForm.destination}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Journey
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Expense Form */}
        {showExpenseForm && currentJourney && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-orange-900">Add Expense</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="expenseType">Type</Label>
                  <Input
                    id="expenseType"
                    placeholder="e.g., Fuel, Toll, Food"
                    value={expenseForm.type}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, type: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expenseAmount">Amount (₹)</Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expenseDescription">Description (Optional)</Label>
                  <Textarea
                    id="expenseDescription"
                    placeholder="Additional details"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    className="flex-1"
                    onClick={addExpense}
                    disabled={!expenseForm.type || !expenseForm.amount}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Add Expense
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExpenseForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Journeys */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Recent Journeys</h3>
            
            {journeys.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No journeys yet</p>
                <p className="text-sm">Start your first journey above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {journeys.slice(-5).reverse().map((journey) => (
                  <div key={journey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{journey.destination}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(journey.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={journey.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {journey.status}
                      </Badge>
                      {journey.expenses.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          ₹{journey.expenses.reduce((sum, e) => sum + e.amount, 0)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Notice */}
        {!isOnline && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <WifiOff className="w-5 h-5 mr-3 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Working Offline</p>
                  <p className="text-sm text-yellow-700">
                    All data is saved locally and will sync when you're back online
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}