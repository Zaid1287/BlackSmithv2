import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Route, ArrowUpRight, X, MapPin, Clock, User } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ExpenseQuickEntry from "@/components/expense-quick-entry";

export default function FinancialManagement() {
  const [location] = useLocation();
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  
  const { data: financialStats, isLoading } = useQuery({
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

  const { data: journeys } = useQuery({
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

  const { data: journeyExpenses } = useQuery({
    queryKey: [`/api/journeys/${selectedJourney?.id}/expenses`],
    queryFn: async () => {
      if (!selectedJourney?.id) return [];
      const response = await fetch(`/api/journeys/${selectedJourney.id}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: !!selectedJourney?.id,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeJourneys = journeys?.filter((journey: any) => journey.status === 'active') || [];
  const totalRevenue = parseFloat(financialStats?.revenue || "0");
  const totalExpenses = parseFloat(financialStats?.expenses || "0");
  const netProfit = totalRevenue - totalExpenses;

  // Calculate HYD Inward and Top-up amounts for selected journey
  const hydInwardAmount = journeyExpenses?.filter((expense: any) => expense.category === 'hyd_inward')
    .reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0) || 0;
  
  const topUpAmount = journeyExpenses?.filter((expense: any) => expense.category === 'top_up')
    .reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0) || 0;

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="flex space-x-6 mb-8 border-b border-gray-200">
        <Link href="/financial-management">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/financial-management' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Overview
          </button>
        </Link>
        <Link href="/manage-vehicles">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/manage-vehicles' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Fleet Management
          </button>
        </Link>
        <Link href="/salaries">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/salaries' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Finances
          </button>
        </Link>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Active Journeys Card */}
        <Card className="bg-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Route className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Active Journeys</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              {activeJourneys.length}
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="bg-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Total Revenue</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              ₹{totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className="bg-green-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Net Profit</h3>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              ₹{netProfit.toLocaleString()}
            </div>
            <div className="flex items-center text-sm opacity-90">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>12% from last month</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              Net Profit = (Revenue + Security Deposits - Expenses) - Salary Payments + Salary Refunds (₹15,200)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Journeys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Journeys</h2>
        
        {activeJourneys.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Journeys</h3>
              <p className="text-gray-500">All vehicles are currently available for new journeys.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJourneys.map((journey: any) => (
              <Card key={journey.id} className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedJourney(journey)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className={`${
                      journey.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      journey.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
                    </Badge>
                    <span className={`text-sm font-medium ${parseFloat(journey.balance || "0") >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{parseFloat(journey.balance || "0").toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Journey to {journey.destination}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Started: {new Date(journey.startTime).toLocaleDateString()}
                  </p>
                  <div className="text-sm">
                    <div>
                      <span className="text-gray-500">License Plate:</span>
                      <span className="font-medium ml-1">{journey.licensePlate}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    Click to view details →
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Journey Details Modal */}
      <Dialog open={!!selectedJourney} onOpenChange={() => setSelectedJourney(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedJourney && (
            <div className="p-6">
              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-8">
                {/* Left Column - Journey Information */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">Journey Information</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Driver</p>
                      <p className="text-lg font-semibold">Aleem</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Started At</p>
                      <p className="text-lg font-semibold">{new Date(selectedJourney.startTime).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Distance</p>
                      <p className="text-lg font-semibold">{selectedJourney.distanceCovered || "Unknown"}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">License Plate</p>
                      <p className="text-lg font-semibold">{selectedJourney.licensePlate}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ETA</p>
                      <p className="text-lg font-semibold">Unknown</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      <Badge className={`px-3 py-1 ${
                        selectedJourney.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        selectedJourney.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        ⚪ {selectedJourney.status.charAt(0).toUpperCase() + selectedJourney.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Right Column - Financial Information */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">Financial Information</h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Pouch Amount</p>
                        <p className="text-lg font-semibold">₹{parseFloat(selectedJourney.pouch || "0").toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Security Deposit</p>
                        <p className="text-lg font-semibold">₹{parseFloat(selectedJourney.security || "0").toLocaleString()}</p>
                        <p className="text-xs text-green-600 mt-1">Added back to balance<br/>(journey completed)</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">HYD Inward</p>
                        <p className="text-lg font-semibold">
                          {hydInwardAmount > 0 ? `₹${hydInwardAmount.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Current Expenses</p>
                        <p className="text-lg font-semibold">₹{parseFloat(selectedJourney.totalExpenses || "0").toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Top-ups</p>
                        <p className="text-lg font-semibold text-green-600">+₹{topUpAmount.toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Estimated Fuel Cost</p>
                        <p className="text-lg font-semibold">Unknown</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-2">Current Balance</p>
                      <p className={`text-2xl font-bold ${(parseFloat(selectedJourney.balance || "0") + topUpAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{(parseFloat(selectedJourney.balance || "0") + topUpAmount).toLocaleString()}
                      </p>
                      
                      <div className="mt-3 text-xs text-gray-500 space-y-1">
                        <p><strong>Working Balance:</strong> ₹{selectedJourney.pouch} (pouch) - ₹{selectedJourney.totalExpenses || 0} (expenses) {topUpAmount > 0 ? `+ ₹${topUpAmount} (top-ups)` : ''} = ₹{(parseFloat(selectedJourney.balance || "0") + topUpAmount).toFixed(2)}</p>
                        <p><strong>Security Deposit:</strong> ₹{selectedJourney.security} (separate from balance, added to profit when journey completes)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Management Section */}
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-semibold mb-6">Add Expenses</h2>
                <ExpenseQuickEntry journeyId={selectedJourney.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}