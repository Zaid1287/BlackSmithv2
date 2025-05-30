import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign, Clock, CheckCircle, Plus, Trash2, Download, History, Users, Calculator, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AdvanceEntry {
  id: string;
  userId: number;
  amount: string;
  description: string;
  transactionType: 'advance' | 'debt';
}

export default function Salaries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for multiple advance entries
  const [advanceEntries, setAdvanceEntries] = useState<AdvanceEntry[]>([]);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Check if user is admin (allow access for testing)
  const isAdmin = true; // Temporarily allow all users access

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: salaryPayments = [] } = useQuery({
    queryKey: ["/api/salaries"],
    queryFn: async () => {
      const response = await fetch("/api/salaries", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch salary payments");
      return response.json();
    },
    staleTime: 15000, // Cache for 15 seconds to reduce API calls
  });

  // Mutation for processing multiple advances at once
  const processAdvancesMutation = useMutation({
    mutationFn: async (entries: AdvanceEntry[]) => {
      const responses = await Promise.all(
        entries.map(async (entry) => {
          const currentDate = new Date();
          const response = await apiRequest("POST", "/api/salaries/pay", {
            userId: entry.userId,
            amount: entry.amount,
            description: entry.description,
            transactionType: entry.transactionType,
            month: currentDate.toLocaleString('default', { month: 'long' }),
            year: currentDate.getFullYear(),
          });
          return response.json();
        })
      );
      return responses;
    },
    onSuccess: () => {
      toast({
        title: "Salary Advances Processed",
        description: `Successfully processed ${advanceEntries.length} transactions`,
      });
      setAdvanceEntries([]);
      setShowAdvanceDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process salary advances",
        variant: "destructive",
      });
    },
  });

  // Mutation for processing full salary payment
  const processFullSalaryMutation = useMutation({
    mutationFn: async (driver: any) => {
      const currentDate = new Date();
      
      const response = await apiRequest("POST", "/api/salaries/pay", {
        userId: driver.id,
        amount: driver.salary,
        description: `Full salary payment - ${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`,
        transactionType: 'advance',
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentDate.getFullYear(),
      });
      return response.json();
    },
    onSuccess: (_, driver) => {
      toast({
        title: "Salary Paid",
        description: `Full salary payment processed for ${driver.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process salary payment",
        variant: "destructive",
      });
    },
  });

  // Mutation for paying all drivers
  const payAllDriversMutation = useMutation({
    mutationFn: async () => {
      const currentDate = new Date();
      const responses = await Promise.all(
        drivers.map(async (driver: any) => {
          const response = await apiRequest("POST", "/api/salaries/pay", {
            userId: driver.id,
            amount: driver.salary,
            description: `Full salary payment - ${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`,
            transactionType: 'advance',
            month: currentDate.toLocaleString('default', { month: 'long' }),
            year: currentDate.getFullYear(),
          });
          return response.json();
        })
      );
      return responses;
    },
    onSuccess: () => {
      toast({
        title: "All Salaries Paid",
        description: `Successfully paid all ${drivers.length} drivers`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process salary payments",
        variant: "destructive",
      });
    },
  });

  // Mutation to reset all salary data
  const resetSalaryDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/salaries/reset");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Salary Data Reset",
        description: "All salary advance records have been cleared",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset salary data",
        variant: "destructive",
      });
    },
  });

  // Helper functions for advance management
  const addAdvanceEntry = () => {
    const newEntry: AdvanceEntry = {
      id: Date.now().toString(),
      userId: selectedEmployee?.id || 0,
      amount: '',
      description: '',
      transactionType: 'advance'
    };
    setAdvanceEntries([...advanceEntries, newEntry]);
  };

  const removeAdvanceEntry = (id: string) => {
    setAdvanceEntries(advanceEntries.filter(entry => entry.id !== id));
  };

  const updateAdvanceEntry = (id: string, field: keyof AdvanceEntry, value: string) => {
    setAdvanceEntries(advanceEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const calculateTotalAdvances = () => {
    return advanceEntries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return entry.transactionType === 'advance' ? sum + amount : sum - amount;
    }, 0);
  };

  const openAdvanceDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setAdvanceEntries([]);
    setShowAdvanceDialog(true);
  };

  const exportEmployeeReport = (employee: any) => {
    const employeePayments = salaryPayments.filter((payment: any) => payment.userId === employee.id);
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Employee Salary Report'],
      ['Name', employee.name],
      ['Username', employee.username],
      ['Base Salary', `₹${parseFloat(employee.salary || 0).toLocaleString()}`],
      [''],
      ['Advance History'],
      ['Date', 'Amount', 'Type', 'Description', 'Month', 'Year']
    ];

    employeePayments.forEach((payment: any) => {
      worksheetData.push([
        new Date(payment.createdAt).toLocaleDateString(),
        `₹${parseFloat(payment.amount).toLocaleString()}`,
        parseFloat(payment.amount) > 0 ? 'Salary Advance' : 'Debt',
        payment.description || '',
        payment.month,
        payment.year
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `${employee.name}_salary_report.xlsx`);
  };

  // Memoized calculations to prevent unnecessary re-renders
  const { drivers, totalSalaryAmount, totalPaymentsToDrivers, totalDebtsFromDrivers, remainingBalance } = useMemo(() => {
    const filteredDrivers = users.filter((user: any) => user.role === 'driver');
    
    const salaryTotal = filteredDrivers.reduce((sum: number, user: any) => sum + parseFloat(user.salary || 0), 0);
    const paymentsTotal = salaryPayments
      .filter((payment: any) => parseFloat(payment.amount) > 0)
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
    const debtsTotal = salaryPayments
      .filter((payment: any) => parseFloat(payment.amount) < 0)
      .reduce((sum: number, payment: any) => sum + Math.abs(parseFloat(payment.amount)), 0);
    const balance = salaryTotal - paymentsTotal + debtsTotal;
    
    return {
      drivers: filteredDrivers,
      totalSalaryAmount: salaryTotal,
      totalPaymentsToDrivers: paymentsTotal,
      totalDebtsFromDrivers: debtsTotal,
      remainingBalance: balance
    };
  }, [users, salaryPayments]);

  // Admin access control
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only administrators can access salary management.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => payAllDriversMutation.mutate()}
            disabled={payAllDriversMutation.isPending || drivers.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {payAllDriversMutation.isPending ? "Processing..." : "Pay All Drivers"}
          </Button>
          <Button
            onClick={() => resetSalaryDataMutation.mutate()}
            disabled={resetSalaryDataMutation.isPending}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {resetSalaryDataMutation.isPending ? "Resetting..." : "Reset Salary Data"}
          </Button>
          <Button
            onClick={() => setShowHistoryDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Advance History
          </Button>
        </div>
      </div>

      {/* Salary Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bs-gradient-blue text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <DollarSign className="mr-2" size={20} />
                  <h3 className="text-sm font-medium opacity-90">Total Salary Amount</h3>
                </div>
                <p className="text-3xl font-bold">₹{totalSalaryAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-green text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="mr-2" size={20} />
                  <h3 className="text-sm font-medium opacity-90">Total Advance Amount</h3>
                </div>
                <p className="text-3xl font-bold">₹{totalPaymentsToDrivers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`text-white ${remainingBalance > 0 ? 'bs-gradient-orange' : 'bs-gradient-green'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <Calculator className="mr-2" size={20} />
                  <h3 className="text-sm font-medium opacity-90">Total Remaining Balance</h3>
                </div>
                <p className="text-3xl font-bold">₹{remainingBalance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Section */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employees
            </h2>
          </div>
        </div>

        <CardContent className="p-6">
          {drivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No drivers found. Add drivers to manage their salaries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.map((driver: any) => {
                // Calculate driver data directly without useMemo to avoid hooks rule violations
                const driverPayments = salaryPayments.filter((payment: any) => payment.userId === driver.id);
                const totalPaid = driverPayments
                  .filter((payment: any) => parseFloat(payment.amount) > 0)
                  .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
                const totalDebts = driverPayments
                  .filter((payment: any) => parseFloat(payment.amount) < 0)
                  .reduce((sum: number, payment: any) => sum + Math.abs(parseFloat(payment.amount)), 0);
                const balance = parseFloat(driver.salary || 0) - totalPaid + totalDebts;
                
                // Status based on balance
                const status = balance <= 0 ? 'paid' : balance < parseFloat(driver.salary || 0) / 2 ? 'partial' : 'pending';
                const statusColor = status === 'paid' ? 'text-green-600' : status === 'partial' ? 'text-yellow-600' : 'text-red-600';
                const statusText = status === 'paid' ? 'Fully Paid' : status === 'partial' ? 'Partially Paid' : 'Pending';
                
                const driverData = { totalPaid, balance, status, statusColor, statusText };

                return (
                  <Card key={driver.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <p className="text-sm text-gray-500">{driver.username}</p>
                        </div>
                        {driverData.balance > 0 && (
                          <Button
                            onClick={() => processFullSalaryMutation.mutate(driver)}
                            disabled={processFullSalaryMutation.isPending}
                            className="bg-black hover:bg-gray-800 text-white px-4 py-1 text-sm"
                            size="sm"
                          >
                            {processFullSalaryMutation.isPending ? "Processing..." : "Pay"}
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Salary:</span>
                          <span className="text-sm font-medium">₹{parseFloat(driver.salary || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Balance Remaining:</span>
                          <span className={`text-sm font-medium ${driverData.statusColor}`}>
                            ₹{driverData.balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => openAdvanceDialog(driver)}
                          className="flex-1 bg-gray-900 hover:bg-gray-800"
                          size="sm"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                        <Button 
                          onClick={() => exportEmployeeReport(driver)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Advance Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Salary Advances - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Employee Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Employee Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Base Salary:</span>
                  <p className="font-medium">₹{parseFloat(selectedEmployee?.salary || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Current Balance:</span>
                  <p className="font-medium text-orange-600">
                    ₹{selectedEmployee ? (
                      parseFloat(selectedEmployee.salary || 0) - 
                      salaryPayments
                        .filter((p: any) => p.userId === selectedEmployee.id && parseFloat(p.amount) > 0)
                        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) +
                      salaryPayments
                        .filter((p: any) => p.userId === selectedEmployee.id && parseFloat(p.amount) < 0)
                        .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.amount)), 0)
                    ).toLocaleString() : '0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Advance Entries */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Advance Entries</h4>
                <Button onClick={addAdvanceEntry} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-3">
                {advanceEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <Select
                          value={entry.transactionType}
                          onValueChange={(value) => updateAdvanceEntry(entry.id, 'transactionType', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">Salary Advance</SelectItem>
                            <SelectItem value="debt">Debt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={entry.amount}
                          onChange={(e) => updateAdvanceEntry(entry.id, 'amount', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <Input
                          placeholder="Description"
                          value={entry.description}
                          onChange={(e) => updateAdvanceEntry(entry.id, 'description', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => removeAdvanceEntry(entry.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {advanceEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No advance entries added yet.</p>
                    <p className="text-sm">Click "Add Entry" to start.</p>
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              {advanceEntries.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Impact:</span>
                    <span className={`font-bold text-lg ${calculateTotalAdvances() >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculateTotalAdvances() >= 0 ? '-' : '+'}₹{Math.abs(calculateTotalAdvances()).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {calculateTotalAdvances() >= 0 
                      ? 'This amount will be deducted from net profit' 
                      : 'This amount will be added to net profit'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => setShowAdvanceDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => processAdvancesMutation.mutate(advanceEntries)}
                disabled={advanceEntries.length === 0 || processAdvancesMutation.isPending}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                {processAdvancesMutation.isPending ? "Processing..." : `Process ${advanceEntries.length} Entries`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advance History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance History</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {salaryPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No advance history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salaryPayments.map((payment: any) => {
                  const employee = users.find((u: any) => u.id === payment.userId);
                  const amount = parseFloat(payment.amount);
                  const isAdvance = amount > 0;
                  
                  return (
                    <div key={payment.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{employee?.name || 'Unknown Employee'}</h4>
                          <p className="text-sm text-gray-600">{payment.description || 'No description'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()} • {payment.month} {payment.year}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={isAdvance ? "destructive" : "default"}>
                            {isAdvance ? 'Salary Advance' : 'Debt'}
                          </Badge>
                          <p className={`font-bold text-lg mt-1 ${isAdvance ? 'text-red-600' : 'text-green-600'}`}>
                            {isAdvance ? '-' : '+'}₹{Math.abs(amount).toLocaleString()}
                          </p>
                        </div>
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