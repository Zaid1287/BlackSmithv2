import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CreditCard, Download, History, IndianRupee, Users, Trash2, Plus, 
  Clock, User, Wallet, TrendingUp, TrendingDown, DollarSign 
} from "lucide-react";
import * as XLSX from 'xlsx';

interface PaymentEntry {
  id: string;
  amount: string;
  description: string;
  type: 'payment' | 'deduction';
}

interface Employee {
  id: number;
  username: string;
  name: string;
  salary: string;
  lastUpdated?: string;
}

export default function Salaries() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [newSalaryAmount, setNewSalaryAmount] = useState("");

  // Fetch employees (drivers)
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (users: any[]) => users.filter(user => user.role === 'driver'),
  });

  // Fetch salary payments
  const { data: salaryPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/salaries"],
  }) as { data: any[], isLoading: boolean };

  // Calculate summary statistics
  const summaryStats = {
    totalSalaryAmount: employees.reduce((sum: number, emp: any) => sum + parseFloat(emp.salary || 0), 0),
    totalPaidAmount: salaryPayments
      .filter((p: any) => parseFloat(p.amount) > 0)
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    totalDeductions: salaryPayments
      .filter((p: any) => parseFloat(p.amount) < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.amount)), 0),
  };

  const totalRemainingBalance = summaryStats.totalSalaryAmount - summaryStats.totalPaidAmount + summaryStats.totalDeductions;

  // Calculate individual employee data
  const getEmployeeData = (employee: any) => {
    const employeePayments = salaryPayments.filter((p: any) => p.userId === employee.id);
    const totalPaid = employeePayments
      .filter((p: any) => parseFloat(p.amount) > 0)
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const totalDeductions = employeePayments
      .filter((p: any) => parseFloat(p.amount) < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(parseFloat(p.amount)), 0);
    const balance = parseFloat(employee.salary || 0) - totalPaid + totalDeductions;
    
    let status = 'pending';
    let statusColor = 'bg-amber-100 text-amber-800';
    if (balance <= 0) {
      status = balance < 0 ? 'overpaid' : 'paid';
      statusColor = balance < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    }

    return { totalPaid, totalDeductions, balance, status, statusColor };
  };

  // Open employee management dialog
  const openEmployeeDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewSalaryAmount(employee.salary);
    setPaymentEntries([]);
    setShowEmployeeDialog(true);
  };

  // Add payment entry
  const addPaymentEntry = () => {
    const newEntry: PaymentEntry = {
      id: Date.now().toString(),
      amount: '',
      description: '',
      type: 'payment'
    };
    setPaymentEntries([...paymentEntries, newEntry]);
  };

  // Remove payment entry
  const removePaymentEntry = (id: string) => {
    setPaymentEntries(paymentEntries.filter(entry => entry.id !== id));
  };

  // Update payment entry
  const updatePaymentEntry = (id: string, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(paymentEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // Process salary payment mutation
  const processSalaryPaymentMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const response = await apiRequest("POST", "/api/salaries/pay", {
        userId: employee.id,
        amount: parseFloat(String(employee.salary || "0")).toFixed(2),
        description: `Full salary payment - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        transactionType: 'payment',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Processed", description: "Salary payment completed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: () => {
      toast({ title: "Payment Failed", description: "Failed to process salary payment", variant: "destructive" });
    },
  });

  // Update employee salary mutation
  const updateEmployeeSalaryMutation = useMutation({
    mutationFn: async (data: { employeeId: number; newSalary: string; payments: PaymentEntry[] }) => {
      // Update salary amount
      await apiRequest("PUT", `/api/users/${data.employeeId}`, {
        salary: data.newSalary
      });

      // Process payment entries
      const responses = await Promise.all(
        data.payments.map(async (payment) => {
          const amount = payment.type === 'deduction' ? `-${payment.amount}` : payment.amount;
          const response = await apiRequest("POST", "/api/salaries/pay", {
            userId: data.employeeId,
            amount: amount.toString(),
            description: payment.description || `${payment.type === 'deduction' ? 'Deduction' : 'Payment'} - ${new Date().toLocaleDateString()}`,
            transactionType: 'advance',
            month: new Date().toLocaleString('default', { month: 'long' }),
            year: new Date().getFullYear(),
          });
          return response.json();
        })
      );

      return responses;
    },
    onSuccess: () => {
      toast({ title: "Employee Updated", description: "Salary and payment information updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      setShowEmployeeDialog(false);
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update employee information", variant: "destructive" });
    },
  });

  // Pay all employees mutation
  const payAllEmployeesMutation = useMutation({
    mutationFn: async () => {
      const responses = await Promise.all(
        employees.map(async (employee: any) => {
          const response = await apiRequest("POST", "/api/salaries/pay", {
            userId: employee.id,
            amount: parseFloat(String(employee.salary || "0")).toFixed(2),
            description: `Full salary payment - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
            transactionType: 'payment',
          });
          return response.json();
        })
      );
      return responses;
    },
    onSuccess: () => {
      toast({ title: "All Payments Processed", description: `Successfully paid ${employees.length} employees` });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: () => {
      toast({ title: "Payment Failed", description: "Failed to process bulk salary payments", variant: "destructive" });
    },
  });

  // Reset salary data mutation
  const resetSalaryDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/salaries/reset");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Data Reset", description: "All salary records have been cleared" });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: () => {
      toast({ title: "Reset Failed", description: "Failed to reset salary data", variant: "destructive" });
    },
  });

  // Export data to Excel
  const exportToExcel = () => {
    const exportData = employees.map((employee: any) => {
      const employeeData = getEmployeeData(employee);
      return {
        'Employee Name': employee.name,
        'Username': employee.username,
        'Base Salary': parseFloat(employee.salary || 0),
        'Total Paid': employeeData.totalPaid,
        'Total Deductions': employeeData.totalDeductions,
        'Balance Remaining': employeeData.balance,
        'Status': employeeData.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
    XLSX.writeFile(workbook, `salary-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle salary update form submission
  const handleSalaryUpdate = () => {
    if (!selectedEmployee) return;

    const validPayments = paymentEntries.filter(entry => 
      entry.amount && parseFloat(entry.amount) > 0
    );

    updateEmployeeSalaryMutation.mutate({
      employeeId: selectedEmployee.id,
      newSalary: newSalaryAmount,
      payments: validPayments
    });
  };

  if (employeesLoading || paymentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Salary Management</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => payAllEmployeesMutation.mutate()}
            disabled={payAllEmployeesMutation.isPending || employees.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {payAllEmployeesMutation.isPending ? "Processing..." : "Pay All Employees"}
          </Button>
          <Button
            onClick={() => resetSalaryDataMutation.mutate()}
            disabled={resetSalaryDataMutation.isPending}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {resetSalaryDataMutation.isPending ? "Resetting..." : "Reset Data"}
          </Button>
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setShowHistoryDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Salary Amount</p>
                <p className="text-2xl font-bold">₹{summaryStats.totalSalaryAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Net Payments</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg text-green-200">+₹{summaryStats.totalPaidAmount.toLocaleString()}</p>
                    <p className="text-lg text-red-200">-₹{summaryStats.totalDeductions.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-purple-300 pl-4">
                    <p className="text-2xl font-bold">₹{(summaryStats.totalPaidAmount - summaryStats.totalDeductions).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Remaining Balance</p>
                <p className="text-2xl font-bold">₹{totalRemainingBalance.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employee Salary Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No employees found. Add employees to manage their salaries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map((employee: any) => {
                const employeeData = getEmployeeData(employee);
                
                return (
                  <Card key={employee.id} className="border border-gray-200 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-500">{employee.username}</p>
                        </div>
                        <Badge className={employeeData.statusColor}>
                          {employeeData.status.charAt(0).toUpperCase() + employeeData.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Base Salary:</span>
                          <span className="font-semibold">₹{parseFloat(employee.salary || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Paid:</span>
                          <span className="font-semibold text-green-600">₹{employeeData.totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Deductions:</span>
                          <span className="font-semibold text-red-600">₹{employeeData.totalDeductions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm font-medium text-gray-700">Balance:</span>
                          <span className={`font-bold ${employeeData.balance > 0 ? 'text-amber-600' : employeeData.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{employeeData.balance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => processSalaryPaymentMutation.mutate(employee)}
                          disabled={processSalaryPaymentMutation.isPending}
                          className="flex-1 bg-black hover:bg-gray-800 text-white"
                          size="sm"
                        >
                          {processSalaryPaymentMutation.isPending ? "Processing..." : "Pay"}
                        </Button>
                        <Button
                          onClick={() => openEmployeeDialog(employee)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <CreditCard className="w-4 h-4" />
                          Manage
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

      {/* Employee Management Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Manage Employee - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Information */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Employee Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{selectedEmployee.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Username:</span>
                      <p className="font-medium">{selectedEmployee.username}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Salary:</span>
                      <p className="font-medium">₹{parseFloat(selectedEmployee.salary || '0').toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Updated:</span>
                      <p className="font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Salary Update */}
              <div className="space-y-4">
                <Label htmlFor="newSalary" className="text-base font-medium">Update Salary Amount</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="newSalary"
                    type="number"
                    value={newSalaryAmount}
                    onChange={(e) => setNewSalaryAmount(e.target.value)}
                    placeholder="Enter new salary amount"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Payment Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Payment Entries</Label>
                  <Button
                    onClick={addPaymentEntry}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </Button>
                </div>

                {paymentEntries.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                    <p>No payment entries added yet.</p>
                    <p className="text-sm">Click "Add Entry" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentEntries.map((entry) => (
                      <Card key={entry.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <select
                                    value={entry.type}
                                    onChange={(e) => updatePaymentEntry(entry.id, 'type', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="payment">Payment</option>
                                    <option value="deduction">Deduction</option>
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Amount</Label>
                                  <Input
                                    type="number"
                                    value={entry.amount}
                                    onChange={(e) => updatePaymentEntry(entry.id, 'amount', e.target.value)}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Description</Label>
                                  <Input
                                    value={entry.description}
                                    onChange={(e) => updatePaymentEntry(entry.id, 'description', e.target.value)}
                                    placeholder="Description"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={addPaymentEntry}
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Add another entry"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => removePaymentEntry(entry.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remove this entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSalaryUpdate}
                  disabled={updateEmployeeSalaryMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {updateEmployeeSalaryMutation.isPending ? "Updating..." : "Update Employee"}
                </Button>
                <Button
                  onClick={() => setShowEmployeeDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment History
            </DialogTitle>
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
                  const employee = employees.find((emp: any) => emp.id === payment.userId);
                  const isDeduction = parseFloat(payment.amount) < 0;
                  
                  return (
                    <Card key={payment.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isDeduction ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <div>
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <p className="text-sm text-gray-500">{payment.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                              {isDeduction ? '-' : '+'}₹{Math.abs(parseFloat(payment.amount)).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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