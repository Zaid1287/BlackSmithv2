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
  Clock, User, Wallet, TrendingUp, TrendingDown, DollarSign 
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
      .filter((p: any) => p.status === 'paid')
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
          <p className="text-gray-500">Manage monthly vehicle payment obligations</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
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
            {/* Monthly Payment Update */}
            <div className="p-4 border rounded-lg bg-gray-50">
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
                  />
                </div>
              </div>
            </div>

            {/* Add Payment Entries */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Payment Entries</h3>
                <Button onClick={addPaymentEntry} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Entry
                </Button>
              </div>

              {paymentEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No payment entries added yet.</p>
                  <p className="text-xs text-gray-400">Click "Add Entry" to schedule EMI payments</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {paymentEntries.map((entry, index) => (
                    <Card key={entry.id} className="p-4 bg-blue-50 border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-blue-900">Payment Entry #{index + 1}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 border-red-300"
                          onClick={() => removePaymentEntry(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-sm font-medium">Amount (₹)</Label>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            value={entry.amount}
                            onChange={(e) => updatePaymentEntry(entry.id, 'amount', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Due Date</Label>
                          <Input
                            type="date"
                            value={entry.dueDate}
                            onChange={(e) => updatePaymentEntry(entry.id, 'dueDate', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-sm font-medium">Month</Label>
                          <Select value={entry.month} onValueChange={(value) => updatePaymentEntry(entry.id, 'month', value)}>
                            <SelectTrigger className="mt-1">
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
                          <Label className="text-sm font-medium">Year</Label>
                          <Input
                            type="number"
                            placeholder="2025"
                            value={entry.year}
                            onChange={(e) => updatePaymentEntry(entry.id, 'year', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Description (Optional)</Label>
                        <Textarea
                          placeholder="Add payment notes or details..."
                          value={entry.description}
                          onChange={(e) => updatePaymentEntry(entry.id, 'description', e.target.value)}
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
                    entry.amount && parseFloat(entry.amount) > 0 && entry.dueDate && entry.month
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
                          <p className="text-sm text-gray-600">{payment.month} {payment.year}</p>
                          <p className="text-xs text-gray-500">
                            {payment.paidDate ? `Paid: ${new Date(payment.paidDate).toLocaleDateString()}` : 
                             `Due: ${new Date(payment.dueDate).toLocaleDateString()}`}
                          </p>
                          {payment.description && (
                            <p className="text-xs text-gray-600 mt-1">{payment.description}</p>
                          )}
                        </div>
                        <Badge className={
                          payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }>
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
    </div>
  );
}