import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Plus, Settings, Camera } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import AddExpenseModal from "@/components/add-expense-modal";
import JourneyExpenseBreakdown from "@/components/journey-expense-breakdown";
import AdminEditModal from "@/components/admin-edit-modal";

export default function JourneyHistory() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [selectedJourneyForEdit, setSelectedJourneyForEdit] = useState<any>(null);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedJourneyPhotos, setSelectedJourneyPhotos] = useState<any>(null);

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

  // Fetch expenses for the selected journey (for admin edit modal)
  const { data: journeyExpenses = [] } = useQuery({
    queryKey: [`/api/journeys/${selectedJourneyForEdit?.id}/expenses`],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${selectedJourneyForEdit.id}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch journey expenses");
      return response.json();
    },
    enabled: !!selectedJourneyForEdit && user?.role === 'admin',
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
                        {user?.role === 'admin' && (
                          <>
                            {journey.photos && Array.isArray(journey.photos) && journey.photos.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedJourneyPhotos(journey);
                                  setShowPhotosModal(true);
                                }}
                                className="text-xs"
                                title="View Journey Photos"
                              >
                                <Camera className="w-3 h-3 mr-1" />
                                Photos ({journey.photos.length})
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedJourneyForEdit(journey);
                                setShowAdminEditModal(true);
                              }}
                              className="text-xs"
                              title="Edit Journey Financials & Expenses"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </>
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

      {/* Admin Edit Modal */}
      {selectedJourneyForEdit && (
        <AdminEditModal
          open={showAdminEditModal}
          onOpenChange={setShowAdminEditModal}
          journeyData={selectedJourneyForEdit}
          expenses={journeyExpenses}
        />
      )}

      {/* Photos Modal */}
      {selectedJourneyPhotos && (
        <Dialog open={showPhotosModal} onOpenChange={setShowPhotosModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Journey Photos - {selectedJourneyPhotos.destination}</DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <div className="mb-4 text-sm text-gray-600">
                <p><strong>Driver:</strong> {selectedJourneyPhotos.driverName}</p>
                <p><strong>Vehicle:</strong> {selectedJourneyPhotos.licensePlate}</p>
                <p><strong>Date:</strong> {new Date(selectedJourneyPhotos.startTime).toLocaleDateString()}</p>
              </div>
              
              {selectedJourneyPhotos.photos && Array.isArray(selectedJourneyPhotos.photos) && selectedJourneyPhotos.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedJourneyPhotos.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                      <img 
                        src={photo} 
                        alt={`Journey document ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => window.open(photo, '_blank')}
                      />
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        {index + 1} / {selectedJourneyPhotos.photos.length}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No photos available for this journey</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
