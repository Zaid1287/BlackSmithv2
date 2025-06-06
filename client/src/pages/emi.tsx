import { useState } from "react";
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
  Clock, User, Wallet, TrendingUp, TrendingDown, DollarSign, RotateCcw, Shield
} from "lucide-react";
import * as XLSX from 'xlsx';

interface PaymentEntry {
  id: string;
  amount: string;
  description: string;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  model: string;
  status: string;
  monthlyEmi?: string;
  lastUpdated?: string;
}

export default function EmiManagement() {
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [newMonthlyEmi, setNewMonthlyEmi] = useState("");
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>("all");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

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
    totalVehicles: vehicles.length,
    totalEmiAmount: vehicles.reduce((sum: number, vehicle: any) => sum + parseFloat(vehicle.monthlyEmi || 0), 0),
    totalPaidAmount: emiPayments
      .filter((p: any) => parseFloat(p.amount) > 0)
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    totalAdvances: emiPayments
      .filter((p: any) => parseFloat(p.amount) < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.amount)), 0),
  };

  const totalRemainingBalance = summaryStats.totalEmiAmount - summaryStats.totalPaidAmount + summaryStats.totalAdvances;

  // Calculate individual vehicle data
  const getVehicleData = (vehicle: any) => {
    const vehiclePayments = emiPayments.filter((p: any) => p.vehicleId === vehicle.id);
    const totalPaid = vehiclePayments
      .filter((p: any) => parseFloat(p.amount) > 0)
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const totalAdvances = vehiclePayments
      .filter((p: any) => parseFloat(p.amount) < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.amount)), 0);
    const balance = parseFloat(vehicle.monthlyEmi || 0) - totalPaid + totalAdvances;
    
    let status = 'pending';
    let statusColor = 'bg-amber-100 text-amber-800';
    if (balance <= 0) {
      status = balance < 0 ? 'overpaid' : 'paid';
      statusColor = balance < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    }

    return { totalPaid, totalAdvances, balance, status, statusColor };
  };

  // Open vehicle management dialog
  const openVehicleDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setNewMonthlyEmi(vehicle.monthlyEmi?.toString() || "0");
    setPaymentEntries([]);
    setShowVehicleDialog(true);
  };

  // Add payment entry
  const addPaymentEntry = () => {
    const newEntry: PaymentEntry = {
      id: Date.now().toString(),
      amount: '',
      description: '',
    };
    setPaymentEntries([...paymentEntries, newEntry]);
  };

  // Remove payment entry
  const removePaymentEntry = (id: string) => {
    setPaymentEntries(paymentEntries.filter(entry => entry.id !== id));
  };

  // Update payment entry
  const updatePaymentEntry = (id: string, field: keyof PaymentEntry, value: string | number) => {
    setPaymentEntries(paymentEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // Process EMI payment mutation (pay current balance)
  const processEmiPaymentMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const currentDate = new Date();
      const vehicleData = getVehicleData(vehicle);
      
      // Pay the remaining balance amount
      const paymentAmount = Math.max(0, vehicleData.balance);
      
      const response = await apiRequest("POST", "/api/emi", {
        vehicleId: vehicle.id,
        amount: paymentAmount.toFixed(2),
        description: `EMI payment - ${currentDate.toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Processed", description: "EMI payment completed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
    },
    onError: () => {
      toast({ title: "Payment Failed", description: "Failed to process EMI payment", variant: "destructive" });
    },
  });

  // Update vehicle EMI mutation
  const updateVehicleEmiMutation = useMutation({
    mutationFn: async (data: { vehicleId: number; newMonthlyEmi: string; payments: PaymentEntry[] }) => {
      // Update monthly EMI amount
      await apiRequest("PUT", `/api/vehicles/${data.vehicleId}`, {
        monthlyEmi: data.newMonthlyEmi
      });

      // Process payment entries
      const responses = await Promise.all(
        data.payments.map(async (payment) => {
          const response = await apiRequest("POST", "/api/emi", {
            vehicleId: data.vehicleId,
            amount: payment.amount,
            description: payment.description || `EMI payment - ${new Date().toLocaleDateString()}`,
          });
          return response.json();
        })
      );

      return responses;
    },
    onSuccess: () => {
      toast({ title: "Vehicle Updated", description: "EMI and payment information updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
      setShowVehicleDialog(false);
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update vehicle information", variant: "destructive" });
    },
  });

  // Pay all vehicles mutation
  const payAllVehiclesMutation = useMutation({
    mutationFn: async () => {
      const currentDate = new Date();
      const responses = await Promise.all(
        vehicles.map(async (vehicle: any) => {
          const vehicleData = getVehicleData(vehicle);
          const paymentAmount = Math.max(0, vehicleData.balance);
          
          const response = await apiRequest("POST", "/api/emi", {
            vehicleId: vehicle.id,
            amount: paymentAmount.toFixed(2),
            description: `EMI payment - ${currentDate.toLocaleDateString()}`,
          });
          return response.json();
        })
      );
      return responses;
    },
    onSuccess: () => {
      toast({ title: "All Payments Processed", description: "EMI payments for all vehicles completed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
    },
    onError: () => {
      toast({ title: "Payment Failed", description: "Failed to process payments for all vehicles", variant: "destructive" });
    },
  });

  // Reset EMI data mutation
  const resetEmiDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/reset-emi-data");
    },
    onSuccess: () => {
      toast({ title: "EMI Data Reset", description: "All EMI payment data has been cleared successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      setShowResetDialog(false);
      setConfirmationText("");
    },
    onError: () => {
      toast({ title: "Reset Failed", description: "Failed to reset EMI data", variant: "destructive" });
    },
  });

  const handleResetConfirm = () => {
    if (confirmationText === "RESET EMI DATA") {
      resetEmiDataMutation.mutate();
    }
  };

  // View vehicle EMI history
  const viewVehicleHistory = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHistoryDialog(true);
  };

  // Export data to Excel
  const exportToExcel = () => {
    const exportData = emiPayments.map((payment: any) => {
      const vehicle = vehicles.find((v: any) => v.id === payment.vehicleId);
      return {
        'Vehicle': vehicle?.licensePlate || 'Unknown',
        'Model': vehicle?.model || 'Unknown',
        'Amount': parseFloat(payment.amount),
        'Status': payment.status,
        'Paid Date': payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '',
        'Description': payment.description || '',
        'Created At': payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '',
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
          <p className="text-gray-500">Manage monthly vehicle payment obligations</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowResetDialog(true)}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset EMI Data
          </Button>
          <Button onClick={() => payAllVehiclesMutation.mutate()} disabled={payAllVehiclesMutation.isPending}>
            <CreditCard className="w-4 h-4 mr-2" />
            {payAllVehiclesMutation.isPending ? "Processing..." : "Pay All"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly EMI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.totalEmiAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.totalPaidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.totalAdvances.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle: any) => {
          const vehicleData = getVehicleData(vehicle);
          return (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vehicle.licensePlate}</CardTitle>
                      <p className="text-sm text-gray-500">{vehicle.model}</p>
                    </div>
                  </div>
                  <Badge className={vehicleData.statusColor}>
                    {vehicleData.status.charAt(0).toUpperCase() + vehicleData.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* EMI Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly EMI</span>
                    <span className="font-semibold text-lg">₹{parseFloat(vehicle.monthlyEmi || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Paid</span>
                    <span className="font-medium text-green-600">₹{vehicleData.totalPaid.toLocaleString()}</span>
                  </div>
                  
                  {vehicleData.totalAdvances > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Advances</span>
                      <span className="font-medium text-red-600">₹{vehicleData.totalAdvances.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Current Balance</span>
                    <span className={`font-bold text-lg ${
                      vehicleData.balance > 0 ? 'text-red-600' : 
                      vehicleData.balance < 0 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      ₹{Math.abs(vehicleData.balance).toLocaleString()}
                      {vehicleData.balance < 0 && ' (Overpaid)'}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewVehicleHistory(vehicle)}
                    className="flex-1"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openVehicleDialog(vehicle)}
                    className="flex-1"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                
                {vehicleData.balance > 0 && (
                  <Button
                    size="sm"
                    onClick={() => processEmiPaymentMutation.mutate(vehicle)}
                    disabled={processEmiPaymentMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <IndianRupee className="w-4 h-4 mr-2" />
                    {processEmiPaymentMutation.isPending ? "Processing..." : `Pay ₹${Math.abs(vehicleData.balance).toLocaleString()}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-500">
              {selectedVehicleFilter === "all" 
                ? "No vehicles available for EMI management"
                : `No vehicles with ${selectedVehicleFilter} status found`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Manage Vehicle Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Manage Vehicle - {selectedVehicle?.licensePlate}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Vehicle Monthly EMI */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Monthly Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Monthly Payment</Label>
                  <p className="text-sm text-gray-600">₹{parseFloat(String(selectedVehicle?.monthlyEmi || "0")).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Monthly Payment Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Enter monthly payment amount"
                    value={newMonthlyEmi}
                    onChange={(e) => setNewMonthlyEmi(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Payment Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Payments</h3>
                <Button onClick={addPaymentEntry} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
              </div>

              {paymentEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Payment Entry</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePaymentEntry(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Payment amount"
                      value={entry.amount}
                      onChange={(e) => updatePaymentEntry(entry.id, 'amount', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      placeholder="Add payment notes or details..."
                      value={entry.description}
                      onChange={(e) => updatePaymentEntry(entry.id, 'description', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowVehicleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateVehicleEmiMutation.mutate({
                  vehicleId: selectedVehicle!.id,
                  newMonthlyEmi,
                  payments: paymentEntries.filter(entry => 
                    entry.amount && parseFloat(entry.amount) > 0
                  )
                })}
                disabled={updateVehicleEmiMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateVehicleEmiMutation.isPending ? "Updating..." : "Update Vehicle"}
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
                  const amount = parseFloat(payment.amount);
                  const isAdvance = amount < 0;
                  
                  return (
                    <div key={payment.id} className={`p-4 border rounded-lg ${
                      isAdvance ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {isAdvance ? 'Advance: ' : 'Payment: '}
                            ₹{Math.abs(amount).toLocaleString()}
                          </h4>
                          <p className="text-sm text-gray-600">{payment.description}</p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Shield className="w-5 h-5" />
              <span>Reset EMI Data</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action will permanently delete all EMI payment records. 
                This cannot be undone.
              </p>
            </div>
            <div>
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type "RESET EMI DATA" to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="RESET EMI DATA"
                className="mt-2"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowResetDialog(false);
                  setConfirmationText("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetConfirm}
                disabled={confirmationText !== "RESET EMI DATA" || resetEmiDataMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {resetEmiDataMutation.isPending ? "Resetting..." : "Reset Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}