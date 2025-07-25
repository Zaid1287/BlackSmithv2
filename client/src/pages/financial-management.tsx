import { useState, useEffect } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import JourneyExpenseBreakdown from "@/components/journey-expense-breakdown";

// Component to handle individual journey expense items with async data fetching
const JourneyExpenseItem = ({ journey, userRole }: { journey: any, userRole?: string }) => {
  const [totalExpenses, setTotalExpenses] = useState<number>(0);

  const { data: journeyExpenses, isLoading: isJourneyExpensesLoading } = useQuery({
    queryKey: ["/api/journeys", journey.id, "expenses"],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${journey.id}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to fetch expenses for journey ${journey.id}: ${await response.text()}`);
      }
    },
    enabled: !!journey.id,
  });

  useEffect(() => {
    if (journeyExpenses) {
      // Filter out revenue items (hyd_inward and top_up) for the total
      // This matches the logic in the JourneyExpenseBreakdown component
      const total = journeyExpenses
        .filter((exp: any) => 
          exp.category !== 'hyd_inward' && 
          exp.category !== 'top_up' &&
          (userRole === 'admin' || exp.category !== 'toll')
        )
        .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);
      
      setTotalExpenses(total);
    }
  }, [journeyExpenses, userRole]);

  if (isJourneyExpensesLoading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 animate-pulse">
        <div className="h-20"></div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-base">{journey.startLocation} → {journey.destination}</h4>
          <p className="text-sm text-gray-600">{journey.licensePlate} • {new Date(journey.startTime).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500 mt-1">Status: {journey.status}</p>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <span className="ml-1 font-semibold text-red-700">₹{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <JourneyExpenseBreakdown 
              journeyId={journey.id} 
              journeyData={journey} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FinancialManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [selectedLicensePlateFilter, setSelectedLicensePlateFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(() => {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  });

  // Function to get translated expense category name
  const getTranslatedCategory = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'fuel': t('fuel'),
      'food': t('food'),
      'maintenance': t('maintenance'),
      'loading': t('loading'),
      'rope': t('rope'),
      'rto': t('rto'),
      'hyd_unloading': t('hydUnloading'),
      'nzb_unloading': t('nzbUnloading'),
      'miscellaneous': t('miscellaneous'),
      'mechanical': t('mechanical'),
      'electrical': t('electrical'),
      'body_works': t('bodyWorks'),
      'tires_air': t('tiresAir'),
      'weighment': t('weighment'),
      'adblue': t('adblue'),
      'fines': t('fines'),
      'driver_fees': t('driverFees'),
      'tire_grease': t('tireGrease'),
      'toll': t('toll'),
      'top_up': t('topUp'),
      'hyd_inward': 'HYD Inward'
    };
    
    return categoryMap[category] || category.split('_').join(' ');
  };
  
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

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["/api/expenses/all"],
    queryFn: async () => {
      const response = await fetch("/api/expenses/all", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch all expenses");
      return response.json();
    },
    enabled: user?.role === 'admin', // Only fetch for admin users
  });

  // For non-admin users, get expenses from individual journeys
  const { data: userRoleExpenses = [] } = useQuery({
    queryKey: ["/api/journeys/expenses/all"],
    queryFn: async () => {
      if (user?.role === 'admin') return [];
      
      // Get all journeys first
      const journeysResponse = await fetch("/api/journeys", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!journeysResponse.ok) throw new Error("Failed to fetch journeys");
      const journeys = await journeysResponse.json();

      // Get expenses for each journey with user role filtering
      const allJourneyExpenses = [];
      for (const journey of journeys) {
        const expensesResponse = await fetch(`/api/journeys/${journey.id}/expenses`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (expensesResponse.ok) {
          const expenses = await expensesResponse.json();
          allJourneyExpenses.push(...expenses);
        }
      }
      return allJourneyExpenses;
    },
    enabled: user?.role !== 'admin',
  });

  const { data: emiPayments = [] } = useQuery({
    queryKey: ["/api/emi"],
    queryFn: async () => {
      const response = await fetch("/api/emi", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch EMI payments");
      return response.json();
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      return response.json();
    },
  });

  const { data: salaryData = [] } = useQuery({
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

  // Combine all expense sources based on user role
  const combinedExpenses = user?.role === 'admin' ? allExpenses : userRoleExpenses;

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



  const comprehensiveRecalculateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/recalculate-all-financials");
    },
    onSuccess: (data: any) => {
      const totalExpenses = data.totalExpenses || 0;
      const affectedJourneys = data.affectedJourneys || 0;
      toast({
        title: "Financial Recalculation Complete",
        description: data.message || `Total expenses recalculated: ₹${totalExpenses.toLocaleString()} across ${affectedJourneys} journeys`,
      });
      // Invalidate all financial queries to refresh all calculations
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/expenses/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Financial Recalculation Failed",
        description: error.message || "Failed to recalculate all financials",
        variant: "destructive",
      });
    },
  });





  const handleComprehensiveRecalculation = () => {
    comprehensiveRecalculateMutation.mutate();
  };

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

  const handleExportToExcel = async (startDate?: string, endDate?: string) => {
    try {
      let dateRange = "";
      if (startDate && endDate) {
        dateRange = ` (${startDate} to ${endDate})`;
      } else if (selectedMonthFilter !== "all") {
        dateRange = ` (${selectedMonthFilter})`;
      }
      
      toast({
        title: "Exporting Data",
        description: `Preparing Excel report with current filters${dateRange}...`,
      });

      // Use the same filtering logic as the displayed data
      let filteredJourneys = journeys || [];

      // Apply license plate filter
      if (selectedLicensePlateFilter !== "all") {
        filteredJourneys = filteredJourneys.filter((journey: any) => 
          journey.licensePlate === selectedLicensePlateFilter
        );
      }

      // Apply month filter (same as displayed data)
      if (selectedMonthFilter !== "all") {
        filteredJourneys = filteredJourneys.filter((journey: any) => {
          const journeyDate = new Date(journey.startTime);
          const journeyMonth = journeyDate.toISOString().slice(0, 7); // YYYY-MM format
          return journeyMonth === selectedMonthFilter;
        });
      }

      // Apply custom date range filter if provided (overrides month filter)
      let finalJourneys = filteredJourneys;
      
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        finalJourneys = filteredJourneys.filter((journey: any) => {
          const journeyDate = new Date(journey.startTime);
          return journeyDate >= start && journeyDate <= end;
        });
      }

      // Fetch comprehensive expense data for all filtered journeys
      toast({
        title: "Loading Journey Details",
        description: "Fetching detailed expense breakdowns for all journeys...",
      });

      const allJourneyExpenses = [];
      for (const journey of finalJourneys) {
        try {
          const response = await fetch(`/api/journeys/${journey.id}/expenses`, {
            headers: getAuthHeaders(),
            credentials: "include",
          });
          if (response.ok) {
            const expenses = await response.json();
            allJourneyExpenses.push(...expenses);
          } else {
            console.warn(`Failed to fetch expenses for journey ${journey.id}`);
          }
        } catch (error) {
          console.warn(`Error fetching expenses for journey ${journey.id}:`, error);
        }
      }

      // Now we have all expenses for the filtered journeys
      let finalExpenses = allJourneyExpenses;
      
      // Filter toll expenses for non-admin users
      if (user?.role !== 'admin') {
        finalExpenses = finalExpenses.filter((expense: any) => expense.category !== 'toll');
      }

      // Apply date range filter to expenses if specified
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        finalExpenses = finalExpenses.filter((expense: any) => {
          const expenseDate = new Date(expense.timestamp);
          return expenseDate >= start && expenseDate <= end;
        });
      }

      // Create workbook with single comprehensive sheet
      const workbook = XLSX.utils.book_new();

      // Build single sheet data with proper spacing
      const sheetData = [
        // Header Section
        ["BlackSmith Traders - Financial Report"],
        ["Generated on:", new Date().toLocaleDateString()],
        ["Date Range:", dateRange || "All Data"],
        [""],
        [""],
        
        // Financial Summary Section
        ["FINANCIAL SUMMARY"],
        [""],
        ["Metric", "Amount"],
        ["Total Revenue", totalRevenue],
        ["Total Expenses", totalExpenses],
        ["Net Profit", netProfit],
        ["Security Deposits", securityDeposits],
        ["Salary Payments", salaryPaymentsFromBreakdown],
        ["EMI Payments", emiPaymentTotal],
        ["HYD Inward Revenue", hydInwardRevenue],
        ["Top-up Revenue", topUpRevenue],
        [""],
        [""],
        
        // Journey Summary Section
        ["JOURNEY SUMMARY"],
        [""],
        ["Journey ID", "License Plate", "Destination", "Driver", "Status", "Start Date", "End Date", "Pouch Amount", "Security Deposit", "Total Expenses", "Current Balance"]
      ];

      // Add journey data
      finalJourneys.forEach((journey: any) => {
        sheetData.push([
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
      });

      // Add spacing and journey-wise expense breakdowns section
      sheetData.push([""], [""], ["JOURNEY-WISE EXPENSE BREAKDOWNS"], [""]);
      
      // Group expenses by journey ID for better organization
      const expensesByJourney = finalExpenses.reduce((acc: any, expense: any) => {
        if (!acc[expense.journeyId]) {
          acc[expense.journeyId] = [];
        }
        acc[expense.journeyId].push(expense);
        return acc;
      }, {});

      // Add each journey's breakdown
      finalJourneys.forEach((journey: any) => {
        const journeyExpenses = expensesByJourney[journey.id] || [];
        const validExpenses = journeyExpenses.filter((expense: any) => {
          // Skip revenue categories (same as View Breakdown modals)
          if (expense.category === 'hyd_inward' || expense.category === 'top_up') {
            return false;
          }
          // Skip toll for non-admin users (same as View Breakdown logic)
          if (user?.role !== 'admin' && expense.category === 'toll') {
            return false;
          }
          return true;
        });

        // Journey header
        sheetData.push([
          `Journey ${journey.id} - ${journey.licensePlate}`,
          `Destination: ${journey.destination}`,
          `Driver: ${journey.driverName || "N/A"}`,
          `Date: ${journey.startTime ? new Date(journey.startTime).toLocaleDateString() : "N/A"}`,
          `Total Expenses: ₹${parseFloat(journey.totalExpenses || 0).toLocaleString()}`
        ]);
        
        // Expense header for this journey
        sheetData.push(["Category", "Amount", "Description", "Date", "Driver"]);
        
        if (validExpenses.length > 0) {
          validExpenses.forEach((expense: any) => {
            sheetData.push([
              expense.category.replace('_', ' ').toUpperCase(),
              parseFloat(expense.amount),
              expense.description || "",
              new Date(expense.timestamp).toLocaleDateString(),
              expense.driverName || "N/A"
            ]);
          });
        } else {
          sheetData.push(["No expenses recorded", "", "", "", ""]);
        }
        
        // Add spacing between journeys
        sheetData.push([""]);
      });

      // Add overall detailed expenses section
      sheetData.push([""], ["DETAILED EXPENSES SUMMARY"], [""]);
      sheetData.push(["Journey ID", "License Plate", "Category", "Amount", "Description", "Date", "Driver"]);

      // Add expense data - filter to match View Breakdown logic
      finalExpenses.forEach((expense: any) => {
        // Skip revenue categories (same as View Breakdown modals)
        if (expense.category === 'hyd_inward' || expense.category === 'top_up') {
          return;
        }
        // Skip toll for non-admin users (same as View Breakdown logic)
        if (user?.role !== 'admin' && expense.category === 'toll') {
          return;
        }
        
        const journey = finalJourneys.find((j: any) => j.id === expense.journeyId);
        sheetData.push([
          expense.journeyId,
          journey?.licensePlate || "N/A",
          expense.category.replace('_', ' ').toUpperCase(),
          parseFloat(expense.amount),
          expense.description || "",
          new Date(expense.timestamp).toLocaleDateString(),
          expense.driverName || "N/A"
        ]);
      });

      console.log(`Export Summary: ${finalJourneys.length} journeys, ${finalExpenses.length} total expenses exported`);

      // Add category-wise summary at the end - filter to match View Breakdown logic
      const categoryTotals: { [key: string]: number } = {};
      finalExpenses.forEach((expense: any) => {
        // Skip revenue categories (same as View Breakdown modals)
        if (expense.category === 'hyd_inward' || expense.category === 'top_up') {
          return;
        }
        // Skip toll for non-admin users (same as View Breakdown logic)
        if (user?.role !== 'admin' && expense.category === 'toll') {
          return;
        }
        
        const category = expense.category.replace('_', ' ').toUpperCase();
        categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.amount);
      });

      // Add spacing and category summary section
      sheetData.push([""], [""], ["EXPENSE CATEGORIES SUMMARY"], [""]);
      sheetData.push(["Category", "Total Amount"]);
      
      Object.entries(categoryTotals).forEach(([category, amount]) => {
        sheetData.push([category, amount]);
      });

      // Create main financial summary worksheet
      const summaryWS = XLSX.utils.aoa_to_sheet(sheetData);
      summaryWS['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      // Create journey-wise breakdown sheet
      const journeyBreakdownData = [
        ["BLACKSMITH TRADERS - JOURNEY EXPENSE BREAKDOWN"],
        [`Report Generated: ${new Date().toLocaleDateString()}`],
        [""],
        ["Journey ID", "License Plate", "Driver", "Route", "Start Date", "End Date", "Status", 
         "Fuel Expenses", "Food Expenses", "Loading Expenses", "Maintenance Expenses", "Other Expenses", "Total Expenses"]
      ];

      finalJourneys.forEach((journey: any) => {
        const journeyExpenses = finalExpenses.filter((exp: any) => exp.journeyId === journey.id);
        // Filter expenses to match View Breakdown logic
        const filteredJourneyExpenses = journeyExpenses.filter((exp: any) => {
          // Skip revenue categories (same as View Breakdown modals)
          if (exp.category === 'hyd_inward' || exp.category === 'top_up') {
            return false;
          }
          // Skip toll for non-admin users (same as View Breakdown logic)
          if (user?.role !== 'admin' && exp.category === 'toll') {
            return false;
          }
          return true;
        });
        
        const expensesByCategory = filteredJourneyExpenses.reduce((acc: any, exp: any) => {
          acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
          return acc;
        }, {});

        const totalJourneyExpenses = Object.values(expensesByCategory).reduce((sum: any, amount: any) => sum + amount, 0);

        journeyBreakdownData.push([
          journey.id,
          journey.licensePlate,
          journey.driverName || "N/A",
          `${journey.startLocation || ''} → ${journey.destination || ''}`,
          journey.startTime ? new Date(journey.startTime).toLocaleDateString() : "",
          journey.endTime ? new Date(journey.endTime).toLocaleDateString() : "Ongoing",
          journey.status,
          expensesByCategory.fuel || 0,
          expensesByCategory.food || 0,
          expensesByCategory.loading || 0,
          expensesByCategory.maintenance || 0,
          (expensesByCategory.tire_grease || 0) + (expensesByCategory.miscellaneous || 0) + (expensesByCategory.other || 0),
          totalJourneyExpenses
        ]);
      });

      const journeyBreakdownWS = XLSX.utils.aoa_to_sheet(journeyBreakdownData);
      journeyBreakdownWS['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
      ];

      // Create detailed expense records sheet
      const expenseRecordsData = [
        ["BLACKSMITH TRADERS - DETAILED EXPENSE RECORDS"],
        [`Report Generated: ${new Date().toLocaleDateString()}`],
        [""],
        ["Date", "Journey ID", "License Plate", "Driver", "Category", "Amount (₹)", "Description", "Added By"]
      ];

      finalExpenses.forEach((expense: any) => {
        const journey = finalJourneys.find((j: any) => j.id === expense.journeyId);
        expenseRecordsData.push([
          new Date(expense.timestamp).toLocaleDateString(),
          expense.journeyId,
          journey?.licensePlate || "N/A",
          journey?.driverName || "N/A",
          expense.category.replace('_', ' ').toUpperCase(),
          parseFloat(expense.amount),
          expense.description || "-",
          expense.addedBy || "System"
        ]);
      });

      const expenseRecordsWS = XLSX.utils.aoa_to_sheet(expenseRecordsData);
      expenseRecordsWS['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 15 }
      ];

      // Create category analysis sheet
      const categoryAnalysisData = [
        ["BLACKSMITH TRADERS - EXPENSE CATEGORY ANALYSIS"],
        [`Report Generated: ${new Date().toLocaleDateString()}`],
        [""],
        ["Category", "Total Amount (₹)", "Number of Transactions", "Average per Transaction", "% of Total Expenses"]
      ];

      const totalExpenseAmount = finalExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      
      Object.entries(categoryTotals).forEach(([category, amount]) => {
        const categoryExpenses = finalExpenses.filter((exp: any) => 
          exp.category.replace('_', ' ').toUpperCase() === category
        );
        const avgAmount = categoryExpenses.length > 0 ? amount / categoryExpenses.length : 0;
        const percentage = totalExpenseAmount > 0 ? ((amount / totalExpenseAmount) * 100).toFixed(1) : 0;

        categoryAnalysisData.push([
          category,
          amount,
          categoryExpenses.length,
          avgAmount.toFixed(2),
          `${percentage}%`
        ]);
      });

      const categoryAnalysisWS = XLSX.utils.aoa_to_sheet(categoryAnalysisData);
      categoryAnalysisWS['!cols'] = [
        { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 18 }
      ];

      // Group journeys by vehicle for separate tabs
      const vehicleGroups = finalJourneys.reduce((groups: any, journey: any) => {
        const licensePlate = journey.licensePlate || 'Unknown';
        if (!groups[licensePlate]) {
          groups[licensePlate] = [];
        }
        groups[licensePlate].push(journey);
        return groups;
      }, {});

      // Create single Excel file with multiple tabs for vehicles
      const mainWorkbook = XLSX.utils.book_new();
      const reportDate = new Date().toISOString().split('T')[0];

      // Add a summary tab first
      const overallSummaryData = [
        [`BlackSmith Traders - Overall Financial Report`],
        [`Report Generated: ${reportDate}`],
        [`Date Range: ${dateRange || "All Data"}`],
        [""],
        ["OVERALL FINANCIAL SUMMARY"],
        [""],
        ["Metric", "Amount (₹)"],
        ["Total Revenue", totalRevenue],
        ["Total Expenses", totalExpenses],
        ["Net Profit", netProfit],
        ["Security Deposits", securityDeposits],
        ["Salary Payments", salaryPaymentsFromBreakdown],
        ["EMI Payments", emiPaymentTotal],
        [""],
        [""],
        ["VEHICLE BREAKDOWN"],
        [""],
        ["Vehicle", "Total Journeys", "Total Expenses", "Vehicle Revenue", "EMI Payments", "Vehicle Profit"]
      ];

      // Add vehicle summary to overall tab
      Object.entries(vehicleGroups).forEach(([licensePlate, vehicleJourneys]: [string, any]) => {
        const vehicleExpenses = finalExpenses.filter((expense: any) => 
          vehicleJourneys.some((journey: any) => journey.id === expense.journeyId)
        );
        
        // Calculate accurate revenue including pouch, security, and revenue expenses
        const revenueFromExpenses = vehicleExpenses.filter((exp: any) => ['hyd_inward', 'top_up'].includes(exp.category))
          .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
        const pouchRevenue = vehicleJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.pouch || 0), 0);
        const securityRevenue = vehicleJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.security || 0), 0);
        const totalVehicleRevenue = pouchRevenue + securityRevenue + revenueFromExpenses;
        
        // Calculate actual expenses (excluding revenue categories)
        const totalVehicleExpenses = vehicleExpenses.filter((exp: any) => !['hyd_inward', 'top_up'].includes(exp.category))
          .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
        
        // Calculate vehicle-specific EMI payments
        const vehicle = vehicles.find((v: any) => v.licensePlate === licensePlate);
        const vehicleEmiPayments = vehicle ? emiPayments
          .filter((payment: any) => payment.vehicleId === vehicle.id)
          .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0) : 0;
        
        const vehicleProfit = totalVehicleRevenue - totalVehicleExpenses - vehicleEmiPayments;

        overallSummaryData.push([
          licensePlate,
          vehicleJourneys.length,
          totalVehicleExpenses,
          totalVehicleRevenue,
          vehicleEmiPayments,
          vehicleProfit
        ]);
      });

      const overallSummaryWS = XLSX.utils.aoa_to_sheet(overallSummaryData);
      overallSummaryWS['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(mainWorkbook, overallSummaryWS, "Overall Summary");

      // Create individual tabs for each vehicle
      Object.entries(vehicleGroups).forEach(([licensePlate, vehicleJourneys]: [string, any]) => {
        createVehicleTab(mainWorkbook, licensePlate, vehicleJourneys, finalExpenses, reportDate, dateRange);
      });

      // Generate and download the single file
      const excelBuffer = XLSX.write(mainWorkbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `BlackSmith_Traders_Complete_Report_${reportDate}.xlsx`;
      saveAs(data, fileName);

      toast({
        title: "Export Successful",
        description: `Generated complete report with ${finalJourneys.length} journeys and ${finalExpenses.length} expense entries across ${Object.keys(vehicleGroups).length} vehicle tabs. All journey expense breakdowns included.`,
      });
    } catch (error: any) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: `Failed to generate Excel reports: ${error?.message || 'Please try again.'}`,
        variant: "destructive",
      });
    }
  };

  const createVehicleTab = (mainWorkbook: any, licensePlate: string, vehicleJourneys: any[], allExpenses: any[], reportDate: string, dateRange: string) => {
    // Filter expenses for this vehicle's journeys
    const vehicleExpenses = allExpenses.filter((expense: any) => 
      vehicleJourneys.some((journey: any) => journey.id === expense.journeyId)
    );

    // Calculate vehicle totals
    const totalVehicleExpenses = vehicleExpenses.filter((exp: any) => !['hyd_inward', 'top_up'].includes(exp.category))
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
    const revenueFromExpenses = vehicleExpenses.filter((exp: any) => ['hyd_inward', 'top_up'].includes(exp.category))
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
    const pouchRevenue = vehicleJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.pouch || 0), 0);
    const securityRevenue = vehicleJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.security || 0), 0);
    const totalVehicleRevenue = pouchRevenue + securityRevenue + revenueFromExpenses;

    // Vehicle Summary Data
    const vehicleData = [
      [`${licensePlate} - Vehicle Report`],
      [`Report Generated: ${reportDate}`],
      [`Date Range: ${dateRange || "All Data"}`],
      [""],
      ["VEHICLE FINANCIAL SUMMARY"],
      [""],
      ["Metric", "Amount (₹)"],
      ["Total Revenue", totalVehicleRevenue],
      ["Total Expenses", totalVehicleExpenses],
      ["Net Profit", totalVehicleRevenue - totalVehicleExpenses],
      ["Total Journeys", vehicleJourneys.length],
      [""],
      [""],
      ["JOURNEY DETAILS"],
      [""]
    ];

    // Define all expense categories with role-based filtering
    const allExpenseCategories = [
      'fuel', 'food', 'maintenance', 'loading', 'rope', 'rto', 'hyd_unloading', 'nzb_unloading', 
      'miscellaneous', 'mechanical', 'electrical', 'body_works', 'tires_air', 'weighment', 
      'adblue', 'fines', 'driver_fees', 'tire_grease', 'tire_change', 'tire_greasing',
      'toll', 'hyd_inward', 'top_up'
    ];

    // Admin-only categories that should be filtered out for drivers
    const adminOnlyCategories = ['toll', 'rto', 'hyd_inward'];
    
    // Filter categories based on user role
    const expenseCategories = user?.role === 'admin' 
      ? allExpenseCategories 
      : allExpenseCategories.filter(cat => !adminOnlyCategories.includes(cat));
    
    // Create header for journey details with expense categories
    const journeyHeader = [
      "Journey ID", "Driver Name", "Destination", "Start Date", "End Date", "Status", "Pouch (₹)", "Security (₹)"
    ];
    
    // Add expense category headers with proper formatting
    expenseCategories.forEach(category => {
      const formattedName = category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      journeyHeader.push(formattedName + " (₹)");
    });
    
    journeyHeader.push("Total Expenses (₹)", "Total Revenue (₹)", "Net Profit (₹)");
    vehicleData.push(journeyHeader);

    // Add journey details with expenses in single row
    vehicleJourneys.forEach((journey: any) => {
      const journeyRelatedExpenses = vehicleExpenses.filter((exp: any) => exp.journeyId === journey.id);
      
      // Group expenses by category
      const expensesByCategory: { [key: string]: number } = {};
      journeyRelatedExpenses.forEach((exp: any) => {
        expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + parseFloat(exp.amount);
      });
      
      const revenueFromExpenseCategories = (expensesByCategory['hyd_inward'] || 0) + (expensesByCategory['top_up'] || 0);
      const journeyPouchRevenue = parseFloat(journey.pouch || 0);
      const journeySecurityRevenue = parseFloat(journey.security || 0);
      const journeyRevenue = journeyPouchRevenue + journeySecurityRevenue + revenueFromExpenseCategories;
      const journeyExpenseTotal = Object.entries(expensesByCategory)
        .filter(([category]) => !['hyd_inward', 'top_up'].includes(category))
        .reduce((sum, [, amount]) => sum + amount, 0);
      const netProfit = journeyRevenue - journeyExpenseTotal;

      const journeyRow = [
        journey.id,
        journey.driverName || "Unknown Driver",
        journey.destination || "",
        journey.startTime ? new Date(journey.startTime).toLocaleDateString() : "",
        journey.endTime ? new Date(journey.endTime).toLocaleDateString() : "Ongoing",
        journey.status,
        journeyPouchRevenue,
        journeySecurityRevenue
      ];
      
      // Add expense amounts for each category
      expenseCategories.forEach(category => {
        journeyRow.push(expensesByCategory[category] || 0);
      });
      
      journeyRow.push(journeyExpenseTotal, journeyRevenue, netProfit);
      vehicleData.push(journeyRow);
    });

    // Create worksheet for this vehicle
    const vehicleWS = XLSX.utils.aoa_to_sheet(vehicleData);
    
    // Set column widths for all expense categories plus summary columns
    const columnWidths = [
      { wch: 12 }, // Journey ID
      { wch: 18 }, // Driver Name
      { wch: 15 }, // Destination
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 12 }, // Status
      { wch: 10 }, // Pouch
      { wch: 10 }, // Security
    ];
    
    // Add widths for each expense category
    expenseCategories.forEach(() => {
      columnWidths.push({ wch: 10 });
    });
    
    // Add widths for summary columns
    columnWidths.push({ wch: 12 }); // Total Expenses
    columnWidths.push({ wch: 12 }); // Total Revenue
    columnWidths.push({ wch: 12 }); // Net Profit
    
    vehicleWS['!cols'] = columnWidths;

    // Add as a new tab - sanitize license plate for sheet name
    const sanitizedName = licensePlate.replace(/[^a-zA-Z0-9]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(mainWorkbook, vehicleWS, sanitizedName || 'Vehicle');
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

  // Calculate filtering based on selected license plate
  const filteredJourneys = journeys?.filter((journey: any) => {
    // License plate filter
    if (selectedLicensePlateFilter !== "all" && journey.licensePlate !== selectedLicensePlateFilter) {
      return false;
    }
    
    // Month filter
    if (selectedMonthFilter !== "all") {
      const journeyDate = new Date(journey.startTime);
      const journeyMonth = `${journeyDate.getFullYear()}-${String(journeyDate.getMonth() + 1).padStart(2, '0')}`;
      if (journeyMonth !== selectedMonthFilter) {
        return false;
      }
    }
    
    return true;
  }) || [];

  // First, get all journey IDs that match our current filters
  const filteredJourneyIds = new Set(filteredJourneys.map((j: any) => j.id));
  
  // Filter expenses to only include those from the filtered journeys
  const filteredExpenses = combinedExpenses?.filter((expense: any) => {
    // Check if expense belongs to one of our filtered journeys
    if (!filteredJourneyIds.has(expense.journeyId)) {
      return false;
    }
    
    // Don't double-filter by month here - the journey filter already handles the month filtering
    // The expense belongs to a journey that matches the month filter, so it should be included
    return true;
  }) || [];
  
  console.log('Filtered journeys count:', filteredJourneys.length);
  console.log('Filtered expenses count:', filteredExpenses.length);
  console.log('Selected month filter:', selectedMonthFilter);
  
  // Log some debug info for the current month filter
  if (selectedMonthFilter !== "all") {
    const monthExpenses = filteredExpenses.filter((exp: any) => {
      const expenseDate = new Date(exp.timestamp);
      const expenseMonth = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      return expenseMonth === selectedMonthFilter;
    });
    console.log(`Expenses for ${selectedMonthFilter}:`, monthExpenses);
  }

  // Calculate filtered financial stats
  
  // Calculate revenue from journeys (pouch + security) and from revenue expenses (hyd_inward, top_up)
  const filteredRevenue = filteredJourneys.reduce((sum: number, journey: any) => {
    return sum + parseFloat(journey.pouch || 0) + parseFloat(journey.security || 0);
  }, 0) + 
  filteredExpenses
    .filter((exp: any) => 
      (exp.category === 'hyd_inward' || exp.category === 'top_up') &&
      filteredJourneyIds.has(exp.journeyId)
    )
    .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
    
  // Calculate total expenses, excluding revenue categories and filtering by journey ID
  const filteredExpensesTotal = filteredExpenses
    .filter((exp: any) => 
      exp.category !== 'hyd_inward' && 
      exp.category !== 'top_up' &&
      filteredJourneyIds.has(exp.journeyId)
    )
    .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);

  const filteredTotalExpenses = filteredExpensesTotal;

  // Calculate filtered EMI payments for the selected vehicle
  const filteredEmiPayments = selectedLicensePlateFilter === "all" ? 0 : (() => {
    const selectedVehicle = vehicles?.find((v: any) => v.licensePlate === selectedLicensePlateFilter);
    if (!selectedVehicle) return 0;
    
    return emiPayments
      .filter((payment: any) => payment.vehicleId === selectedVehicle.id)
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  })();

  // Calculate filtered salary payments
  const filteredSalaryPayments = salaryData?.reduce((sum: number, salary: any) => {
    if (!salary.amount) return sum;
    const paymentDate = new Date(salary.paymentDate || salary.createdAt);
    const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (selectedMonthFilter !== "all" && paymentMonth !== selectedMonthFilter) {
      return sum;
    }
    
    return sum + parseFloat(salary.amount);
  }, 0) || 0;

  // Calculate salary adjustments (subtract payments, add debts)
  const salaryPaymentsFromBreakdownTotal = salaryData.filter((payment: any) => payment.amount > 0).reduce((sum: number, payment: any) => sum + parseFloat(payment.amount), 0);
  const salaryDebtsFromBreakdownTotal = salaryData.filter((payment: any) => payment.amount < 0).reduce((sum: number, payment: any) => sum + Math.abs(parseFloat(payment.amount)), 0);
  const salaryAdjustment = -salaryPaymentsFromBreakdownTotal + salaryDebtsFromBreakdownTotal;

  // Calculate net profit including all components
  const filteredNetProfit = filteredRevenue - filteredExpensesTotal - filteredEmiPayments + salaryAdjustment;

  // Use filtered or total stats based on filter selection (both license plate and month)
  const isFilterApplied = selectedLicensePlateFilter !== "all" || selectedMonthFilter !== "all";
  // Backend financialStats.revenue already includes all revenue sources: journey + security + HYD Inward + Top Up
  const totalRevenue = isFilterApplied ? filteredRevenue : parseFloat(financialStats?.revenue?.toString() || "0") || 0;
  
  // Calculate total expenses using the filtered journeys' totalExpenses field
  const totalExpenses = isFilterApplied 
    ? filteredJourneys.reduce((sum: number, journey: any) => {
        return sum + parseFloat(journey.totalExpenses || 0);
      }, 0)
    : parseFloat(financialStats?.expenses?.toString() || "0") || 0;
  // Calculate net profit as total revenue - total expenses
  const netProfit = totalRevenue - totalExpenses;
  
  // Calculate breakdown from filtered data
  const filteredJourneyRevenue = filteredJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.pouch || 0), 0);
  const filteredSecurityDeposits = filteredJourneys.reduce((sum: number, journey: any) => sum + parseFloat(journey.security || 0), 0);
  const filteredHydInwardRevenue = filteredExpenses.filter((exp: any) => 
    exp.category === 'hyd_inward' && filteredJourneyIds.has(exp.journeyId)
  ).reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
  const filteredTopUpRevenue = filteredExpenses.filter((exp: any) => 
    exp.category === 'top_up' && filteredJourneyIds.has(exp.journeyId)
  ).reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);

  // Use filtered or total breakdown based on filter selection (both license plate and month)
  const breakdown = financialStats?.breakdown || {};
  const journeyRevenue = isFilterApplied ? filteredJourneyRevenue : parseFloat(breakdown.journeyRevenue?.toString() || "0") || 0;
  const securityDeposits = isFilterApplied ? filteredSecurityDeposits : parseFloat(breakdown.securityDeposits?.toString() || "0") || 0;
  const hydInwardRevenue = isFilterApplied ? filteredHydInwardRevenue : parseFloat(breakdown.hydInwardRevenue?.toString() || "0") || 0;
  const topUpRevenue = isFilterApplied ? filteredTopUpRevenue : parseFloat(breakdown.topUpRevenue?.toString() || "0") || 0;
  const totalJourneyExpenses = isFilterApplied 
    ? filteredJourneys.reduce((sum: number, journey: any) => {
        return sum + parseFloat(journey.totalExpenses || 0);
      }, 0)
    : parseFloat(breakdown.journeyExpenses?.toString() || "0") || 0;
  const salaryPaymentsFromBreakdown = parseFloat(breakdown.salaryPaymentsFromBreakdown?.toString() || "0") || 0; // Salaries are not vehicle-specific
  const salaryDebtsFromBreakdown = parseFloat(breakdown.salaryDebtsFromBreakdown?.toString() || "0") || 0; // Salary debts are not vehicle-specific
  const emiPaymentTotal = isFilterApplied ? filteredEmiPayments : parseFloat(breakdown.emiPayments?.toString() || "0") || 0;
  const tollExpenses = parseFloat(breakdown.tollExpenses?.toString() || "0") || 0; // Toll expenses are not vehicle-specific

  // Prepare chart data
  const revenueChartData = [
    { name: 'Journey Revenue', value: journeyRevenue, color: '#10b981' },
    { name: 'Security Deposits', value: securityDeposits, color: '#3b82f6' },
    { name: 'HYD Inward', value: hydInwardRevenue, color: '#8b5cf6' },
    { name: 'Top-ups', value: topUpRevenue, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  // Calculate individual expense type totals from filtered expenses
  const expenseTypeBreakdown = filteredExpenses?.reduce((acc: any, expense: any) => {
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
    hyd_unloading: '#ea580c',
    nzb_unloading: '#9333ea',
    food: '#d97706',
    maintenance: '#ca8a04',
    mechanical: '#eab308',
    electrical: '#2563eb',
    rto: '#84cc16',
    rope: '#65a30d',
    weighment: '#16a34a',
    body_works: '#059669',
    tires_air: '#0891b2',
    adblue: '#0284c7',
    tire_change: '#4f46e5',
    tire_grease: '#7c3aed',
    tire_greasing: '#7c3aed',
    fines: '#dc2626',
    driver_fees: '#f59e0b',
    miscellaneous: '#c2410c',
    other: '#991b1b'
  };

  // Convert to chart data format
  const expenseBreakdownData = Object.entries(expenseTypeBreakdown).map(([category, amount]: [string, any]) => ({
    name: category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    value: amount,
    color: expenseColors[category as keyof typeof expenseColors] || '#6b7280'
  })).filter(item => item.value > 0);

  // Add salary payments and EMI payments as separate categories
  const expenseChartData = [
    ...expenseBreakdownData,
    ...(salaryPaymentsFromBreakdown > 0 ? [{ name: 'Salary Payments', value: salaryPaymentsFromBreakdown, color: '#374151' }] : []),
    ...(emiPaymentTotal > 0 ? [{ name: 'EMI Payments', value: emiPaymentTotal, color: '#1f2937' }] : [])
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <div className="mt-2 flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="licensePlateFilter" className="text-sm font-medium text-gray-700 mr-3">Filter by License Plate:</label>
              <select
                id="licensePlateFilter"
                value={selectedLicensePlateFilter}
                onChange={(e) => setSelectedLicensePlateFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Vehicles</option>
                {journeys && journeys.map((j: any) => j.licensePlate).filter((plate: string, index: number, arr: string[]) => 
                  plate && arr.indexOf(plate) === index
                ).map((plate: string) => (
                  <option key={plate} value={plate}>
                    {plate}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="monthFilter" className="text-sm font-medium text-gray-700 mr-3">Filter by Month:</label>
              <select
                id="monthFilter"
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Months</option>
                {(() => {
                  const months = new Set<string>();
                  journeys?.forEach((journey: any) => {
                    if (journey.startTime) {
                      const date = new Date(journey.startTime);
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      months.add(monthKey);
                    }
                  });
                  return Array.from(months).sort().reverse().map((monthKey) => {
                    const [year, month] = monthKey.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    });
                    return (
                      <option key={monthKey} value={monthKey}>{monthName}</option>
                    );
                  });
                })()}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
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
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center space-x-2 mb-3">
                  <DollarSign className="w-6 h-6" />
                  <span className="text-lg font-semibold">Total Revenue</span>
                </div>
                <div className="text-3xl font-bold mb-3">₹{totalRevenue.toLocaleString()}</div>
                <div className="text-sm opacity-90 space-y-1">
                  <div className="flex justify-between">
                    <span>Journey:</span>
                    <span>₹{journeyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HYD Inward:</span>
                    <span>₹{hydInwardRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security:</span>
                    <span>₹{securityDeposits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top Up:</span>
                    <span>₹{topUpRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingDown className="w-6 h-6" />
                  <span className="text-lg font-semibold">Total Expenses</span>
                </div>
                <div className="text-3xl font-bold mb-3">₹{totalExpenses.toLocaleString()}</div>
                <div className="text-sm opacity-90 space-y-1">
                  <div className="flex justify-between">
                    <span>Journey Expenses:</span>
                    <span>₹{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salary Payments:</span>
                    <span>₹{salaryPaymentsFromBreakdown.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EMI Payments:</span>
                    <span>₹{emiPaymentTotal.toLocaleString()}</span>
                  </div>
                  {salaryDebtsFromBreakdown > 0 && (
                    <div className="flex justify-between text-green-200">
                      <span>Salary Debts (deducted):</span>
                      <span>-₹{salaryDebtsFromBreakdown.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Card */}
        <Card className={`${netProfit >= 0 ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-red-600 to-red-700'} text-white shadow-lg border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center space-x-2 mb-3">
                  {netProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  <span className="text-lg font-semibold">Net Profit</span>
                </div>
                <div className="text-3xl font-bold mb-3">
                  {netProfit >= 0 ? '₹' : '-₹'}{Math.abs(netProfit).toLocaleString()}
                </div>
                <div className="text-sm opacity-90 space-y-1">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span>₹{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Costs:</span>
                    <span>₹{totalExpenses.toLocaleString()}</span>
                  </div>
                  
                  {salaryDebtsFromBreakdown > 0 && (
                    <div className="flex justify-between text-green-200">
                      <span>Salary Debts:</span>
                      <span>+₹{salaryDebtsFromBreakdown.toLocaleString()}</span>
                    </div>
                  )}
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
          <div className="w-full">
            {/* Journey-wise Expense Breakdown */}
            <Card className="w-full">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Journey-wise Expenses</h3>
                <p className="text-sm text-gray-500 mb-6">Expenses organized by journey</p>
                
                <div className="h-96 overflow-y-auto space-y-4 pr-2">
                  {filteredJourneys?.map((journey: any) => (
                    <JourneyExpenseItem 
                      key={journey.id} 
                      journey={journey} 
                      userRole={user?.role}
                    />
                  ))}
                  
                  {(!filteredJourneys || filteredJourneys.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {selectedLicensePlateFilter === "all" 
                          ? "No journeys found" 
                          : `No journeys found for license plate: ${selectedLicensePlateFilter}`
                        }
                      </p>
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

      {/* Export Dialog with Date Filter */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Financial Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Start Date (Optional)
              </label>
              <Input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                End Date (Optional)
              </label>
              <Input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-500">
              Leave dates empty to export all data. Date range filters journeys and expenses.
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleExportToExcel(exportStartDate, exportEndDate);
                  setShowExportDialog(false);
                  setExportStartDate("");
                  setExportEndDate("");
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reset Financial Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This action will permanently delete all financial data including journeys, expenses, and salary payments. This cannot be undone.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Type "RESET FINANCIAL DATA" to confirm:
              </label>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="RESET FINANCIAL DATA"
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetDialog(false);
                  setConfirmationText("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetConfirm}
                variant="destructive"
              >
                Reset Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}