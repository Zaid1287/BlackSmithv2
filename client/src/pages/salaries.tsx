import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function Salaries() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const payMutation = useMutation({
    mutationFn: async ({ userId, amount, description, transactionType }: { 
      userId: number; 
      amount: string; 
      description?: string;
      transactionType: string;
    }) => {
      const currentDate = new Date();
      const response = await apiRequest("POST", "/api/salaries/pay", {
        userId,
        amount,
        description,
        transactionType,
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentDate.getFullYear(),
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      const amount = parseFloat(variables.amount);
      const isPayment = amount > 0;
      toast({
        title: isPayment ? "Payment Successful" : "Debt Recorded",
        description: isPayment 
          ? `Payment of ₹${Math.abs(amount)} has been processed and deducted from net profit.`
          : `Debt of ₹${Math.abs(amount)} has been recorded and added to net profit.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
    },
    onError: (error: any) => {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to process transaction",
        variant: "destructive",
      });
    },
  });

  const handleCustomPayment = (userId: number, userName: string) => {
    const amount = prompt(`Enter amount for ${userName}:\n\nPositive amount = Payment (deducted from profit)\nNegative amount = Debt (added to profit)\n\nExample: 5000 or -2000`);
    if (amount === null) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    const description = prompt("Enter description (optional):") || "";
    const isPayment = numAmount > 0;
    const transactionType = isPayment ? "payment" : "debt";
    
    const confirmMessage = isPayment 
      ? `Pay ₹${Math.abs(numAmount)} to ${userName}?\n\nThis will be deducted from net profit.`
      : `Record debt of ₹${Math.abs(numAmount)} from ${userName}?\n\nThis will be added to net profit.`;
    
    if (confirm(confirmMessage)) {
      payMutation.mutate({ 
        userId, 
        amount: amount,
        description,
        transactionType
      });
    }
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
  const netSalaryImpact = totalPaymentsToDrivers - totalDebtsFromDrivers; // Net impact on profit

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
                  <h3 className="text-sm font-medium opacity-90">Payments Made</h3>
                </div>
                <p className="text-3xl font-bold">₹{totalPaymentsToDrivers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-orange text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <Clock className="mr-2" size={20} />
                  <h3 className="text-sm font-medium opacity-90">Debts Received</h3>
                </div>
                <p className="text-3xl font-bold">₹{totalDebtsFromDrivers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Section */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Employees</h2>
        </div>

        <CardContent className="p-6">
          {drivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No drivers found. Add drivers to manage their salaries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {drivers.map((driver: any) => {
                // Check if salary has been paid this month
                const currentMonth = new Date().toLocaleString('default', { month: 'long' });
                const currentYear = new Date().getFullYear();
                const isPaid = salaryPayments.some((payment: any) => 
                  payment.userId === driver.id && 
                  payment.month === currentMonth && 
                  payment.year === currentYear
                );

                return (
                  <Card key={driver.id} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <p className="text-sm text-gray-500">{driver.username}</p>
                        </div>
                        <Badge variant={isPaid ? "default" : "secondary"}>
                          {isPaid ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Salary:</span>
                          <span className="text-sm font-medium">₹{parseFloat(driver.salary || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`text-sm font-medium ${isPaid ? 'profit-green' : 'text-orange-600'}`}>
                            {isPaid ? 'Paid this month' : 'Pending payment'}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleCustomPayment(driver.id, driver.name)}
                        className="w-full bg-gray-900 hover:bg-gray-800"
                        disabled={payMutation.isPending}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {payMutation.isPending ? "Processing..." : "Payment / Debt"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
