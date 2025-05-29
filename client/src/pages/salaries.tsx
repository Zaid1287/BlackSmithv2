import { useState } from "react";
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

interface PaymentEntry {
  id: string;
  userId: number;
  amount: string;
  description: string;
  transactionType: 'payment' | 'debt';
}

export default function Salaries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for multiple payment entries
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

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
  });

  // Mutation for processing multiple payments at once
  const processPaymentsMutation = useMutation({
    mutationFn: async (entries: PaymentEntry[]) => {
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
        title: "Payments Processed",
        description: `Successfully processed ${paymentEntries.length} transactions`,
      });
      setPaymentEntries([]);
      setShowPaymentDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process payments",
        variant: "destructive",
      });
    },
  });

  // Helper functions for payment management
  const addPaymentEntry = () => {
    const newEntry: PaymentEntry = {
      id: Date.now().toString(),
      userId: selectedEmployee?.id || 0,
      amount: '',
      description: '',
      transactionType: 'payment'
    };
    setPaymentEntries([...paymentEntries, newEntry]);
  };

  const removePaymentEntry = (id: string) => {
    setPaymentEntries(paymentEntries.filter(entry => entry.id !== id));
  };

  const updatePaymentEntry = (id: string, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(paymentEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const calculateTotalPayments = () => {
    return paymentEntries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return entry.transactionType === 'payment' ? sum + amount : sum - amount;
    }, 0);
  };

  const openPaymentDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setPaymentEntries([]);
    setShowPaymentDialog(true);
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
      ['Payment History'],
      ['Date', 'Amount', 'Type', 'Description', 'Month', 'Year']
    ];

    employeePayments.forEach((payment: any) => {
      worksheetData.push([
        new Date(payment.createdAt).toLocaleDateString(),
        `₹${parseFloat(payment.amount).toLocaleString()}`,
        parseFloat(payment.amount) > 0 ? 'Payment' : 'Debt',
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

  // Filter only drivers
  const drivers = users.filter((user: any) => user.role === 'driver');
  
  // Calculate totals with proper handling of positive and negative amounts
  const totalSalaryAmount = drivers.reduce((sum: number, user: any) => sum + parseFloat(user.salary || 0), 0);
  const totalPaymentsToDrivers = salaryPayments
    .filter((payment: any) => parseFloat(payment.amount) > 0)
    .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  const totalDebtsFromDrivers = salaryPayments
    .filter((payment: any) => parseFloat(payment.amount) < 0)
    .reduce((sum: number, payment: any) => sum + Math.abs(parseFloat(payment.amount)), 0);
  const remainingBalance = totalSalaryAmount - totalPaymentsToDrivers + totalDebtsFromDrivers;

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
        <Button
          onClick={() => setShowHistoryDialog(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          Payment History
        </Button>
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
                  <h3 className="text-sm font-medium opacity-90">Total Paid Amount</h3>
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
                // Calculate total payments and debts for this driver
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

                return (
                  <Card key={driver.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <p className="text-sm text-gray-500">{driver.username}</p>
                        </div>
                        <Badge variant={status === 'paid' ? "default" : status === 'partial' ? "secondary" : "destructive"}>
                          {statusText}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Base Salary:</span>
                          <span className="text-sm font-medium">₹{parseFloat(driver.salary || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Total Paid:</span>
                          <span className="text-sm font-medium text-green-600">₹{totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Balance:</span>
                          <span className={`text-sm font-medium ${statusColor}`}>
                            ₹{balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => openPaymentDialog(driver)}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payments - {selectedEmployee?.name}</DialogTitle>
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

            {/* Payment Entries */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Payment Entries</h4>
                <Button onClick={addPaymentEntry} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-3">
                {paymentEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <Select
                          value={entry.transactionType}
                          onValueChange={(value) => updatePaymentEntry(entry.id, 'transactionType', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="payment">Payment</SelectItem>
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
                          onChange={(e) => updatePaymentEntry(entry.id, 'amount', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <Input
                          placeholder="Description"
                          value={entry.description}
                          onChange={(e) => updatePaymentEntry(entry.id, 'description', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => removePaymentEntry(entry.id)}
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

                {paymentEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No payment entries added yet.</p>
                    <p className="text-sm">Click "Add Entry" to start.</p>
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              {paymentEntries.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Impact:</span>
                    <span className={`font-bold text-lg ${calculateTotalPayments() >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculateTotalPayments() >= 0 ? '-' : '+'}₹{Math.abs(calculateTotalPayments()).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {calculateTotalPayments() >= 0 
                      ? 'This amount will be deducted from net profit' 
                      : 'This amount will be added to net profit'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => setShowPaymentDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => processPaymentsMutation.mutate(paymentEntries)}
                disabled={paymentEntries.length === 0 || processPaymentsMutation.isPending}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                {processPaymentsMutation.isPending ? "Processing..." : `Process ${paymentEntries.length} Entries`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {salaryPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No payment history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salaryPayments.map((payment: any) => {
                  const employee = users.find((u: any) => u.id === payment.userId);
                  const amount = parseFloat(payment.amount);
                  const isPayment = amount > 0;
                  
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
                          <Badge variant={isPayment ? "destructive" : "default"}>
                            {isPayment ? 'Payment' : 'Debt'}
                          </Badge>
                          <p className={`font-bold text-lg mt-1 ${isPayment ? 'text-red-600' : 'text-green-600'}`}>
                            {isPayment ? '-' : '+'}₹{Math.abs(amount).toLocaleString()}
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