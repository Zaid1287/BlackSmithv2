import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CreditCard, Download, History, IndianRupee, Truck, Trash2, Plus, 
  Clock, Calendar, CheckCircle, AlertTriangle, DollarSign 
} from "lucide-react";
import * as XLSX from 'xlsx';

interface EmiEntry {
  id: string;
  amount: string;
  description: string;
  dueDate: string;
  month: string;
  year: number;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  model: string;
  status: string;
}

export default function EmiManagement() {
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [emiEntries, setEmiEntries] = useState<EmiEntry[]>([]);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>("all");

  // Fetch vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
  }) as { data: any[], isLoading: boolean };

  // Fetch EMI payments
  const { data: emiPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/emi"],
  }) as { data: any[], isLoading: boolean };

  // Calculate summary statistics
  const summaryStats = {
    totalVehicles: (vehicles as any[]).length,
    totalScheduledAmount: emiPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    totalPaidAmount: emiPayments
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    totalPendingAmount: emiPayments
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    overdueCount: emiPayments.filter((p: any) => {
      if (p.status !== 'pending') return false;
      return new Date(p.dueDate) < new Date();
    }).length,
  };

  const totalRemainingBalance = summaryStats.totalScheduledAmount - summaryStats.totalPaidAmount;

  // Calculate individual vehicle data
  const getVehicleData = (vehicle: any) => {
    const vehiclePayments = emiPayments.filter((p: any) => p.vehicleId === vehicle.id);
    const totalScheduled = vehiclePayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const totalPaid = vehiclePayments
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const totalPending = vehiclePayments
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const balance = totalScheduled - totalPaid;
    const overdueCount = vehiclePayments.filter((p: any) => {
      if (p.status !== 'pending') return false;
      return new Date(p.dueDate) < new Date();
    }).length;
    
    let status = 'current';
    let statusColor = 'bg-green-100 text-green-800';
    if (overdueCount > 0) {
      status = 'overdue';
      statusColor = 'bg-red-100 text-red-800';
    } else if (balance <= 0) {
      status = balance < 0 ? 'overpaid' : 'paid';
      statusColor = balance < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    } else if (totalPending > 0) {
      status = 'pending';
      statusColor = 'bg-amber-100 text-amber-800';
    }

    return { totalScheduled, totalPaid, totalPending, balance, overdueCount, status, statusColor };
  };

  // Open vehicle management dialog
  const openVehicleDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEmiEntries([]);
    setShowVehicleDialog(true);
  };

  // Add EMI entry
  const addEmiEntry = () => {
    const newEntry: EmiEntry = {
      id: Date.now().toString(),
      amount: "",
      description: "",
      dueDate: "",
      month: "",
      year: new Date().getFullYear(),
    };
    setEmiEntries([...emiEntries, newEntry]);
  };

  // Update EMI entry
  const updateEmiEntry = (id: string, field: keyof EmiEntry, value: string | number) => {
    setEmiEntries(emiEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // Remove EMI entry
  const removeEmiEntry = (id: string) => {
    setEmiEntries(emiEntries.filter(entry => entry.id !== id));
  };

  // Process EMI payments mutation
  const processEmiMutation = useMutation({
    mutationFn: async () => {
      const validEntries = emiEntries.filter(entry => 
        entry.amount && parseFloat(entry.amount) > 0 && entry.dueDate && entry.month
      );

      if (validEntries.length === 0) {
        throw new Error("Please add at least one valid EMI entry");
      }

      const promises = validEntries.map(entry =>
        apiRequest("POST", "/api/emi", {
          vehicleId: selectedVehicle!.id,
          amount: entry.amount,
          description: entry.description,
          dueDate: new Date(entry.dueDate).toISOString(),
          month: entry.month,
          year: entry.year,
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "EMI Payments Added",
        description: "EMI payments have been scheduled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
      setShowVehicleDialog(false);
      setEmiEntries([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process EMI payments",
        variant: "destructive",
      });
    },
  });

  // Mark payment as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await apiRequest("PATCH", `/api/emi/${id}/status`, { status: "paid" });
    },
    onSuccess: () => {
      toast({
        title: "Payment Updated",
        description: "EMI payment marked as paid!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
    },
  });

  // View vehicle EMI history
  const viewVehicleHistory = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHistoryDialog(true);
  };

  // Export data to Excel
  const exportToExcel = () => {
    const exportData = emiPayments.map((payment: any) => {
      const vehicle = (vehicles as any[]).find((v: any) => v.id === payment.vehicleId);
      return {
        'Vehicle': vehicle?.licensePlate || 'Unknown',
        'Model': vehicle?.model || 'Unknown',
        'Amount': parseFloat(payment.amount),
        'Month': payment.month,
        'Year': payment.year,
        'Due Date': new Date(payment.dueDate).toLocaleDateString(),
        'Status': payment.status,
        'Paid Date': payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '',
        'Description': payment.description || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EMI Payments");
    XLSX.writeFile(workbook, `emi_payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: "EMI payments data has been exported to Excel!",
    });
  };

  // Filter vehicles based on selected filter
  const filteredVehicles = selectedVehicleFilter === "all" 
    ? vehicles 
    : vehicles.filter((vehicle: any) => {
        const vehicleData = getVehicleData(vehicle);
        return vehicleData.status === selectedVehicleFilter;
      });

  // Get filtered EMI payments for history dialog
  const filteredEmiPayments = selectedVehicle 
    ? emiPayments.filter((p: any) => p.vehicleId === selectedVehicle.id)
    : [];

  if (vehiclesLoading || paymentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EMI Management</h1>
          <p className="text-gray-500">Track monthly vehicle payment obligations</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalVehicles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.totalScheduledAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.totalPaidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalRemainingBalance < 0 ? 'text-red-600' : 
              totalRemainingBalance === 0 ? 'text-green-600' : 'text-amber-600'
            }`}>
              ₹{totalRemainingBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Label htmlFor="vehicle-filter">Filter by Status:</Label>
            <Select value={selectedVehicleFilter} onValueChange={setSelectedVehicleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Vehicle EMI Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredVehicles.map((vehicle: any) => {
              const vehicleData = getVehicleData(vehicle);
              return (
                <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{vehicle.licensePlate}</h3>
                      <p className="text-sm text-gray-500">{vehicle.model}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Scheduled: ₹{vehicleData.totalScheduled.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Paid: ₹{vehicleData.totalPaid.toLocaleString()}</p>
                      <p className={`text-sm font-medium ${
                        vehicleData.balance < 0 ? 'text-red-600' : 
                        vehicleData.balance === 0 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        Balance: ₹{vehicleData.balance.toLocaleString()}
                      </p>
                    </div>
                    <Badge className={vehicleData.statusColor}>
                      {vehicleData.status}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => openVehicleDialog(vehicle)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add EMI
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewVehicleHistory(vehicle)}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add EMI Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add EMI Payments - {selectedVehicle?.licensePlate}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">EMI Entries</h3>
              <Button onClick={addEmiEntry} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>

            {emiEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No EMI entries yet. Click "Add Entry" to start.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {emiEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={entry.amount}
                          onChange={(e) => updateEmiEntry(entry.id, 'amount', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={entry.dueDate}
                          onChange={(e) => updateEmiEntry(entry.id, 'dueDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Month</Label>
                        <Select value={entry.month} onValueChange={(value) => updateEmiEntry(entry.id, 'month', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "January", "February", "March", "April", "May", "June",
                              "July", "August", "September", "October", "November", "December"
                            ].map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Year</Label>
                        <Input
                          type="number"
                          placeholder="2024"
                          value={entry.year}
                          onChange={(e) => updateEmiEntry(entry.id, 'year', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                          placeholder="Additional notes..."
                          value={entry.description}
                          onChange={(e) => updateEmiEntry(entry.id, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-red-600 hover:text-red-700"
                      onClick={() => removeEmiEntry(entry.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowVehicleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => processEmiMutation.mutate()}
                disabled={processEmiMutation.isPending || emiEntries.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processEmiMutation.isPending ? "Processing..." : "Add EMI Payments"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              EMI History - {selectedVehicle?.licensePlate}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {filteredEmiPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No EMI history found for this vehicle.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredEmiPayments.map((payment: any) => {
                  const dueDate = new Date(payment.dueDate);
                  const isOverdue = dueDate < new Date() && payment.status === 'pending';
                  
                  return (
                    <div key={payment.id} className={`p-4 border rounded-lg ${
                      payment.status === 'paid' ? 'bg-green-50 border-green-200' : 
                      isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">₹{parseFloat(payment.amount).toLocaleString()}</h4>
                          <p className="text-sm text-gray-600">{payment.month} {payment.year}</p>
                          <p className="text-xs text-gray-500">Due: {dueDate.toLocaleDateString()}</p>
                          {payment.description && (
                            <p className="text-xs text-gray-600 mt-1">{payment.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                            isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }>
                            {payment.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => markPaidMutation.mutate({ id: payment.id })}
                              disabled={markPaidMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                      {payment.paidDate && (
                        <p className="text-xs text-green-600 mt-2">
                          Paid on: {new Date(payment.paidDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}