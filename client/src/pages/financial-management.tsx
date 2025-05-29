import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, DollarSign, Download, RotateCcw, BarChart3, PieChart, TrendingDown, Shield } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getAuthHeaders } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function FinancialManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  
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

  const { data: allExpenses } = useQuery({
    queryKey: ["/api/expenses/all"],
    queryFn: async () => {
      const response = await fetch("/api/expenses/all", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch all expenses");
      return response.json();
    },
  });

  const resetFinancialDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/reset-financial-data");
    },
    onSuccess: () => {
      toast({
        title: "Financial Data Reset",
        description: "All financial data has been successfully reset.",
      });
      setShowResetDialog(false);
      setConfirmationText("");
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset financial data",
        variant: "destructive",
      });
    },
  });

  const handleResetConfirm = () => {
    if (confirmationText === "RESET FINANCIAL DATA") {
      resetFinancialDataMutation.mutate();
    } else {
      toast({
        title: "Verification Failed",
        description: "Please type exactly: RESET FINANCIAL DATA",
        variant: "destructive",
      });
    }
  };

  const handleExportToExcel = async () => {
    try {
      toast({
        title: "Exporting Data",
        description: "Preparing Excel file with all financial data...",
      });

      // Fetch all necessary data for export
      const [journeysData, allExpenses] = await Promise.all([
        fetch("/api/journeys", {
          headers: getAuthHeaders(),
          credentials: "include",
        }).then(res => {
          if (!res.ok) throw new Error("Failed to fetch journeys");
          return res.json();
        }),
        
        fetch("/api/expenses/all", {
          headers: getAuthHeaders(),
          credentials: "include",
        }).then(res => {
          if (!res.ok) throw new Error("Failed to fetch expenses");
          return res.json();
        }).catch(() => [])
      ]);

      // Create workbook with enhanced formatting
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ["BlackSmith Traders - Financial Report"],
        ["Generated on:", new Date().toLocaleDateString()],
        [""],
        ["Financial Summary"],
        ["Total Revenue", `₹${totalRevenue.toLocaleString()}`],
        ["Total Expenses", `₹${totalExpenses.toLocaleString()}`],
        ["Net Profit", `₹${netProfit.toLocaleString()}`],
        ["Security Deposits", `₹${securityDeposits.toLocaleString()}`],
        ["Salary Payments", `₹${salaryPayments.toLocaleString()}`],
        ["HYD Inward", `₹${hydInwardRevenue.toLocaleString()}`],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Journeys Sheet
      const journeyHeaders = [
        "Journey ID", "License Plate", "Destination", "Driver", "Status", 
        "Start Date", "End Date", "Pouch Amount", "Security Deposit", 
        "Total Expenses", "Current Balance"
      ];
      
      const journeyData = journeysData.map((journey: any) => [
        journey.id,
        journey.licensePlate,
        journey.destination,
        journey.driverName || "N/A",
        journey.status,
        journey.startTime ? new Date(journey.startTime).toLocaleDateString() : "",
        journey.endTime ? new Date(journey.endTime).toLocaleDateString() : "",
        parseFloat(journey.pouch || 0),
        parseFloat(journey.security || 0),
        parseFloat(journey.totalExpenses || 0),
        parseFloat(journey.balance || 0)
      ]);

      const journeySheet = XLSX.utils.aoa_to_sheet([journeyHeaders, ...journeyData]);
      XLSX.utils.book_append_sheet(workbook, journeySheet, "Journeys");

      // Expenses Sheet (if data available)
      if (allExpenses.length > 0) {
        const expenseHeaders = [
          "Expense ID", "Journey ID", "Category", "Amount", "Description", "Date", "Driver"
        ];
        
        const expenseData = allExpenses.map((expense: any) => [
          expense.id,
          expense.journeyId,
          expense.category.replace('_', ' ').toUpperCase(),
          parseFloat(expense.amount),
          expense.description || "",
          new Date(expense.timestamp).toLocaleDateString(),
          expense.driverName || "N/A"
        ]);

        const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseData]);
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");
      }

      // Category-wise expense summary
      const categoryTotals: { [key: string]: number } = {};
      allExpenses.forEach((expense: any) => {
        const category = expense.category.replace('_', ' ').toUpperCase();
        categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.amount);
      });

      const categoryData = [
        ["Category", "Total Amount"],
        ...Object.entries(categoryTotals).map(([category, amount]) => [category, amount])
      ];
      
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, "Category Summary");

      // Generate and download file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `BlackSmith_Traders_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast({
        title: "Export Successful",
        description: "Financial report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel report. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const totalRevenue = parseFloat(financialStats?.revenue?.toString() || "0") || 0;
  const totalExpenses = parseFloat(financialStats?.expenses?.toString() || "0") || 0;
  const netProfit = parseFloat(financialStats?.netProfit?.toString() || "0") || 0;
  
  // Calculate breakdown from actual data with proper fallbacks
  const breakdown = financialStats?.breakdown || {};
  const journeyRevenue = parseFloat(breakdown.journeyRevenue?.toString() || "0") || 0;
  const securityDeposits = parseFloat(breakdown.securityDeposits?.toString() || "0") || 0;
  const hydInwardRevenue = parseFloat(breakdown.hydInwardRevenue?.toString() || "0") || 0;
  const topUpRevenue = parseFloat(breakdown.topUpRevenue?.toString() || "0") || 0;
  const journeyExpenses = parseFloat(breakdown.journeyExpenses?.toString() || "0") || 0;
  const salaryPayments = parseFloat(breakdown.salaryPayments?.toString() || "0") || 0;
  const salaryDebts = parseFloat(breakdown.salaryDebts?.toString() || "0") || 0;

  // Prepare chart data
  const revenueChartData = [
    { name: 'Journey Revenue', value: journeyRevenue, color: '#10b981' },
    { name: 'Security Deposits', value: securityDeposits, color: '#3b82f6' },
    { name: 'HYD Inward', value: hydInwardRevenue, color: '#8b5cf6' },
    { name: 'Top-ups', value: topUpRevenue, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  // Calculate individual expense type totals from all expenses
  const expenseTypeBreakdown = allExpenses?.reduce((acc: any, expense: any) => {
    const category = expense.category;
    const amount = parseFloat(expense.amount || 0);
    
    // Skip income items (they're not expenses)
    if (category === 'hyd_inward' || category === 'top_up') {
      return acc;
    }
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += amount;
    return acc;
  }, {}) || {};

  // Define colors for different expense types
  const expenseColors = {
    fuel: '#ef4444',
    toll: '#dc2626', 
    loading: '#f97316',
    unloading: '#ea580c',
    food: '#d97706',
    maintenance: '#ca8a04',
    mechanical: '#eab308',
    rto: '#84cc16',
    rope: '#65a30d',
    weighment: '#16a34a',
    body_works: '#059669',
    tires_air: '#0891b2',
    adblue: '#0284c7',
    electrical: '#2563eb',
    tire_change: '#4f46e5',
    tire_greasing: '#7c3aed',
    nzb_unloading: '#9333ea',
    miscellaneous: '#c2410c',
    other: '#991b1b'
  };

  // Convert to chart data format
  const expenseBreakdownData = Object.entries(expenseTypeBreakdown).map(([category, amount]: [string, any]) => ({
    name: category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    value: amount,
    color: expenseColors[category as keyof typeof expenseColors] || '#6b7280'
  })).filter(item => item.value > 0);

  // Add salary payments as a separate category
  const expenseChartData = [
    ...expenseBreakdownData,
    ...(salaryPayments > 0 ? [{ name: 'Salary Payments', value: salaryPayments, color: '#374151' }] : [])
  ];

  const recentExpenses = [
    { type: "Salary_refund", amount: 2940, notes: "Salary deduction for Aleem - Adding back to profit (+2940)", time: "10 days ago" },
    { type: "Salary", amount: 4221, notes: "Salary payment to Aleem (Paid: 4221)", time: "10 days ago" },
    { type: "Loading", amount: 623, notes: "-", time: "15 days ago" },
    { type: "Salary", amount: 1821, notes: "Salary payment to Aleem", time: "20 days ago" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleExportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Financial Data
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Shield className="w-5 h-5" />
              <span>Reset Financial Data</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ WARNING: This action cannot be undone!</p>
              <p className="text-sm text-red-700">
                This will permanently delete all financial data including:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                <li>All journey records</li>
                <li>All expense data</li>
                <li>All salary payments</li>
                <li>All revenue calculations</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Type "RESET FINANCIAL DATA" to confirm:
              </label>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="RESET FINANCIAL DATA"
                className="font-mono"
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
                disabled={confirmationText !== "RESET FINANCIAL DATA" || resetFinancialDataMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {resetFinancialDataMutation.isPending ? "Resetting..." : "Reset Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Revenue Card */}
        <Card className="bg-green-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-lg font-medium">Total Revenue</span>
                </div>
                <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                <div className="text-sm opacity-90 mt-2">
                  <div>Journey: ₹{journeyRevenue.toLocaleString()}</div>
                  <div>HYD Inward: ₹{hydInwardRevenue.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card className="bg-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-lg font-medium">Total Expenses</span>
                </div>
                <div className="text-3xl font-bold">₹{totalExpenses.toLocaleString()}</div>
                <div className="text-sm opacity-90 mt-2">
                  <div>Active: ₹{financialStats?.activeExpenses || "0"}</div>
                  <div>Completed: ₹{financialStats?.completedExpenses || totalExpenses}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg font-medium">Net Profit</span>
                </div>
                <div className="text-3xl font-bold">₹{netProfit.toLocaleString()}</div>
                <div className="text-sm opacity-90 mt-2">
                  <div>Security Deposits: ₹{securityDeposits.toLocaleString()}</div>
                  <div>Salary Payments: ₹{salaryPayments.toLocaleString()}</div>
                  <div>Salary Debts: +₹{salaryDebts.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Expense Breakdown</TabsTrigger>
          <TabsTrigger value="visualization">Expense Visualization</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Journey-wise Expense Breakdown */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Journey-wise Expenses</h3>
                <p className="text-sm text-gray-500 mb-6">Expenses organized by journey</p>
                
                <div className="h-96 overflow-y-auto space-y-4 pr-2">
                  {journeys?.filter((journey: any) => journey.totalExpenses > 0).map((journey: any) => {
                    // Get expenses for this journey from allExpenses
                    const journeyExpenses = allExpenses?.filter((expense: any) => expense.journeyId === journey.id) || [];
                    const totalJourneyExpenses = journeyExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
                    
                    return (
                      <div key={journey.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-base">{journey.startLocation} → {journey.destination}</h4>
                            <p className="text-sm text-gray-600">{journey.licensePlate} • {new Date(journey.startTime).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-red-600">₹{totalJourneyExpenses.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{journeyExpenses.length} expenses</p>
                          </div>
                        </div>
                        
                        {journeyExpenses.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {journeyExpenses.map((expense: any) => (
                              <div key={expense.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                <div>
                                  <span className="font-medium capitalize">
                                    {expense.category.split('_').join(' ')}
                                  </span>
                                  {expense.description && (
                                    <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold">₹{parseFloat(expense.amount).toLocaleString()}</span>
                                  <p className="text-xs text-gray-500">{new Date(expense.timestamp).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {(!journeys || journeys.filter((journey: any) => journey.totalExpenses > 0).length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No journeys with expenses found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


          </div>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expense Bar Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Expense Analysis</h3>
                <p className="text-sm text-gray-500 mb-6">Bar chart showing expenses by category</p>
                
                {expenseBreakdownData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {expenseBreakdownData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No expense data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Expense Breakdown</h3>
                <p className="text-sm text-gray-500 mb-6">Visual breakdown of all expense categories</p>
                
                {expenseChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No expense data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}